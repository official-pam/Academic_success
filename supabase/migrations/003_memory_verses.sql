-- 003: daily memory verses. The verse list itself is built into the app (references only);
-- this table only records which verses a member has marked as memorised. Private to the member.

create table public.memorised_verses (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  verse_ref      text not null check (verse_ref ~ '^[0-9A-Z]{3} [0-9]{1,3}:[0-9]{1,3}(-[0-9]{1,3})?$'),
  memorised_at   timestamptz not null default now(),
  primary key (user_id, verse_ref)
);

alter table public.memorised_verses enable row level security;

create policy "memorised: read own" on public.memorised_verses for select to authenticated using (user_id = auth.uid());
create policy "memorised: add own" on public.memorised_verses for insert to authenticated with check (user_id = auth.uid());
create policy "memorised: remove own" on public.memorised_verses for delete to authenticated using (user_id = auth.uid());

revoke all on public.memorised_verses from anon;
grant select, insert, delete on public.memorised_verses to authenticated;
