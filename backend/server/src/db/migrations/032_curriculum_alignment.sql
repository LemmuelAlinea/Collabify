create table if not exists public.curricula (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  program_objectives text,
  program_outcomes text,
  curriculum_components text,
  academic_year text,
  storage_path text,
  file_name text,
  mime_type text,
  file_size_bytes bigint,
  is_active boolean not null default true,
  archived_at timestamptz,
  archived_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_program_studies (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula(id) on delete cascade,
  title text,
  content text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classes
  add column if not exists curriculum_id uuid references public.curricula(id) on delete set null;

create index if not exists curricula_professor_active_idx on public.curricula(professor_id, is_active, created_at desc);
create index if not exists curriculum_program_studies_curriculum_idx on public.curriculum_program_studies(curriculum_id, sort_order);
create index if not exists classes_curriculum_id_idx on public.classes(curriculum_id);

drop trigger if exists curricula_set_updated_at on public.curricula;
create trigger curricula_set_updated_at
before update on public.curricula
for each row execute function public.set_updated_at();

drop trigger if exists curriculum_program_studies_set_updated_at on public.curriculum_program_studies;
create trigger curriculum_program_studies_set_updated_at
before update on public.curriculum_program_studies
for each row execute function public.set_updated_at();

alter table public.curricula enable row level security;
alter table public.curriculum_program_studies enable row level security;

drop policy if exists "Professors can manage own curricula" on public.curricula;
create policy "Professors can manage own curricula"
on public.curricula for all
using (professor_id = auth.uid())
with check (professor_id = auth.uid());

drop policy if exists "Professors can manage own curriculum studies" on public.curriculum_program_studies;
create policy "Professors can manage own curriculum studies"
on public.curriculum_program_studies for all
using (
  exists (
    select 1
    from public.curricula c
    where c.id = curriculum_id
      and c.professor_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.curricula c
    where c.id = curriculum_id
      and c.professor_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'curricula',
  'curricula',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Professors can upload own curriculum files" on storage.objects;
drop policy if exists "Professors can read own curriculum files" on storage.objects;
drop policy if exists "Professors can update own curriculum files" on storage.objects;
drop policy if exists "Professors can delete own curriculum files" on storage.objects;

create policy "Professors can upload own curriculum files"
on storage.objects for insert
with check (
  bucket_id = 'curricula'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);

create policy "Professors can read own curriculum files"
on storage.objects for select
using (
  bucket_id = 'curricula'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);

create policy "Professors can update own curriculum files"
on storage.objects for update
using (
  bucket_id = 'curricula'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
)
with check (
  bucket_id = 'curricula'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);

create policy "Professors can delete own curriculum files"
on storage.objects for delete
using (
  bucket_id = 'curricula'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);
