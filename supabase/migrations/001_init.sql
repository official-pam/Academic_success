-- TLV Season of Restored Glory: Academic Committee app
-- 001_init: schema, row-level security, helper functions.
--
-- Privacy model (spec §9):
--   * members see only their own goals, sessions and check-ins (notes included)
--   * coordinators administer content for their own level and see aggregate participation for it
--   * the chairman administers everything and sees aggregate participation for all levels
--   * nobody reads another member's check-ins directly; participation is exposed only through
--     security-definer functions that return counts
-- CGPA and "biggest struggle" are deliberately NOT collected (spec §2: not by default).

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Types and small helpers
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('member', 'coordinator', 'chairman');
create type public.publish_status as enum ('draft', 'published', 'archived');
create type public.session_kind as enum ('reading', 'exam');

-- "Today" for this community is the date in Lagos, whatever the server clock says.
create or replace function public.lagos_today()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Africa/Lagos')::date
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text not null default '' check (char_length(full_name) <= 80),
  level             smallint check (level in (100, 200, 300, 400, 500)),
  department        text check (char_length(department) between 2 and 80),
  role              public.app_role not null default 'member',
  coordinator_level smallint check (coordinator_level in (100, 200, 300, 400, 500)),
  onboarded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint coordinator_has_level check (role <> 'coordinator' or coordinator_level is not null)
);
create index profiles_level_idx on public.profiles (level);
create index profiles_role_idx on public.profiles (role) where role <> 'member';
create index profiles_name_idx on public.profiles (lower(full_name) text_pattern_ops);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers. SECURITY DEFINER so they can read profiles without recursing into RLS.
create or replace function public.my_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'member'::public.app_role)
$$;

create or replace function public.is_chairman()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'chairman')
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('coordinator', 'chairman'))
$$;

create or replace function public.my_coordinator_level()
returns smallint language sql stable security definer set search_path = '' as $$
  select coordinator_level from public.profiles where id = auth.uid() and role = 'coordinator'
$$;

create or replace function public.my_level()
returns smallint language sql stable security definer set search_path = '' as $$
  select level from public.profiles where id = auth.uid()
$$;

create or replace function public.my_department()
returns text language sql stable security definer set search_path = '' as $$
  select department from public.profiles where id = auth.uid()
$$;

-- Staff may administer a level-scoped record when: chairman, or coordinator of that exact level.
create or replace function public.can_admin_level(target_level smallint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'chairman' or (p.role = 'coordinator' and target_level is not null and p.coordinator_level = target_level))
  )
$$;

-- New auth user -> profile row (name comes from sign-up metadata).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(trim(new.raw_user_meta_data ->> 'full_name'), ''), 80))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only the chairman may change roles. Requests without a user (SQL editor, service role)
-- are allowed so the first chairman can be bootstrapped. A chairman cannot demote themself,
-- so the committee is never left without one by accident.
create or replace function public.guard_profile_roles()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.role, new.coordinator_level) is distinct from (old.role, old.coordinator_level) then
    if auth.uid() is not null and not public.is_chairman() then
      raise exception 'Only the chairman can change roles' using errcode = '42501';
    end if;
    if auth.uid() = old.id and old.role = 'chairman' and new.role <> 'chairman' then
      raise exception 'Hand over the chairman role from another chairman account' using errcode = '42501';
    end if;
  end if;
  if new.role <> 'coordinator' then
    new.coordinator_level := null;
  end if;
  return new;
end $$;

create trigger profiles_guard_roles before update on public.profiles
  for each row execute function public.guard_profile_roles();

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles: chairman reads all" on public.profiles for select to authenticated
  using (public.is_chairman());
create policy "profiles: coordinator reads own level" on public.profiles for select to authenticated
  using (level is not null and level = public.my_coordinator_level());
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: chairman updates any" on public.profiles for update to authenticated
  using (public.is_chairman()) with check (public.is_chairman());

