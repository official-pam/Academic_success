-- RLS and permission tests. Run with: npm run test:db  (needs a local Postgres; see tests/db/run.sh)
-- Each check raises an exception on failure, so the script stops at the first broken rule.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create schema if not exists t;
create or replace function t.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false)
$$;
create or replace function t.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;
-- Runs a statement as the current role and reports whether it was refused.
create or replace function t.refused(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;
grant usage on schema t to authenticated, anon;
grant execute on all functions in schema t to authenticated, anon;

-- Fixtures (as superuser, like the SQL editor / service role)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'chair@test.ng',  '{"full_name":"Chair Person"}'),
  ('00000000-0000-0000-0000-000000000002', 'coord@test.ng',  '{"full_name":"Coord TwoHundred"}'),
  ('00000000-0000-0000-0000-000000000003', 'amaka@test.ng',  '{"full_name":"Amaka 200L"}'),
  ('00000000-0000-0000-0000-000000000004', 'bayo@test.ng',   '{"full_name":"Bayo 300L"}')
on conflict do nothing;
update public.profiles set role = 'chairman', level = 400, department = 'Physics', onboarded_at = now() where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role = 'coordinator', coordinator_level = 200, level = 200, department = 'Chemistry', onboarded_at = now() where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set level = 200, department = 'Chemistry', onboarded_at = now() where id = '00000000-0000-0000-0000-000000000003';
update public.profiles set level = 300, department = 'Civil Engineering', onboarded_at = now() where id = '00000000-0000-0000-0000-000000000004';

set role authenticated;

-- Member A ------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-000000000003');
insert into public.checkins (id, day, note) values (gen_random_uuid(), public.lagos_today(), 'private note A');
select public.set_goal('Read 2 chapters', 5::smallint, 45::smallint);
insert into public.study_sessions (title, starts_on) values ('Organic chemistry', public.lagos_today());
select t.ok(t.refused($$insert into public.checkins (id, day) values (gen_random_uuid(), public.lagos_today())$$), 'second check-in on the same day is refused');
select t.ok(t.refused($$insert into public.checkins (id, day) values (gen_random_uuid(), public.lagos_today() + 1)$$), 'future check-in is refused');
select t.ok(t.refused($$insert into public.checkins (id, day) values (gen_random_uuid(), public.lagos_today() - 30)$$), 'check-in 30 days late is refused');
select t.ok(t.refused($$update public.profiles set role = 'chairman' where id = auth.uid()$$), 'member cannot promote themself');
select t.ok(t.refused($$insert into public.assignments (title, due_at, level, status) values ('Hack', now() + interval '1 day', 200, 'published')$$), 'member cannot publish an assignment');
select t.ok(t.refused($$select * from public.participation_by_level(public.lagos_today() - 7, public.lagos_today())$$), 'member cannot read participation');
select public.set_goal('Read 3 chapters', 6::smallint, null);
select t.ok((select count(*) = 2 from public.goals), 'revising a goal keeps the old one');
select t.ok((select count(*) = 1 from public.goals where active), 'only one active goal');

-- Member B ------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-000000000004');
select t.ok((select count(*) = 0 from public.checkins), 'member B sees none of A''s check-ins');
select t.ok((select count(*) = 0 from public.goals), 'member B sees none of A''s goals');
select t.ok((select count(*) = 0 from public.study_sessions), 'member B sees none of A''s sessions');
select t.ok((select count(*) = 1 from public.profiles), 'member B reads only their own profile');
update public.checkins set note = 'tampered' where true;
delete from public.checkins where true;
reset role;
select t.ok((select note = 'private note A' from public.checkins limit 1), 'member B could not edit or delete A''s check-in');
set role authenticated;

-- Coordinator (200L) --------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-000000000002');
select t.ok((select count(*) = 0 from public.checkins), 'coordinator cannot read raw check-ins or notes');
select t.ok((select bool_and(level = 200) and count(*) = 2 from public.profiles), 'coordinator reads profiles of their own level only');
insert into public.assignments (title, due_at, level, status, instructions)
  values ('Chem tutorial reading', now() + interval '3 days', 200, 'published', 'Read chapter 4');
insert into public.assignments (title, due_at, level, status)
  values ('Draft for 200L', now() + interval '3 days', 200, 'draft');
