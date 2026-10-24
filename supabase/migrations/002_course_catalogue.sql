-- 002: FUT Minna course catalogue (Phase 2 foundation).
-- Schools and programmes come from the official FUT Minna ePortal programme list.
-- Courses come from department pages on futminna.edu.ng, or are entered/imported by the committee.
-- Every course records where it came from and whether a person has verified it. Nothing is invented,
-- and nothing here implies automatic synchronisation with the university.

create table public.schools (
  code        text primary key check (code ~ '^[A-Za-z]{2,6}$'),
  name        text not null,
  source_url  text not null,
  created_at  timestamptz not null default now()
);

create table public.programmes (
  id           bigint generated always as identity primary key,
  school_code  text not null references public.schools(code) on update cascade,
  name         text not null,
  source_url   text not null,
  created_at   timestamptz not null default now(),
  unique (school_code, name)
);

create type public.course_verification as enum ('from_department_page', 'committee_verified', 'pending_review', 'rejected');
create type public.course_status as enum ('compulsory', 'elective', 'required');

create table public.courses (
  id                 uuid primary key default gen_random_uuid(),
  programme_id       bigint not null references public.programmes(id) on delete cascade,
  code               text not null check (code ~ '^[A-Z][A-Z-]{1,9} ?[0-9]{3}[A-Z]?$'),
  title              text not null check (length(title) between 2 and 200),
  credit_units       smallint check (credit_units between 0 and 15),
  level              smallint check (level in (100, 200, 300, 400, 500, 600)),
  semester           smallint check (semester in (1, 2)),         -- null when the source doesn't say
  status             public.course_status,                         -- null when the source doesn't say
  curriculum_version text not null default 'CCMAS',
  verification       public.course_verification not null default 'pending_review',
  source_url         text,
  source_note        text,
  verified_by        uuid references public.profiles(id) on delete set null,
  verified_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (programme_id, code, curriculum_version)
);

create index courses_programme_level_idx on public.courses (programme_id, level, semester);
create index courses_code_idx on public.courses (code);

create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

alter table public.schools enable row level security;
alter table public.programmes enable row level security;
alter table public.courses enable row level security;

-- Signed-in members read the directory and any course that isn't rejected or still pending.
create policy "schools: members read" on public.schools for select to authenticated using (true);
create policy "programmes: members read" on public.programmes for select to authenticated using (true);
create policy "courses: members read approved" on public.courses for select to authenticated
  using (verification in ('from_department_page', 'committee_verified') or public.is_staff());

-- Only the chairman curates the catalogue (coordinators gain this in the import-review screen later).
create policy "schools: chairman writes" on public.schools for all to authenticated
  using (public.is_chairman()) with check (public.is_chairman());
create policy "programmes: chairman writes" on public.programmes for all to authenticated
  using (public.is_chairman()) with check (public.is_chairman());
create policy "courses: chairman writes" on public.courses for all to authenticated
  using (public.is_chairman()) with check (public.is_chairman());

-- Grants follow 001: no anonymous access; RLS above decides what signed-in users can do.
revoke all on public.schools, public.programmes, public.courses from anon;
grant select, insert, update, delete on public.schools, public.programmes, public.courses to authenticated;
