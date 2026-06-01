alter table public.tasks
  add column if not exists archived_at timestamptz,
  add column if not exists difficulty text not null default 'medium',
  add column if not exists complexity numeric(6,2) not null default 1,
  add column if not exists is_template boolean not null default false,
  add column if not exists applies_to_future_groups boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_difficulty_check'
  ) then
    alter table public.tasks add constraint tasks_difficulty_check
      check (difficulty in ('easy', 'medium', 'hard', 'critical'));
  end if;
end $$;

create table if not exists public.task_groups (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, group_id)
);

create table if not exists public.task_progress (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  status text not null default 'todo',
  progress numeric(5,2) not null default 0,
  completed_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (task_id, group_id),
  check (status in ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  check (progress >= 0 and progress <= 100)
);

create table if not exists public.task_weights (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  group_weight numeric(7,4) not null default 0,
  base_weight numeric(10,4) not null default 0,
  calculated_at timestamptz not null default now(),
  unique (task_id, group_id),
  check (group_weight >= 0 and group_weight <= 100)
);

create table if not exists public.member_progress (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  individual_weight numeric(7,4) not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  calculated_at timestamptz not null default now(),
  unique (task_id, group_id, member_id)
);

create table if not exists public.group_progress (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  progress numeric(7,4) not null default 0,
  completed_weight numeric(7,4) not null default 0,
  total_weight numeric(7,4) not null default 100,
  calculated_at timestamptz not null default now(),
  unique (group_id, project_id)
);

create table if not exists public.task_recalculations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_project_group_active on public.tasks(project_id, group_id) where archived_at is null;
create index if not exists idx_tasks_parent_group on public.tasks(parent_task_id, group_id);
create index if not exists idx_task_assignments_assignee_task on public.task_assignments(assignee_id, task_id);
create index if not exists idx_task_comments_task_created on public.task_comments(task_id, created_at desc);
create index if not exists idx_task_weights_group on public.task_weights(group_id, group_weight);
create index if not exists idx_member_progress_member_group on public.member_progress(member_id, group_id);
create index if not exists idx_group_progress_project on public.group_progress(project_id, progress);

alter table public.task_groups enable row level security;
alter table public.task_progress enable row level security;
alter table public.task_weights enable row level security;
alter table public.member_progress enable row level security;
alter table public.group_progress enable row level security;
alter table public.task_recalculations enable row level security;

drop policy if exists "task system read related" on public.task_groups;
create policy "task system read related" on public.task_groups
for select using (
  exists (
    select 1
    from public.groups g
    left join public.class_members cm on cm.class_id = g.class_id and cm.user_id = auth.uid() and cm.status = 'active'
    left join public.group_members gm on gm.group_id = g.id and gm.user_id = auth.uid() and gm.status = 'active'
    where g.id = task_groups.group_id
      and (cm.user_id is not null or gm.user_id is not null or exists (
        select 1 from public.classes c where c.id = g.class_id and c.professor_id = auth.uid()
      ))
  )
);

drop policy if exists "task progress read related" on public.task_progress;
create policy "task progress read related" on public.task_progress
for select using (
  exists (
    select 1 from public.groups g
    left join public.group_members gm on gm.group_id = g.id and gm.user_id = auth.uid() and gm.status = 'active'
    where g.id = task_progress.group_id
      and (gm.user_id is not null or exists (
        select 1 from public.classes c where c.id = g.class_id and c.professor_id = auth.uid()
      ))
  )
);

drop policy if exists "task weights read related" on public.task_weights;
create policy "task weights read related" on public.task_weights
for select using (
  exists (
    select 1 from public.task_progress tp where tp.task_id = task_weights.task_id and tp.group_id = task_weights.group_id
  )
);

drop policy if exists "member progress read self or professor" on public.member_progress;
create policy "member progress read self or professor" on public.member_progress
for select using (
  member_id = auth.uid()
  or exists (
    select 1 from public.groups g
    join public.classes c on c.id = g.class_id
    where g.id = member_progress.group_id and c.professor_id = auth.uid()
  )
);

drop policy if exists "group progress read related" on public.group_progress;
create policy "group progress read related" on public.group_progress
for select using (
  exists (
    select 1 from public.groups g
    left join public.group_members gm on gm.group_id = g.id and gm.user_id = auth.uid() and gm.status = 'active'
    where g.id = group_progress.group_id
      and (gm.user_id is not null or exists (
        select 1 from public.classes c where c.id = g.class_id and c.professor_id = auth.uid()
      ))
  )
);
