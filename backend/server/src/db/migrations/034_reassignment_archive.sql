alter table public.reassignment_requests
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users(id) on delete set null;

create index if not exists reassignment_requests_professor_archive_idx
on public.reassignment_requests(class_id, status, archived_at, created_at desc);
