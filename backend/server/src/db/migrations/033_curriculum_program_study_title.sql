alter table public.curriculum_program_studies
  add column if not exists title text;

update public.curriculum_program_studies
set title = left(nullif(trim(content), ''), 180)
where title is null;

create index if not exists curriculum_program_studies_curriculum_sort_idx
on public.curriculum_program_studies(curriculum_id, sort_order);