-- Who to ask for help: names only, never other profile fields.
create or replace function public.my_support_contacts()
returns table (full_name text, role public.app_role, coordinator_level smallint)
language sql stable security definer set search_path = '' as $$
  select p.full_name, p.role, p.coordinator_level
  from public.profiles p
  where auth.uid() is not null
    and (p.role = 'chairman' or (p.role = 'coordinator' and p.coordinator_level = public.my_level()))
  order by p.role desc, p.full_name
$$;

-- ---------------------------------------------------------------------------
-- Goals (revised by archiving the old row, so history is never lost)
-- ---------------------------------------------------------------------------
create table public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title          text not null check (char_length(title) between 2 and 120),
  days_per_week  smallint not null check (days_per_week between 1 and 7),
  minutes_per_day smallint check (minutes_per_day between 5 and 600),
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  archived_at    timestamptz
);
create unique index goals_one_active_per_user on public.goals (user_id) where active;
create index goals_user_created_idx on public.goals (user_id, created_at desc);

alter table public.goals enable row level security;
create policy "goals: own" on public.goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.set_goal(p_title text, p_days_per_week smallint, p_minutes_per_day smallint)
returns public.goals language plpgsql security invoker set search_path = '' as $$
declare g public.goals;
begin
  update public.goals set active = false, archived_at = now()
    where user_id = auth.uid() and active;
  insert into public.goals (user_id, title, days_per_week, minutes_per_day)
    values (auth.uid(), trim(p_title), p_days_per_week, p_minutes_per_day)
    returning * into g;
  return g;
end $$;

-- ---------------------------------------------------------------------------
-- Study sessions and exams (personal calendar)
-- ---------------------------------------------------------------------------
create table public.study_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind         public.session_kind not null default 'reading',
  title        text not null check (char_length(title) between 2 and 120),
  starts_on    date not null,
  start_time   time,
  duration_min smallint check (duration_min between 5 and 600),
  done_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index study_sessions_user_day_idx on public.study_sessions (user_id, starts_on);
create trigger study_sessions_updated_at before update on public.study_sessions
  for each row execute function public.set_updated_at();

alter table public.study_sessions enable row level security;
create policy "sessions: own" on public.study_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Daily reading check-ins
-- id is generated on the device so an offline check-in can be retried safely;
-- (user_id, day) is unique so a day can never be counted twice.
-- ---------------------------------------------------------------------------
create table public.checkins (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day        date not null,
  minutes    smallint check (minutes between 1 and 600),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  constraint checkins_one_per_day unique (user_id, day)
);
create index checkins_day_idx on public.checkins (day);

-- A check-in may be for today or, when it was saved offline, up to 7 days back. Never the future.
create or replace function public.guard_checkin_day()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.day > public.lagos_today() then
    raise exception 'A check-in cannot be in the future' using errcode = '22023';
  end if;
  if new.day < public.lagos_today() - 7 then
    raise exception 'A check-in can be recorded up to 7 days late' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger checkins_guard_day before insert or update of day on public.checkins
  for each row execute function public.guard_checkin_day();

alter table public.checkins enable row level security;
create policy "checkins: read own" on public.checkins for select to authenticated using (user_id = auth.uid());
create policy "checkins: add own" on public.checkins for insert to authenticated with check (user_id = auth.uid());
create policy "checkins: edit own" on public.checkins for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "checkins: remove own" on public.checkins for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Committee content: assignments, announcements, prayer points
-- client_key makes a double-tapped "Publish" idempotent.
-- ---------------------------------------------------------------------------
create table public.assignments (
  id           uuid primary key default gen_random_uuid(),
  client_key   uuid unique,
  title        text not null check (char_length(title) between 3 and 140),
  instructions text not null default '' check (char_length(instructions) <= 4000),
  resources    text not null default '' check (char_length(resources) <= 2000),
  due_at       timestamptz not null,
  level        smallint check (level in (100, 200, 300, 400, 500)),   -- null = every level
  department   text check (char_length(department) between 2 and 80), -- null = every department
  status       public.publish_status not null default 'draft',
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);
create index assignments_feed_idx on public.assignments (status, due_at) where status = 'published';
create index assignments_level_idx on public.assignments (level, created_at desc);

