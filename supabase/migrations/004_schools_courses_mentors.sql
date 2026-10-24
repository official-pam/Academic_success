-- 004: schools, committee heads, course enrolment, results, focus sessions and mentor access.
-- Run after 001, 002 (+ seed_courses.sql) and 003.
--
-- What changes (owner decisions, 24 Oct 2026):
--   * Roles shown as Admin (chairman), Committee head (coordinator) and Member. A committee head is scoped to a
--     school (e.g. SEET) and optionally one level. The admin sees everyone.
--   * Members pick their school and programme from the catalogue; course lists, mentors, groups and committee
--     updates are scoped by school.
--   * Members enrol in courses per semester, set a target grade and goal per course, and record results.
--   * Committee heads (mentors) and the admin can read the full study record of the members in their scope:
--     courses, targets, results, planned sessions and focus sessions. This is automatic (no opt-in) and is stated
--     on the Privacy page. Check-in notes and memorised verses stay private to the member.

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Profiles: school, programme, committee scope, prior CGPA, notifications marker
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column school_code text references public.schools (code) on update cascade,
  add column programme_id bigint references public.programmes (id) on delete set null,
  add column committee_school text references public.schools (code) on update cascade,
  add column prior_cgpa numeric(3,2) check (prior_cgpa between 0 and 5),
  add column prior_units smallint check (prior_units between 0 and 400),
  add column feed_seen_at timestamptz;

create index profiles_school_level_idx on public.profiles (school_code, level);

alter table public.profiles drop constraint if exists coordinator_has_level;
alter table public.profiles add constraint committee_head_has_scope
  check (role <> 'coordinator' or committee_school is not null or coordinator_level is not null);

-- Programme must belong to the chosen school.
create or replace function public.guard_profile_programme()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.programme_id is not null then
    if not exists (select 1 from public.programmes p where p.id = new.programme_id and p.school_code = new.school_code) then
      raise exception 'That programme is not in the chosen school' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard_programme before insert or update of school_code, programme_id on public.profiles
  for each row execute function public.guard_profile_programme();

-- Roles and committee scope: only the admin (chairman) changes them.
create or replace function public.guard_profile_roles()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.role, new.coordinator_level, new.committee_school) is distinct from (old.role, old.coordinator_level, old.committee_school) then
    if auth.uid() is not null and not public.is_chairman() then
      raise exception 'Only the admin can change roles' using errcode = '42501';
    end if;
    if auth.uid() = old.id and old.role = 'chairman' and new.role <> 'chairman' then
      raise exception 'Make someone else admin first, then ask them to change your role' using errcode = '42501';
    end if;
  end if;
  if new.role <> 'coordinator' then
    new.coordinator_level := null;
    new.committee_school := null;
  end if;
  return new;
end $$;

create or replace function public.my_school()
returns text language sql stable security definer set search_path = '' as $$
  select school_code from public.profiles where id = auth.uid()
$$;

create or replace function public.my_committee_school()
returns text language sql stable security definer set search_path = '' as $$
  select committee_school from public.profiles where id = auth.uid() and role = 'coordinator'
$$;

-- May the caller administer content aimed at (level, school)? null target = everyone.
-- Admin: always. Committee head: only inside their school (and their level, if they have one).
create or replace function public.can_admin_scope(target_level smallint, target_school text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'chairman'
           or (p.role = 'coordinator'
               and (p.committee_school is not null or p.coordinator_level is not null)
               and (p.committee_school is null or target_school = p.committee_school)
               and (p.coordinator_level is null or target_level = p.coordinator_level)))
  )
$$;

-- Kept for older callers: level-only check now delegates to the scope check.
create or replace function public.can_admin_level(target_level smallint)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_admin_scope(target_level, public.my_committee_school())
$$;

