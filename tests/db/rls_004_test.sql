-- Tests for 004: school scope, committee heads, enrolments/results, focus sessions, mentor feed.
-- Run after supabase_stub + 001..004 (tests/db/run.sh does this). Stops at the first failure.
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

-- Fixtures: admin, SEET head (all levels), SICT 200L head, members in SEET 300L, SICT 200L, SICT 300L.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin4@test.ng', '{"full_name":"Ada Admin"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'seethead@test.ng', '{"full_name":"Seun SEET Head"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'sicthead@test.ng', '{"full_name":"Sola SICT Head"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'ama@test.ng', '{"full_name":"Ama EEE 300"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'bola@test.ng', '{"full_name":"Bola CPT 200"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'dayo@test.ng', '{"full_name":"Dayo CPT 300"}')
on conflict do nothing;
update public.profiles p set level = v.level, school_code = v.school,
  programme_id = (select id from public.programmes where school_code = v.school and name = v.prog),
  department = v.prog, onboarded_at = now()
from (values
  ('00000000-0000-0000-0000-0000000000a1'::uuid, 400, 'SEET', 'Electrical and Electronics Engineering'),
  ('00000000-0000-0000-0000-0000000000b1'::uuid, 400, 'SEET', 'Electrical and Electronics Engineering'),
  ('00000000-0000-0000-0000-0000000000b2'::uuid, 400, 'SICT', 'Computer Science'),
  ('00000000-0000-0000-0000-0000000000c1'::uuid, 300, 'SEET', 'Electrical and Electronics Engineering'),
  ('00000000-0000-0000-0000-0000000000c2'::uuid, 200, 'SICT', 'Computer Science'),
  ('00000000-0000-0000-0000-0000000000c3'::uuid, 300, 'SICT', 'Computer Science')
) v(id, level, school, prog) where p.id = v.id;
update public.profiles set role = 'chairman' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'coordinator', committee_school = 'SEET' where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set role = 'coordinator', committee_school = 'SICT', coordinator_level = 200 where id = '00000000-0000-0000-0000-0000000000b2';

select t.ok((select programme_id is not null from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'fixtures: programmes resolved from the catalogue');

set role authenticated;

-- Member Ama (SEET 300L) ------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000000c1');
select t.ok(t.refused($$update public.profiles set programme_id = (select id from public.programmes where school_code = 'SICT' limit 1) where id = auth.uid()$$), 'programme must belong to the member''s school');
select t.ok(t.refused($$update public.profiles set committee_school = 'SEET' where id = auth.uid()$$), 'member cannot give themself a committee scope');
select t.ok(t.refused($$update public.profiles set role = 'coordinator', committee_school = 'SEET' where id = auth.uid()$$), 'member cannot make themself a committee head');
insert into public.enrolments (course_id, course_code, course_title, credit_units, session, semester, target_grade, goal)
  select c.id, 'FAKE 999', 'Made up title', 15, '2026/2027', 1, 'A', 'Attend every tutorial'
  from public.courses c join public.programmes p on p.id = c.programme_id
  where p.name = 'Electrical and Electronics Engineering' and c.level = 300 and c.semester = 1 order by c.code limit 1;
select t.ok((select course_code <> 'FAKE 999' and course_title <> 'Made up title' and credit_units <> 15 from public.enrolments limit 1), 'catalogue enrolment takes code, title and units from the catalogue');
insert into public.enrolments (course_code, course_title, credit_units, session, semester) values ('gst 311', 'Entrepreneurship', 2, '2026/2027', 1);
select t.ok((select count(*) = 1 from public.enrolments where course_code = 'GST 311'), 'custom course is allowed and its code normalised');
select t.ok(t.refused($$insert into public.enrolments (course_code, course_title, credit_units, session, semester) values ('GST 311', 'Again', 2, '2026/2027', 1)$$), 'the same course cannot be enrolled twice in one semester');
update public.enrolments set score = 64 where course_code = 'GST 311';
select t.ok((select grade = 'B' and result_entered_at is not null from public.enrolments where course_code = 'GST 311'), 'score 64 becomes grade B and stamps the result time');
update public.enrolments set score = 44 where course_code = 'GST 311';
select t.ok((select grade = 'F' from public.enrolments where course_code = 'GST 311'), 'score 44 is F on the current scale');
update public.enrolments set score = null, grade = 'E' where course_code = 'GST 311';
select t.ok((select grade = 'E' from public.enrolments where course_code = 'GST 311'), 'an older-scale E grade can be recorded directly');
select t.ok(t.refused($$insert into public.enrolments (course_id, course_code, course_title, credit_units, session, semester) values (gen_random_uuid(), 'X 101', 'x', 1, '2026/2027', 1)$$), 'unknown catalogue course is refused');
insert into public.focus_sessions (id, label, planned_min, actual_min, completed, started_at, ended_at)
  values (gen_random_uuid(), 'EEE 301', 45, 45, true, now() - interval '46 minutes', now() - interval '1 minute');
select t.ok(t.refused($$insert into public.focus_sessions (id, label, planned_min, actual_min, started_at, ended_at) values (gen_random_uuid(), 'x', 25, 25, now() + interval '1 hour', now() + interval '2 hours')$$), 'future focus session is refused');
insert into public.checkins (id, day, note) values (gen_random_uuid(), public.lagos_today(), 'private: struggled today');
insert into public.study_sessions (title, starts_on) values ('EEE 301 revision', public.lagos_today());
select t.ok((select count(*) = 0 from public.mentor_feed()), 'members get no mentor feed');

-- Member Bola (SICT 200L) ------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000000c2');
insert into public.enrolments (course_code, course_title, credit_units, session, semester, score) values ('CPT 211', 'Data Structures', 3, '2026/2027', 1, 72);
select t.ok((select count(*) = 1 from public.enrolments), 'Bola sees only her own enrolments');
select t.ok((select count(*) = 0 from public.focus_sessions), 'Bola cannot see Ama''s focus sessions');
select t.ok((select count(*) = 1 from public.profiles), 'Bola reads only her own profile');

-- SEET head --------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000000b1');
select t.ok((select count(*) = 2 from public.enrolments), 'SEET head sees Ama''s enrolments (results and targets)');
select t.ok((select count(*) = 1 from public.focus_sessions), 'SEET head sees Ama''s focus sessions');
select t.ok((select count(*) = 1 from public.study_sessions), 'SEET head sees Ama''s planned sessions');
select t.ok((select count(*) = 0 from public.checkins), 'SEET head cannot read check-ins or their notes');
select t.ok((select count(*) = 1 from public.member_checkin_days(array['00000000-0000-0000-0000-0000000000c1'::uuid, '00000000-0000-0000-0000-0000000000c2'::uuid], public.lagos_today() - 7)), 'SEET head gets Ama''s check-in days only (no notes, not Bola)');
select t.ok((select bool_and(school_code = 'SEET') from public.profiles), 'SEET head reads SEET profiles only');
select t.ok((select count(*) = 2 and bool_and(member_name = 'Ama EEE 300') from public.mentor_feed()), 'SEET head''s feed has Ama''s focus session and result');
select t.ok((select public.mentor_feed_unread() = 2), 'two unread feed items');
select public.mark_feed_seen();
select t.ok((select public.mentor_feed_unread() = 0), 'marking the feed seen clears the badge');
insert into public.assignments (title, due_at, level, school_code, status) values ('SEET all levels: lab prep', now() + interval '3 days', null, 'SEET', 'published');
select t.ok(t.refused($$insert into public.assignments (title, due_at, school_code, status) values ('SICT work', now() + interval '1 day', 'SICT', 'published')$$), 'SEET head cannot publish to SICT');
select t.ok(t.refused($$insert into public.assignments (title, due_at, status) values ('Everyone', now() + interval '1 day', 'published')$$), 'SEET head cannot publish to all schools');
insert into public.announcements (title, body, school_code, status) values ('SEET study group', 'Saturday 4pm', 'SEET', 'published');
select t.ok(t.refused($$update public.profiles set role = 'coordinator', committee_school = 'SEET' where id = '00000000-0000-0000-0000-0000000000c1'$$) or (select role = 'member' from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'committee head cannot change roles');
select t.ok((select count(*) = 5 from public.participation_by_level(public.lagos_today() - 6, public.lagos_today())), 'SEET head participation covers SEET at every level');

-- SICT 200L head ------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000000b2');
select t.ok((select count(*) = 1 from public.enrolments), 'SICT 200L head sees Bola only');
select t.ok((select count(*) = 1 and bool_and(member_name = 'Bola CPT 200') from public.mentor_feed()), 'SICT 200L head''s feed has Bola''s result only');
select t.ok((select count(*) = 0 from public.profiles where id = '00000000-0000-0000-0000-0000000000c3'), 'SICT 200L head cannot see a 300L SICT member');
select t.ok(t.refused($$insert into public.assignments (title, due_at, level, school_code, status) values ('300L', now() + interval '1 day', 300, 'SICT', 'published')$$), 'SICT 200L head cannot publish to 300L');
insert into public.assignments (title, due_at, level, school_code, status) values ('SICT 200L reading', now() + interval '2 days', 200, 'SICT', 'published');

-- Members see school-targeted content --------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000000c1');
select t.ok((select count(*) = 1 and bool_and(school_code = 'SEET') from public.assignments), 'Ama (SEET) sees the SEET assignment only');
select t.ok((select count(*) = 1 from public.announcements where title = 'SEET study group'), 'Ama sees the SEET announcement');
select t.ok((select count(*) = 1 from public.my_support_contacts() where role = 'coordinator'), 'Ama''s support contact is the SEET head');
select t.act_as('00000000-0000-0000-0000-0000000000c2');
select t.ok((select count(*) = 1 and bool_and(title = 'SICT 200L reading') from public.assignments), 'Bola (SICT 200L) sees only her assignment');
select t.ok((select count(*) = 0 from public.announcements where title = 'SEET study group'), 'Bola does not see the SEET announcement');

-- Admin -----------------------------------------------------------------------------
select t.act_as('00000000-0000-0000-0000-0000000000a1');
select t.ok((select count(*) = 3 from public.enrolments), 'admin sees everyone''s enrolments');
select t.ok((select count(*) = 3 from public.mentor_feed()), 'admin feed covers all schools');
update public.profiles set role = 'coordinator', committee_school = 'SICT', coordinator_level = 300 where id = '00000000-0000-0000-0000-0000000000c3';
select t.ok((select role = 'coordinator' and committee_school = 'SICT' from public.profiles where id = '00000000-0000-0000-0000-0000000000c3'), 'admin can make anyone a committee head for a school');
update public.profiles set role = 'chairman' where id = '00000000-0000-0000-0000-0000000000c3';
select t.ok((select role = 'chairman' and committee_school is null from public.profiles where id = '00000000-0000-0000-0000-0000000000c3'), 'admin can make someone else admin (scope cleared)');
update public.profiles set full_name = 'Ada A. Admin', level = 500 where id = auth.uid();
select t.ok((select full_name = 'Ada A. Admin' from public.profiles where id = auth.uid()), 'admin can update their own profile');
select t.ok(t.refused($$update public.profiles set role = 'member' where id = auth.uid()$$), 'admin cannot demote themself');

reset role;
delete from auth.users where email like '%@test.ng';
delete from public.assignments where created_by is null;
delete from public.announcements where created_by is null;
drop schema t cascade;
select 'ALL 004 TESTS PASSED' as result;
