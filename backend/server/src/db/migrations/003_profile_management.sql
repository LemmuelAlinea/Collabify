-- Profile management fields and Supabase Storage setup.

alter table public.profiles
  add column if not exists department text,
  add column if not exists subject_specialization text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-assets',
  'profile-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile photos are publicly readable" on storage.objects;
drop policy if exists "Users can upload own profile photos" on storage.objects;
drop policy if exists "Users can update own profile photos" on storage.objects;
drop policy if exists "Users can delete own profile photos" on storage.objects;

create policy "Profile photos are publicly readable"
on storage.objects for select
using (bucket_id = 'profile-assets');

create policy "Users can upload own profile photos"
on storage.objects for insert
with check (
  bucket_id = 'profile-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own profile photos"
on storage.objects for update
using (
  bucket_id = 'profile-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own profile photos"
on storage.objects for delete
using (
  bucket_id = 'profile-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
