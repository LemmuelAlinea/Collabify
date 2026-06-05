alter table public.groups
  add column if not exists status text not null default 'active';

alter table public.groups
  drop constraint if exists groups_status_check;

alter table public.groups
  add constraint groups_status_check check (status in ('active', 'finished'));

create table if not exists public.group_pop_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  generated_by uuid references public.users(id) on delete set null,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  score int not null default 0 check (score >= 0 and score <= 100),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  generated_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists idx_groups_status on public.groups(status);
create index if not exists idx_group_pop_quiz_attempts_group_status on public.group_pop_quiz_attempts(group_id, status);
create index if not exists idx_group_pop_quiz_attempts_user_status on public.group_pop_quiz_attempts(user_id, status);

alter table public.group_pop_quiz_attempts enable row level security;

drop policy if exists "Students can read own group quiz attempts" on public.group_pop_quiz_attempts;
create policy "Students can read own group quiz attempts"
  on public.group_pop_quiz_attempts for select
  using (user_id = auth.uid());

drop policy if exists "Professors can read class group quiz attempts" on public.group_pop_quiz_attempts;
create policy "Professors can read class group quiz attempts"
  on public.group_pop_quiz_attempts for select
  using (
    exists (
      select 1
      from public.groups g
      join public.classes c on c.id = g.class_id
      where g.id = group_pop_quiz_attempts.group_id
        and c.professor_id = auth.uid()
    )
  );
