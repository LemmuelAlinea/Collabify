do $$
begin
  create type public.validation_decision as enum ('pending', 'accepted_suggestions', 'ignored_suggestions', 'reanalyzed');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.project_validations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  professor_id uuid not null references public.users(id) on delete cascade,
  version int not null default 1,
  readiness_score numeric(5,2) not null default 0 check (readiness_score between 0 and 100),
  readiness_label text not null default 'Needs Revision',
  difficulty_score numeric(5,2) not null default 0 check (difficulty_score between 0 and 100),
  difficulty_label text not null default 'Intermediate',
  executive_summary text,
  full_report jsonb not null default '{}'::jsonb,
  decision public.validation_decision not null default 'pending',
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, version)
);

create table if not exists public.validation_scores (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public.project_validations(id) on delete cascade,
  category text not null,
  score numeric(5,2) not null check (score between 0 and 100),
  label text,
  explanation text,
  created_at timestamptz not null default now(),
  unique (validation_id, category)
);

create table if not exists public.validation_recommendations (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public.project_validations(id) on delete cascade,
  priority public.notification_priority not null default 'medium',
  title text not null,
  description text not null,
  action_type text,
  is_accepted boolean,
  created_at timestamptz not null default now()
);

create table if not exists public.validation_risks (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public.project_validations(id) on delete cascade,
  risk_type text not null,
  severity public.notification_priority not null default 'medium',
  probability numeric(5,2) check (probability between 0 and 100),
  reason text not null,
  mitigation text,
  created_at timestamptz not null default now()
);

create table if not exists public.validation_history (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references public.project_validations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  professor_id uuid not null references public.users(id) on delete cascade,
  event text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists project_validations_project_created_idx on public.project_validations(project_id, created_at desc);
create index if not exists validation_scores_validation_idx on public.validation_scores(validation_id);
create index if not exists validation_recommendations_validation_idx on public.validation_recommendations(validation_id);
create index if not exists validation_risks_validation_idx on public.validation_risks(validation_id);
create index if not exists validation_history_project_idx on public.validation_history(project_id, created_at desc);

create trigger set_project_validations_updated_at before update on public.project_validations for each row execute function public.set_updated_at();

alter table public.project_validations enable row level security;
alter table public.validation_scores enable row level security;
alter table public.validation_recommendations enable row level security;
alter table public.validation_risks enable row level security;
alter table public.validation_history enable row level security;

create policy "Professors view own project validations"
on public.project_validations for select
using (
  professor_id = auth.uid()
  or exists (
    select 1 from public.projects p
    join public.class_members cm on cm.class_id = p.class_id
    where p.id = project_validations.project_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  )
);

create policy "Professors manage own project validations"
on public.project_validations for all
using (professor_id = auth.uid())
with check (professor_id = auth.uid());

create policy "Users view validation scores"
on public.validation_scores for select
using (exists (select 1 from public.project_validations pv where pv.id = validation_scores.validation_id and (pv.professor_id = auth.uid() or exists (select 1 from public.projects p join public.class_members cm on cm.class_id = p.class_id where p.id = pv.project_id and cm.user_id = auth.uid() and cm.status = 'active'))));

create policy "Users view validation recommendations"
on public.validation_recommendations for select
using (exists (select 1 from public.project_validations pv where pv.id = validation_recommendations.validation_id and (pv.professor_id = auth.uid() or exists (select 1 from public.projects p join public.class_members cm on cm.class_id = p.class_id where p.id = pv.project_id and cm.user_id = auth.uid() and cm.status = 'active'))));

create policy "Users view validation risks"
on public.validation_risks for select
using (exists (select 1 from public.project_validations pv where pv.id = validation_risks.validation_id and (pv.professor_id = auth.uid() or exists (select 1 from public.projects p join public.class_members cm on cm.class_id = p.class_id where p.id = pv.project_id and cm.user_id = auth.uid() and cm.status = 'active'))));

create policy "Users view validation history"
on public.validation_history for select
using (
  professor_id = auth.uid()
  or exists (
    select 1 from public.projects p
    join public.class_members cm on cm.class_id = p.class_id
    where p.id = validation_history.project_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  )
);

alter table public.project_validations replica identity full;
alter table public.validation_scores replica identity full;
alter table public.validation_recommendations replica identity full;
alter table public.validation_risks replica identity full;
alter table public.validation_history replica identity full;

do $$
begin
  alter publication supabase_realtime add table
    public.project_validations,
    public.validation_scores,
    public.validation_recommendations,
    public.validation_risks,
    public.validation_history;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
