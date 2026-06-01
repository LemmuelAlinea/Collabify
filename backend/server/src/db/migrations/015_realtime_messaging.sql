create table if not exists public.message_deletions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  unique (message_id, user_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.messages
  add column if not exists deleted_for_everyone_by uuid references public.users(id) on delete set null;

create index if not exists message_deletions_user_idx
on public.message_deletions(user_id, deleted_at desc);

create index if not exists attachments_message_owner_idx
on public.attachments(owner_id) where owner_type = 'message';

alter table public.message_deletions enable row level security;

alter table public.messages replica identity full;
alter table public.attachments replica identity full;
alter table public.pinned_messages replica identity full;
alter table public.message_deletions replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload own message attachments'
  ) then
    create policy "Authenticated users can upload own message attachments"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'message-attachments'
      and auth.uid()::text = (storage.foldername(name))[2]
    );
  end if;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table
    public.messages,
    public.attachments,
    public.pinned_messages,
    public.message_deletions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