select t.ok(t.refused($$insert into public.assignments (title, due_at, level, status) values ('300L work', now() + interval '1 day', 300, 'published')$$), 'coordinator cannot publish to another level');
select t.ok(t.refused($$insert into public.assignments (title, due_at, level, status) values ('Everyone', now() + interval '1 day', null, 'published')$$), 'coordinator cannot publish to all levels');
select t.ok(t.refused($$insert into public.assignments (title, due_at, level) values ('Past', now() - interval '1 day', 200)$$), 'deadline in the past is refused');
select t.ok(t.refused($$update public.profiles set role = 'coordinator', coordinator_level = 300 where id = '00000000-0000-0000-0000-000000000004'$$) or true, 'coordinator role change attempt runs');
select t.ok((select count(*) = 1 from public.participation_by_level(public.lagos_today() - 6, public.lagos_today())), 'coordinator sees participation for one level');
select t.ok((select active_members = 1 and checkins = 1 from public.participation_by_level(public.lagos_today() - 6, public.lagos_today())), 'participation counts A''s check-in');
update public.assignments set status = 'archived' where title = 'Chem tutorial reading';
update public.assignments set status = 'published' where title = 'Chem tutorial reading';
select t.ok((select count(*) >= 3 from public.assignment_audit), 'assignment changes are audited');
insert into public.prayer_points (week_of, points, status)
  values (public.lagos_today() - (extract(isodow from public.lagos_today())::int - 1), array['For focus in study','For our exams'], 'published');

-- Member visibility of committee content -----------------------------------
select t.act_as('00000000-0000-0000-0000-000000000003');
select t.ok((select count(*) = 1 from public.assignments), 'A sees the published 200L assignment only (not the draft)');
select t.ok((select count(*) = 1 from public.prayer_points), 'A sees published prayer points');
select t.ok((select count(*) = 2 from public.my_support_contacts()), 'A sees their coordinator and the chairman as contacts');
select t.ok(t.refused($$update public.assignments set title = 'changed' where true$$) or (select count(*) = 0 from public.assignments where title = 'changed'), 'member cannot edit assignments');
select t.ok(t.refused($$delete from public.assignments$$), 'member cannot delete assignments');
select t.act_as('00000000-0000-0000-0000-000000000004');
select t.ok((select count(*) = 0 from public.assignments), 'B (300L) does not see 200L assignment');

-- Coordinator cannot change roles -------------------------------------------
select t.act_as('00000000-0000-0000-0000-000000000002');
reset role;
select t.ok((select role = 'member' from public.profiles where id = '00000000-0000-0000-0000-000000000004'), 'coordinator could not promote B');
set role authenticated;

-- Chairman ------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-000000000001');
select t.ok((select count(*) = 4 from public.profiles), 'chairman reads all profiles');
select t.ok((select count(*) = 0 from public.checkins), 'chairman cannot read raw check-ins or notes');
select t.ok((select count(*) = 5 from public.participation_by_level(public.lagos_today() - 6, public.lagos_today())), 'chairman sees participation for all five levels');
select t.ok((select count(*) = 5 * 4 from public.participation_weekly(4)), 'weekly participation returns weeks x levels');
update public.profiles set role = 'coordinator', coordinator_level = 300 where id = '00000000-0000-0000-0000-000000000004';
select t.ok((select role = 'coordinator' from public.profiles where id = '00000000-0000-0000-0000-000000000004'), 'chairman can appoint a coordinator');
select t.ok(t.refused($$update public.profiles set role = 'member' where id = auth.uid()$$), 'chairman cannot demote themself');
insert into public.assignments (title, due_at, level, status) values ('All levels: exam prep', now() + interval '5 days', null, 'published');

-- Anonymous -----------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select t.ok(t.refused($$select * from public.assignments$$), 'anonymous visitors cannot read assignments');
select t.ok(t.refused($$select * from public.profiles$$), 'anonymous visitors cannot read profiles');
reset role;

-- Clean up fixtures so the suite can be re-run
delete from auth.users where email like '%@test.ng';
delete from public.prayer_points where true;
delete from public.assignments where created_by is null;
drop schema t cascade;
select 'ALL RLS TESTS PASSED' as result;
