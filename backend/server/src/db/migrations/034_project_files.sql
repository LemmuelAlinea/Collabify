alter table public.projects
  alter column description drop not null,
  add column if not exists file_storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists file_text text,
  add column if not exists file_text_extracted_at timestamptz,
  add column if not exists file_text_error text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
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

drop policy if exists "Professors can upload own project files" on storage.objects;
drop policy if exists "Professors can read own project files" on storage.objects;
drop policy if exists "Professors can update own project files" on storage.objects;
drop policy if exists "Professors can delete own project files" on storage.objects;

create policy "Professors can upload own project files"
on storage.objects for insert
with check (
  bucket_id = 'project-files'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);

create policy "Professors can read own project files"
on storage.objects for select
using (
  bucket_id = 'project-files'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);

create policy "Professors can update own project files"
on storage.objects for update
using (
  bucket_id = 'project-files'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
)
with check (
  bucket_id = 'project-files'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);

create policy "Professors can delete own project files"
on storage.objects for delete
using (
  bucket_id = 'project-files'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);
