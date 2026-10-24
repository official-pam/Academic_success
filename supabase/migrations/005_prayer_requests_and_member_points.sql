-- 005: prayer requests to the committee, and prayer points written by members.
-- Run after 004.
--
--   * Prayer requests are private: the member, their committee head (school/level scope) and the admin.
--     The committee marks a request "prayed for"; new requests appear in the committee activity feed.
--   * Member prayer points are shared with every signed-in member, shown under the committee's official
--     points (prayer_points from 001). The admin and committee heads can hide one; the author can delete theirs.

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Prayer requests (private)
-- ---------------------------------------------------------------------------
create table public.prayer_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body        text not null check (char_length(trim(body)) between 3 and 1000),
  prayed_by   uuid references public.profiles (id) on delete set null,
  prayed_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index prayer_requests_user_idx on public.prayer_requests (user_id, created_at desc);
create index prayer_requests_open_idx on public.prayer_requests (created_at desc) where prayed_at is null;

alter table public.prayer_requests enable row level security;
create policy "requests: read own and scope" on public.prayer_requests for select to authenticated
  using (user_id = auth.uid() or (public.is_staff() and public.can_see_member(user_id)));
create policy "requests: add own" on public.prayer_requests for insert to authenticated
  with check (user_id = auth.uid() and prayed_at is null and prayed_by is null);
create policy "requests: delete own" on public.prayer_requests for delete to authenticated
  using (user_id = auth.uid());

-- The committee marks (or unmarks) a request as prayed for. Only this function changes those columns.
create or replace function public.mark_prayer_request(p_id uuid, p_prayed boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  select user_id into owner from public.prayer_requests where id = p_id;
  if owner is null or not public.is_staff() or not public.can_see_member(owner) or owner = auth.uid() then
    raise exception 'Only the committee looking after this member can do that' using errcode = '42501';
  end if;
  update public.prayer_requests
    set prayed_at = case when p_prayed then now() end,
        prayed_by = case when p_prayed then auth.uid() end
    where id = p_id;
end $$;

-- Name of whoever prayed, for the member's own view (they can't read other profiles directly).
create or replace function public.my_prayer_requests()
returns table (id uuid, body text, created_at timestamptz, prayed_at timestamptz, prayed_by_name text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.body, r.created_at, r.prayed_at, p.full_name
  from public.prayer_requests r left join public.profiles p on p.id = r.prayed_by
  where r.user_id = auth.uid()
  order by r.created_at desc
  limit 50
$$;

-- ---------------------------------------------------------------------------
-- Prayer points written by members (shared)
-- ---------------------------------------------------------------------------
create table public.member_prayer_points (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  author_name text not null default '',
  body        text not null check (char_length(trim(body)) between 3 and 400),
  hidden      boolean not null default false,
  hidden_by   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index member_prayer_points_feed_idx on public.member_prayer_points (created_at desc) where not hidden;

-- Store the author's first name so other members can see who wrote it without reading their profile.
create or replace function public.stamp_prayer_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.author_name := coalesce(nullif(split_part(trim((select full_name from public.profiles where id = new.user_id)), ' ', 1), ''), 'A member');
  new.hidden := false;
  new.hidden_by := null;
  return new;
end $$;
create trigger member_prayer_points_author before insert on public.member_prayer_points
  for each row execute function public.stamp_prayer_author();

alter table public.member_prayer_points enable row level security;
create policy "member points: read visible" on public.member_prayer_points for select to authenticated
  using (not hidden or user_id = auth.uid() or public.is_staff());
create policy "member points: add own" on public.member_prayer_points for insert to authenticated
  with check (user_id = auth.uid());
create policy "member points: delete own" on public.member_prayer_points for delete to authenticated
  using (user_id = auth.uid());

-- Admin hides anything; a committee head hides posts by members in their scope.
create or replace function public.moderate_prayer_point(p_id uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare author uuid;
begin
  select user_id into author from public.member_prayer_points where id = p_id;
  if author is null or not (public.is_chairman() or (public.is_staff() and public.can_see_member(author))) then
    raise exception 'Only the admin or the member''s committee head can do that' using errcode = '42501';
  end if;
  update public.member_prayer_points
    set hidden = p_hidden, hidden_by = case when p_hidden then auth.uid() end
    where id = p_id;
end $$;

-- ---------------------------------------------------------------------------
-- Activity feed: add new prayer requests (committee only, scoped like the rest)
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
    union all
    select 'prayer', r.created_at, s.id, s.full_name, s.level, s.school_code, 'a prayer request',
           case when r.prayed_at is null then 'Not prayed for yet' else 'Prayed for' end
    from public.prayer_requests r join scope s on s.id = r.user_id
    where p_before is null or r.created_at < p_before
  ) feed (kind, at, member_id, member_name, level, school_code, title, detail)
  order by at desc
  limit least(greatest(p_limit, 1), 100)
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.prayer_requests, public.member_prayer_points from anon;
grant select, insert, delete on public.prayer_requests, public.member_prayer_points to authenticated;
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
