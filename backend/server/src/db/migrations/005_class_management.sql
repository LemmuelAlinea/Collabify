-- Class management fields and helper indexes.

alter table public.classes
  add column if not exists subject text,
  add column if not exists year_level int check (year_level between 1 and 5),
  add column if not exists semester text,
  add column if not exists school_year text;

create index if not exists classes_join_code_idx on public.classes(join_code);
create index if not exists classes_subject_idx on public.classes(subject);
create index if not exists classes_school_year_idx on public.classes(school_year);

-- Backfill newer fields from the original structure where possible.
update public.classes
set
  subject = coalesce(subject, title),
  semester = coalesce(semester, term),
  school_year = coalesce(school_year, academic_year)
where subject is null
   or semester is null
   or school_year is null;
