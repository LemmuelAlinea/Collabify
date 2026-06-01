alter table public.classes
  add column if not exists syllabus_id uuid references public.syllabi(id) on delete set null;

create index if not exists classes_syllabus_id_idx
  on public.classes(syllabus_id);