-- May the caller see this member's study record? Self, the admin, or a committee head whose scope covers them.
create or replace function public.can_see_member(member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select member = auth.uid() or exists (
    select 1 from public.profiles me, public.profiles m
    where me.id = auth.uid() and m.id = member
      and (me.role = 'chairman'
           or (me.role = 'coordinator'
               and (me.committee_school is not null or me.coordinator_level is not null)
               and (me.committee_school is null or m.school_code = me.committee_school)
               and (me.coordinator_level is null or m.level = me.coordinator_level)))
  )
$$;

drop policy if exists "profiles: coordinator reads own level" on public.profiles;
create policy "profiles: committee head reads scope" on public.profiles for select to authenticated
  using (public.can_see_member(id));

-- Support contacts: committee heads for my school (and level), plus the admin.
create or replace function public.my_support_contacts()
returns table (full_name text, role public.app_role, coordinator_level smallint)
language sql stable security definer set search_path = '' as $$
  select p.full_name, p.role, p.coordinator_level
  from public.profiles p
  where auth.uid() is not null
    and (p.role = 'chairman'
         or (p.role = 'coordinator'
             and (p.committee_school is null or p.committee_school = public.my_school())
             and (p.coordinator_level is null or p.coordinator_level = public.my_level())))
  order by p.role desc, p.full_name
$$;

-- ---------------------------------------------------------------------------
-- Content targeted by school
-- ---------------------------------------------------------------------------
alter table public.assignments add column school_code text references public.schools (code) on update cascade;
alter table public.announcements add column school_code text references public.schools (code) on update cascade;
create index assignments_school_idx on public.assignments (school_code, level) where status = 'published';
create index announcements_school_idx on public.announcements (school_code, level) where status = 'published';

drop policy "assignments: members read published" on public.assignments;
drop policy "assignments: staff read scope" on public.assignments;
drop policy "assignments: staff insert scope" on public.assignments;
drop policy "assignments: staff update scope" on public.assignments;
create policy "assignments: members read published" on public.assignments for select to authenticated
  using (status = 'published'
         and (level is null or level = public.my_level())
         and (school_code is null or school_code = public.my_school())
         and (department is null or lower(department) = lower(public.my_department())));
create policy "assignments: staff read scope" on public.assignments for select to authenticated
  using (public.can_admin_scope(level, school_code) or (public.is_staff() and created_by = auth.uid()));
create policy "assignments: staff insert scope" on public.assignments for insert to authenticated
  with check (public.can_admin_scope(level, school_code) and created_by = auth.uid());
create policy "assignments: staff update scope" on public.assignments for update to authenticated
  using (public.can_admin_scope(level, school_code)) with check (public.can_admin_scope(level, school_code));

drop policy "announcements: members read published" on public.announcements;
drop policy "announcements: staff read scope" on public.announcements;
drop policy "announcements: staff insert scope" on public.announcements;
drop policy "announcements: staff update scope" on public.announcements;
create policy "announcements: members read published" on public.announcements for select to authenticated
  using (status = 'published'
         and (level is null or level = public.my_level())
         and (school_code is null or school_code = public.my_school()));
create policy "announcements: staff read scope" on public.announcements for select to authenticated
  using (public.can_admin_scope(level, school_code) or (public.is_staff() and created_by = auth.uid()));
create policy "announcements: staff insert scope" on public.announcements for insert to authenticated
  with check (public.can_admin_scope(level, school_code) and created_by = auth.uid());
create policy "announcements: staff update scope" on public.announcements for update to authenticated
  using (public.can_admin_scope(level, school_code)) with check (public.can_admin_scope(level, school_code));

drop policy "audit: staff read scope" on public.assignment_audit;
create policy "audit: staff read scope" on public.assignment_audit for select to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and public.can_admin_scope(a.level, a.school_code)));

-- ---------------------------------------------------------------------------
-- Planned study sessions: mentors in scope can read them
-- ---------------------------------------------------------------------------
create policy "sessions: mentor reads scope" on public.study_sessions for select to authenticated
  using (public.can_see_member(user_id));

-- ---------------------------------------------------------------------------
-- Course enrolment, targets and results
-- Grade scale (NUC CCMAS, current): A 70-100 = 5, B 60-69 = 4, C 50-59 = 3, D 45-49 = 2, F 0-44 = 0.
-- E (40-44 = 1) is accepted for results recorded under the older scale. Keep in step with lib/grades.js.
-- ---------------------------------------------------------------------------
create or replace function public.grade_for_score(s numeric)
returns text language sql immutable set search_path = '' as $$
  select case when s is null then null when s >= 70 then 'A' when s >= 60 then 'B' when s >= 50 then 'C' when s >= 45 then 'D' else 'F' end
$$;

