-- Apply only after 001_init exists. Function replacements preserve grants and RLS.
begin;
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
           case when count(distinct p.id) >= 3 then count(distinct c.user_id) else null::bigint end,
           case when count(distinct p.id) >= 3 then count(c.id) else null::bigint end
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
           count(distinct p.id),
           case when count(distinct p.id) >= 3 then count(distinct c.user_id) else null::bigint end,
           case when count(distinct p.id) >= 3 then count(c.id) else null::bigint end
    from weeks w
    cross join (values (100), (200), (300), (400), (500)) as lv(level)
    left join public.profiles p on p.level = lv.level and p.onboarded_at is not null and p.created_at < w.ws + 7
    left join public.checkins c on c.user_id = p.id and c.day between w.ws and w.ws + 6
    where scope is null or lv.level = scope
    group by w.ws, lv.level
    order by w.ws desc, lv.level;
end $$;


commit;
