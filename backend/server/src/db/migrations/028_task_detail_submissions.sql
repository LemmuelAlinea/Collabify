alter table public.submission_versions
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.users(id) on delete set null;

create table if not exists public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  changed_by uuid references public.users(id) on delete set null,
  old_status text,
  new_status text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_status_history_task_created
on public.task_status_history(task_id, created_at desc);

create index if not exists idx_submission_versions_active
on public.submission_versions(submission_id, created_at desc)
where archived_at is null and deleted_at is null;

alter table public.task_status_history enable row level security;

drop policy if exists "task history read related" on public.task_status_history;
create policy "task history read related"
on public.task_status_history for select
using (
  exists (
    select 1
    from public.tasks t
    join public.groups g on g.id = t.group_id
    join public.classes c on c.id = g.class_id
    where t.id = task_status_history.task_id
      and (
        c.professor_id = auth.uid()
        or public.is_group_member(g.id, auth.uid())
      )
  )
);

alter table public.task_status_history replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.task_status_history;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