create table public.enrolments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  course_id         uuid references public.courses (id) on delete set null,
  course_code       text not null check (char_length(course_code) between 3 and 16),
  course_title      text not null check (char_length(course_title) between 2 and 200),
  credit_units      smallint not null check (credit_units between 0 and 15),
  session           text not null check (session ~ '^[0-9]{4}/[0-9]{4}$'),
  semester          smallint not null check (semester in (1, 2)),
  target_grade      text check (target_grade in ('A', 'B', 'C', 'D', 'E', 'F')),
  goal              text check (char_length(goal) <= 300),
  score             numeric(5,2) check (score between 0 and 100),
  grade             text check (grade in ('A', 'B', 'C', 'D', 'E', 'F')),
  result_entered_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, course_code, session, semester)
);
create index enrolments_user_term_idx on public.enrolments (user_id, session, semester);
create index enrolments_result_idx on public.enrolments (result_entered_at desc) where result_entered_at is not null;

create or replace function public.prepare_enrolment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  -- Catalogue courses: code, title and units come from the catalogue, not from the form.
  if new.course_id is not null and (tg_op = 'INSERT' or new.course_id is distinct from old.course_id) then
    select code, title, coalesce(credit_units, 0) as units into c
    from public.courses where id = new.course_id and verification in ('from_department_page', 'committee_verified');
    if not found then raise exception 'That course is not in the approved catalogue' using errcode = '22023'; end if;
    new.course_code := c.code; new.course_title := c.title; new.credit_units := c.units;
  end if;
  new.course_code := upper(regexp_replace(trim(new.course_code), '\s+', ' ', 'g'));
  if new.score is not null then new.grade := public.grade_for_score(new.score); end if;
  if (new.grade is not null) and (tg_op = 'INSERT' or new.grade is distinct from old.grade or new.score is distinct from old.score) then
    new.result_entered_at := now();
  end if;
  if new.grade is null then new.result_entered_at := null; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger enrolments_prepare before insert or update on public.enrolments
  for each row execute function public.prepare_enrolment();

alter table public.enrolments enable row level security;
create policy "enrolments: own write" on public.enrolments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "enrolments: mentor reads scope" on public.enrolments for select to authenticated
  using (public.can_see_member(user_id));

