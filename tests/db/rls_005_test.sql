-- Tests for 005: prayer requests (private) and member prayer points (shared, moderated).
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
create or replace function t.refused(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
grant usage on schema t to authenticated, anon;
grant execute on all functions in schema t to authenticated, anon;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000005a1', 'admin5@test.ng', '{"full_name":"Ada Admin"}'),
  ('00000000-0000-0000-0000-0000000005b1', 'head5@test.ng', '{"full_name":"Seun Head"}'),
  ('00000000-0000-0000-0000-0000000005c1', 'ama5@test.ng', '{"full_name":"Ama Okafor"}'),
  ('00000000-0000-0000-0000-0000000005c2', 'bola5@test.ng', '{"full_name":"Bola Adeyemi"}')
on conflict do nothing;
update public.profiles p set level = v.level, school_code = v.school, onboarded_at = now()
from (values ('00000000-0000-0000-0000-0000000005a1'::uuid, 400, 'SEET'), ('00000000-0000-0000-0000-0000000005b1'::uuid, 400, 'SEET'),
             ('00000000-0000-0000-0000-0000000005c1'::uuid, 300, 'SEET'), ('00000000-0000-0000-0000-0000000005c2'::uuid, 200, 'SICT')) v(id, level, school)
where p.id = v.id;
update public.profiles set role = 'chairman' where id = '00000000-0000-0000-0000-0000000005a1';
update public.profiles set role = 'coordinator', committee_school = 'SEET' where id = '00000000-0000-0000-0000-0000000005b1';

set role authenticated;

-- Ama (SEET) ----------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000005c1');
insert into public.prayer_requests (body) values ('Please pray for my EEE 311 exam on Friday.');
select t.ok(t.refused($$insert into public.prayer_requests (body, prayed_at) values ('fake', now())$$), 'a member cannot mark their own request as prayed for');
select t.ok(t.refused($$select public.mark_prayer_request((select id from public.prayer_requests limit 1), true)$$), 'a member cannot use the committee''s mark function');
insert into public.member_prayer_points (body, author_name, hidden) values ('For wisdom in our exams this week.', 'Someone Else', true);
select t.ok((select author_name = 'Ama' and hidden = false from public.member_prayer_points), 'author name is stamped from the profile and a new point starts visible');
select t.ok((select count(*) = 1 from public.my_prayer_requests()), 'Ama sees her own request');

-- Bola (SICT) ---------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000005c2');
select t.ok((select count(*) = 0 from public.prayer_requests), 'Bola cannot see Ama''s prayer request');
select t.ok((select count(*) = 1 from public.member_prayer_points), 'Bola sees Ama''s shared prayer point');
select t.ok(t.refused($$select public.moderate_prayer_point((select id from public.member_prayer_points limit 1), true)$$), 'a member cannot hide someone else''s point');
delete from public.member_prayer_points where true;
reset role;
select t.ok((select count(*) = 1 from public.member_prayer_points), 'Bola could not delete Ama''s point');
set role authenticated;

-- SEET head -------------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000005b1');
select t.ok((select count(*) = 1 from public.prayer_requests), 'SEET head sees Ama''s prayer request');
select t.ok((select count(*) = 1 from public.mentor_feed() where kind = 'prayer'), 'the request appears in the SEET head''s activity feed');
select public.mark_prayer_request((select id from public.prayer_requests limit 1), true);
select t.ok((select prayed_at is not null from public.prayer_requests limit 1), 'SEET head marks it prayed for');
select t.ok(t.refused($$update public.prayer_requests set body = 'edited' where true$$) or (select body <> 'edited' from public.prayer_requests limit 1), 'the committee cannot edit a request''s words');
select public.moderate_prayer_point((select id from public.member_prayer_points limit 1), true);

-- Members no longer see the hidden point; the author still does ---------------------
select t.act_as('00000000-0000-0000-0000-0000000005c2');
select t.ok((select count(*) = 0 from public.member_prayer_points), 'hidden point disappears for other members');
select t.act_as('00000000-0000-0000-0000-0000000005c1');
select t.ok((select count(*) = 1 from public.member_prayer_points), 'the author still sees their hidden point');
select t.ok((select prayed_by_name = 'Seun Head' from public.my_prayer_requests() limit 1), 'Ama sees who prayed for her request');

-- Admin ------------------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000005a1');
select t.ok((select count(*) = 1 from public.prayer_requests), 'admin sees every prayer request');
select public.moderate_prayer_point((select id from public.member_prayer_points limit 1), false);
select t.act_as('00000000-0000-0000-0000-0000000005c2');
select t.ok((select count(*) = 1 from public.member_prayer_points), 'admin can unhide a point');

reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select t.ok(t.refused($$select * from public.member_prayer_points$$), 'anonymous visitors cannot read prayer points');
reset role;

delete from auth.users where email like '%5@test.ng';
drop schema t cascade;
select 'ALL 005 TESTS PASSED' as result;