create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  client_key   uuid unique,
  title        text not null check (char_length(title) between 3 and 140),
  body         text not null check (char_length(body) between 1 and 4000),
  level        smallint check (level in (100, 200, 300, 400, 500)),
  pinned       boolean not null default false,
  status       public.publish_status not null default 'draft',
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);
create index announcements_feed_idx on public.announcements (published_at desc) where status = 'published';

create table public.prayer_points (
  id           uuid primary key default gen_random_uuid(),
  client_key   uuid unique,
  week_of      date not null check (extract(isodow from week_of) = 1), -- a Monday
  points       text[] not null check (cardinality(points) between 1 and 12),
  scripture    text check (char_length(scripture) <= 200),
  status       public.publish_status not null default 'draft',
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);
create index prayer_points_feed_idx on public.prayer_points (week_of desc) where status = 'published';

create trigger assignments_updated_at before update on public.assignments for each row execute function public.set_updated_at();
create trigger announcements_updated_at before update on public.announcements for each row execute function public.set_updated_at();
create trigger prayer_points_updated_at before update on public.prayer_points for each row execute function public.set_updated_at();

-- Stamp published_at the first time something is published; validate deadlines.
create or replace function public.stamp_published()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger assignments_published before insert or update on public.assignments for each row execute function public.stamp_published();
create trigger announcements_published before insert or update on public.announcements for each row execute function public.stamp_published();
create trigger prayer_points_published before insert or update on public.prayer_points for each row execute function public.stamp_published();

create or replace function public.guard_assignment_deadline()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (tg_op = 'INSERT' or new.due_at is distinct from old.due_at) and new.due_at <= now() then
    raise exception 'The deadline must be in the future' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger assignments_deadline before insert or update on public.assignments
  for each row execute function public.guard_assignment_deadline();

-- Audit trail for assignments (spec flow C step 8).
create table public.assignment_audit (
  id            bigint generated always as identity primary key,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  actor         uuid,
  action        text not null,
  changed       jsonb not null default '{}',
  at            timestamptz not null default now()
);
create index assignment_audit_assignment_idx on public.assignment_audit (assignment_id, at desc);

create or replace function public.audit_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare diff jsonb := '{}';
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, n.value), '{}') into diff
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at', 'published_at');
    if diff = '{}' then return new; end if;
  end if;
  insert into public.assignment_audit (assignment_id, actor, action, changed)
  values (new.id, auth.uid(),
          case when tg_op = 'INSERT' then 'created'
               when new.status is distinct from old.status then new.status::text
               else 'edited' end,
          diff);
  return new;
end $$;
create trigger assignments_audit after insert or update on public.assignments
  for each row execute function public.audit_assignment();

alter table public.assignments enable row level security;
alter table public.announcements enable row level security;
alter table public.prayer_points enable row level security;
alter table public.assignment_audit enable row level security;

-- Members: published items for their level (or all levels) and department (or all departments).
create policy "assignments: members read published" on public.assignments for select to authenticated
  using (status = 'published'
         and (level is null or level = public.my_level())
         and (department is null or lower(department) = lower(public.my_department())));
create policy "assignments: staff read scope" on public.assignments for select to authenticated
  using (public.can_admin_level(level) or (public.is_staff() and created_by = auth.uid()));
create policy "assignments: staff insert scope" on public.assignments for insert to authenticated
  with check (public.can_admin_level(level) and created_by = auth.uid());
create policy "assignments: staff update scope" on public.assignments for update to authenticated
  using (public.can_admin_level(level)) with check (public.can_admin_level(level));

