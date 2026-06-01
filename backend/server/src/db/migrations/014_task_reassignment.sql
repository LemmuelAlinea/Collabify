-- Task reassignment workflow and score-transfer policy.

do $$
begin
  create type public.reassignment_score_policy as enum (
    'keep_original',
    'split_50_50',
    'full_transfer'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table public.reassignment_requests
  add column if not exists score_policy public.reassignment_score_policy not null default 'keep_original';

create index if not exists reassignment_requests_task_status_idx
on public.reassignment_requests(task_id, status);

create index if not exists reassignment_requests_requested_by_idx
on public.reassignment_requests(requested_by, created_at desc);

alter table public.reassignment_requests replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.reassignment_requests;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
