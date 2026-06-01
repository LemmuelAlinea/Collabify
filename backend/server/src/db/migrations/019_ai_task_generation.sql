do $$
begin
  create type public.ai_task_generation_status as enum ('draft', 'accepted', 'merged', 'discarded');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.ai_task_templates (
  id uuid primary key default gen_random_uuid(),
  project_type text not null,
  year_level int check (year_level between 1 and 5),
  title text not null,
  structure jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_task_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  generated_by uuid not null references public.users(id) on delete cascade,
  status public.ai_task_generation_status not null default 'draft',
  project_version int not null default 1,
  prompt_inputs jsonb not null default '{}'::jsonb,
  generated_structure jsonb not null default '{}'::jsonb,
  project_summary text,
  complexity_score numeric(5,2) not null default 0 check (complexity_score between 0 and 100),
  complexity_label text not null default 'Moderate',
  structure_type text not null default 'hierarchical',
  total_weight numeric(6,2) not null default 100,
  report jsonb not null default '{}'::jsonb,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generated_tasks (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.ai_task_generations(id) on delete cascade,
  title text not null,
  description text,
  milestone_key text,
  role_suggestion text,
  priority public.task_priority not null default 'medium',
  estimated_hours numeric(6,2) not null default 0,
  points int not null default 5,
  weight numeric(6,2) not null default 0,
  due_at timestamptz,
  position int not null default 0,
  reasoning text,
  learning_outcomes jsonb not null default '[]'::jsonb,
  accepted_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generated_subtasks (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.ai_task_generations(id) on delete cascade,
  generated_task_id uuid not null references public.ai_generated_tasks(id) on delete cascade,
  title text not null,
  description text,
  role_suggestion text,
  priority public.task_priority not null default 'medium',
  estimated_hours numeric(6,2) not null default 0,
  points int not null default 2,
  weight numeric(6,2) not null default 0,
  due_at timestamptz,
  position int not null default 0,
  reasoning text,
  learning_outcomes jsonb not null default '[]'::jsonb,
  accepted_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  generation_id uuid references public.ai_task_generations(id) on delete set null,
  dependency_type text not null default 'finish_to_start',
  created_at timestamptz not null default now(),
  unique (task_id, depends_on_task_id)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  generation_id uuid references public.ai_task_generations(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  position int not null default 0,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestone_tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (milestone_id, task_id)
);

create table if not exists public.workload_analysis (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.ai_task_generations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  team_size int not null default 1,
  total_estimated_hours numeric(8,2) not null default 0,
  balance_score numeric(5,2) not null default 0 check (balance_score between 0 and 100),
  contribution_plan jsonb not null default '[]'::jsonb,
  role_suggestions jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_task_generations_project_idx on public.ai_task_generations(project_id, created_at desc);
create index if not exists ai_generated_tasks_generation_idx on public.ai_generated_tasks(generation_id, position);
create index if not exists ai_generated_subtasks_task_idx on public.ai_generated_subtasks(generated_task_id, position);
create index if not exists task_dependencies_task_idx on public.task_dependencies(task_id);
create index if not exists milestones_project_idx on public.milestones(project_id, due_at);
create index if not exists workload_analysis_generation_idx on public.workload_analysis(generation_id);

create trigger set_ai_task_templates_updated_at before update on public.ai_task_templates for each row execute function public.set_updated_at();
create trigger set_ai_task_generations_updated_at before update on public.ai_task_generations for each row execute function public.set_updated_at();
create trigger set_ai_generated_tasks_updated_at before update on public.ai_generated_tasks for each row execute function public.set_updated_at();
create trigger set_ai_generated_subtasks_updated_at before update on public.ai_generated_subtasks for each row execute function public.set_updated_at();
create trigger set_milestones_updated_at before update on public.milestones for each row execute function public.set_updated_at();

alter table public.ai_task_templates enable row level security;
alter table public.ai_task_generations enable row level security;
alter table public.ai_generated_tasks enable row level security;
alter table public.ai_generated_subtasks enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_tasks enable row level security;
alter table public.workload_analysis enable row level security;

create policy "Users view accessible task generations"
on public.ai_task_generations for select
using (
  generated_by = auth.uid()
  or exists (select 1 from public.projects p join public.class_members cm on cm.class_id = p.class_id where p.id = ai_task_generations.project_id and cm.user_id = auth.uid() and cm.status = 'active')
  or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = ai_task_generations.project_id and c.professor_id = auth.uid())
);

create policy "Users view generated task details"
on public.ai_generated_tasks for select
using (exists (select 1 from public.ai_task_generations g where g.id = ai_generated_tasks.generation_id and (g.generated_by = auth.uid() or exists (select 1 from public.projects p join public.class_members cm on cm.class_id = p.class_id where p.id = g.project_id and cm.user_id = auth.uid() and cm.status = 'active') or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = g.project_id and c.professor_id = auth.uid()))));

create policy "Users view generated subtask details"
on public.ai_generated_subtasks for select
using (exists (select 1 from public.ai_task_generations g where g.id = ai_generated_subtasks.generation_id and (g.generated_by = auth.uid() or exists (select 1 from public.projects p join public.class_members cm on cm.class_id = p.class_id where p.id = g.project_id and cm.user_id = auth.uid() and cm.status = 'active') or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = g.project_id and c.professor_id = auth.uid()))));

create policy "Users view accessible milestones"
on public.milestones for select
using (
  public.is_group_member(group_id, auth.uid())
  or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = milestones.project_id and c.professor_id = auth.uid())
);

create policy "Users view accessible workload analysis"
on public.workload_analysis for select
using (
  public.is_group_member(group_id, auth.uid())
  or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = workload_analysis.project_id and c.professor_id = auth.uid())
);

alter table public.ai_task_generations replica identity full;
alter table public.ai_generated_tasks replica identity full;
alter table public.ai_generated_subtasks replica identity full;
alter table public.task_dependencies replica identity full;
alter table public.milestones replica identity full;
alter table public.milestone_tasks replica identity full;
alter table public.workload_analysis replica identity full;

do $$
begin
  alter publication supabase_realtime add table
    public.ai_task_generations,
    public.ai_generated_tasks,
    public.ai_generated_subtasks,
    public.task_dependencies,
    public.milestones,
    public.milestone_tasks,
    public.workload_analysis;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
