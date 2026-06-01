-- Syllabus management storage and metadata updates.

alter table public.syllabi
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users(id) on delete set null;

create index if not exists syllabi_uploaded_by_idx on public.syllabi(uploaded_by);
create index if not exists syllabi_class_active_idx on public.syllabi(class_id, is_active);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'syllabi',
  'syllabi',
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

drop policy if exists "Professors can upload own syllabus files" on storage.objects;
drop policy if exists "Professors can read own syllabus files" on storage.objects;
drop policy if exists "Professors can update own syllabus files" on storage.objects;
drop policy if exists "Professors can delete own syllabus files" on storage.objects;

create policy "Professors can upload own syllabus files"
on storage.objects for insert
with check (
  bucket_id = 'syllabi'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);

create policy "Professors can read own syllabus files"
on storage.objects for select
using (
  bucket_id = 'syllabi'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);

create policy "Professors can update own syllabus files"
on storage.objects for update
using (
  bucket_id = 'syllabi'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
)
with check (
  bucket_id = 'syllabi'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);

create policy "Professors can delete own syllabus files"
on storage.objects for delete
using (
  bucket_id = 'syllabi'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.user_has_role(auth.uid(), 'professor')
);