-- ---------------------------------------------------------------------------
-- Focus timer sessions (the id comes from the device, so an offline retry can't double count)
-- ---------------------------------------------------------------------------
create table public.focus_sessions (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  enrolment_id uuid references public.enrolments (id) on delete set null,
  label        text not null check (char_length(label) between 1 and 200),
  planned_min  smallint not null check (planned_min between 1 and 240),
  actual_min   smallint not null check (actual_min between 1 and 600),
  completed    boolean not null default false,
  started_at   timestamptz not null,
  ended_at     timestamptz not null,
  created_at   timestamptz not null default now(),
  check (ended_at > started_at)
);
create index focus_sessions_user_idx on public.focus_sessions (user_id, ended_at desc);
create index focus_sessions_ended_idx on public.focus_sessions (ended_at desc);

create or replace function public.guard_focus_session()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.ended_at > now() + interval '5 minutes' or new.started_at < now() - interval '7 days' then
    raise exception 'Focus sessions can be saved up to 7 days late, never in the future' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger focus_sessions_guard before insert on public.focus_sessions
  for each row execute function public.guard_focus_session();

alter table public.focus_sessions enable row level security;
create policy "focus: own read" on public.focus_sessions for select to authenticated using (public.can_see_member(user_id));
create policy "focus: own insert" on public.focus_sessions for insert to authenticated with check (user_id = auth.uid());
create policy "focus: own delete" on public.focus_sessions for delete to authenticated using (user_id = auth.uid());

-- Check-in days (never notes) for members in the caller's scope.
create or replace function public.member_checkin_days(p_members uuid[], p_from date)
returns table (user_id uuid, day date)
language sql stable security definer set search_path = '' as $$
  select c.user_id, c.day from public.checkins c
  where c.user_id = any (p_members) and c.day >= p_from and public.can_see_member(c.user_id)
$$;

-- ---------------------------------------------------------------------------
-- Mentor activity feed ("notifications"): finished focus sessions and new results in scope.
-- ---------------------------------------------------------------------------
create or replace function public.mentor_feed(p_before timestamptz default null, p_limit int default 30)
returns table (kind text, at timestamptz, member_id uuid, member_name text, level smallint, school_code text, title text, detail text)
language sql stable security definer set search_path = '' as $$
  with scope as (
    select m.id, m.full_name, m.level, m.school_code from public.profiles m
    where public.is_staff() and m.id <> auth.uid() and public.can_see_member(m.id)
  )
  select * from (
    select 'focus'::text, f.ended_at, s.id, s.full_name, s.level, s.school_code, f.label,
           f.actual_min || ' min' || case when f.completed then '' else ' (stopped early)' end
    from public.focus_sessions f join scope s on s.id = f.user_id
    where p_before is null or f.ended_at < p_before
    union all
    select 'result', e.result_entered_at, s.id, s.full_name, s.level, s.school_code, e.course_code || ' ' || e.course_title,
           'Grade ' || e.grade || coalesce(' (' || trim(to_char(e.score, 'FM990.##')) || ')', '') || coalesce(' · target ' || e.target_grade, '')
    from public.enrolments e join scope s on s.id = e.user_id
    where e.result_entered_at is not null and (p_before is null or e.result_entered_at < p_before)
  ) feed (kind, at, member_id, member_name, level, school_code, title, detail)
  order by at desc
  limit least(greatest(p_limit, 1), 100)
$$;

create or replace function public.mentor_feed_unread()
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.mentor_feed(null, 100) f
  where f.at > coalesce((select feed_seen_at from public.profiles where id = auth.uid()), '-infinity'::timestamptz)
$$;

create or replace function public.mark_feed_seen()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set feed_seen_at = now() where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Participation: committee heads see their school (and level); groups under 3 stay hidden.
-- ---------------------------------------------------------------------------
create or replace function public.participation_by_level(p_from date, p_to date)
returns table (level smallint, members bigint, active_members bigint, checkins bigint)
language plpgsql stable security definer set search_path = '' as $$
declare lvl smallint; sch text; admin boolean;
begin
  if not public.is_staff() then
    raise exception 'Participation is visible to the committee only' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 190 then
    raise exception 'Choose a range of up to one semester' using errcode = '22023';
  end if;
  admin := public.is_chairman();
  lvl := case when admin then null else public.my_coordinator_level() end;
  sch := case when admin then null else public.my_committee_school() end;
  return query
    select lv.level::smallint,
           count(distinct p.id),
           case when count(distinct p.id) >= 3 then count(distinct c.user_id) else null::bigint end,
           case when count(distinct p.id) >= 3 then count(c.id) else null::bigint end
    from (values (100), (200), (300), (400), (500)) as lv(level)
    left join public.profiles p on p.level = lv.level and p.onboarded_at is not null and (sch is null or p.school_code = sch)
    left join public.checkins c on c.user_id = p.id and c.day between p_from and p_to
    where lvl is null or lv.level = lvl
    group by lv.level
    order by lv.level;
end $$;

create or replace function public.participation_weekly(p_weeks int default 12)
returns table (week_start date, level smallint, members bigint, active_members bigint, checkins bigint)
language plpgsql stable security definer set search_path = '' as $$
declare lvl smallint; sch text; admin boolean; this_monday date;
begin
  if not public.is_staff() then
    raise exception 'Participation is visible to the committee only' using errcode = '42501';
  end if;
  p_weeks := least(greatest(p_weeks, 1), 26);
  admin := public.is_chairman();
  lvl := case when admin then null else public.my_coordinator_level() end;
  sch := case when admin then null else public.my_committee_school() end;
  this_monday := public.lagos_today() - (extract(isodow from public.lagos_today())::int - 1);
  return query
    with weeks as (select (this_monday - 7 * g)::date as ws from generate_series(0, p_weeks - 1) g)
    select w.ws, lv.level::smallint,
           count(distinct p.id),
           case when count(distinct p.id) >= 3 then count(distinct c.user_id) else null::bigint end,
           case when count(distinct p.id) >= 3 then count(c.id) else null::bigint end
    from weeks w
    cross join (values (100), (200), (300), (400), (500)) as lv(level)
    left join public.profiles p on p.level = lv.level and p.onboarded_at is not null and p.created_at < w.ws + 7
                                and (sch is null or p.school_code = sch)
    left join public.checkins c on c.user_id = p.id and c.day between w.ws and w.ws + 6
    where lvl is null or lv.level = lvl
    group by w.ws, lv.level
    order by w.ws desc, lv.level;
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.enrolments, public.focus_sessions from anon;
grant select, insert, update, delete on public.enrolments to authenticated;
grant select, insert, delete on public.focus_sessions to authenticated;
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
