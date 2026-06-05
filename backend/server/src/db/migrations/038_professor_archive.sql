alter table public.classes
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users(id) on delete set null;

create index if not exists idx_classes_professor_archived_at
  on public.classes(professor_id, archived_at desc)
  where is_archived = true;

create index if not exists idx_curricula_professor_archived_at
  on public.curricula(professor_id, archived_at desc)
  where is_active = false;

create index if not exists idx_syllabi_archived_at
  on public.syllabi(class_id, archived_at desc)
  where is_active = false;

create index if not exists idx_tasks_archived_at
  on public.tasks(group_id, archived_at desc)
  where archived_at is not null;