create policy "announcements: members read published" on public.announcements for select to authenticated
  using (status = 'published' and (level is null or level = public.my_level()));
create policy "announcements: staff read scope" on public.announcements for select to authenticated
  using (public.can_admin_level(level) or (public.is_staff() and created_by = auth.uid()));
create policy "announcements: staff insert scope" on public.announcements for insert to authenticated
  with check (public.can_admin_level(level) and created_by = auth.uid());
create policy "announcements: staff update scope" on public.announcements for update to authenticated
  using (public.can_admin_level(level)) with check (public.can_admin_level(level));

create policy "prayer: members read published" on public.prayer_points for select to authenticated
  using (status = 'published');
create policy "prayer: staff read all" on public.prayer_points for select to authenticated
  using (public.is_staff());
create policy "prayer: staff insert" on public.prayer_points for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());
create policy "prayer: author or chairman update" on public.prayer_points for update to authenticated
  using (public.is_chairman() or (public.is_staff() and created_by = auth.uid()))
  with check (public.is_chairman() or (public.is_staff() and created_by = auth.uid()));

create policy "audit: staff read scope" on public.assignment_audit for select to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and public.can_admin_level(a.level)));

-- ---------------------------------------------------------------------------
-- Participation: aggregate counts only, never individual rows or notes.
-- ---------------------------------------------------------------------------
create or replace function public.participation_by_level(p_from date, p_to date)
returns table (level smallint, members bigint, active_members bigint, checkins bigint)
language plpgsql stable security definer set search_path = '' as $$
declare scope smallint;
begin
  if not public.is_staff() then
    raise exception 'Participation is visible to the committee only' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 190 then
    raise exception 'Choose a range of up to one semester' using errcode = '22023';
  end if;
  scope := case when public.is_chairman() then null else public.my_coordinator_level() end;
  return query
    select lv.level::smallint,
           count(distinct p.id),
           count(distinct c.user_id),
           count(c.id)
    from (values (100), (200), (300), (400), (500)) as lv(level)
    left join public.profiles p on p.level = lv.level and p.onboarded_at is not null
    left join public.checkins c on c.user_id = p.id and c.day between p_from and p_to
    where scope is null or lv.level = scope
    group by lv.level
    order by lv.level;
end $$;

create or replace function public.participation_weekly(p_weeks int default 12)
returns table (week_start date, level smallint, members bigint, active_members bigint, checkins bigint)
language plpgsql stable security definer set search_path = '' as $$
declare scope smallint; this_monday date;
begin
  if not public.is_staff() then
    raise exception 'Participation is visible to the committee only' using errcode = '42501';
  end if;
  p_weeks := least(greatest(p_weeks, 1), 26);
  scope := case when public.is_chairman() then null else public.my_coordinator_level() end;
  this_monday := public.lagos_today() - (extract(isodow from public.lagos_today())::int - 1);
  return query
    with weeks as (
      select (this_monday - 7 * g)::date as ws from generate_series(0, p_weeks - 1) g
    )
    select w.ws, lv.level::smallint,
           count(distinct p.id) filter (where p.created_at < w.ws + 7),
           count(distinct c.user_id),
           count(c.id)
    from weeks w
    cross join (values (100), (200), (300), (400), (500)) as lv(level)
    left join public.profiles p on p.level = lv.level and p.onboarded_at is not null
    left join public.checkins c on c.user_id = p.id and c.day between w.ws and w.ws + 6
    where scope is null or lv.level = scope
    group by w.ws, lv.level
    order by w.ws desc, lv.level;
end $$;

-- ---------------------------------------------------------------------------
-- Grants: nothing for anonymous visitors; RLS decides for signed-in users.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke delete on public.assignments, public.announcements, public.prayer_points, public.profiles from authenticated;
revoke insert, update, delete on public.assignment_audit from authenticated;
