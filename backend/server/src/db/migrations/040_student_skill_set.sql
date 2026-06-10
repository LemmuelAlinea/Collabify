alter table public.profiles
  add column if not exists skills_onboarding_done boolean not null default false;

create table if not exists public.student_skill_set (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  skill_key text not null check (skill_key in (
    'frontend',
    'backend',
    'ui_ux_design',
    'mobile_dev',
    'database',
    'qa_testing',
    'documentation_technical_writing',
    'project_management'
  )),
  proficiency text not null check (proficiency in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, skill_key)
);

create index if not exists idx_student_skill_set_user_id on public.student_skill_set(user_id);

create trigger set_student_skill_set_updated_at
before update on public.student_skill_set
for each row execute function public.set_updated_at();

alter table public.student_skill_set enable row level security;

drop policy if exists "Students can view own skill set" on public.student_skill_set;
create policy "Students can view own skill set"
  on public.student_skill_set for select
  using (user_id = auth.uid());

drop policy if exists "Students can manage own skill set" on public.student_skill_set;
create policy "Students can manage own skill set"
  on public.student_skill_set for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
