alter type public.health_status add value if not exists 'excellent';
alter type public.health_status add value if not exists 'warning';
alter type public.health_status add value if not exists 'delayed';
alter type public.health_status add value if not exists 'overloaded';
alter type public.health_status add value if not exists 'inactive';
alter type public.health_status add value if not exists 'uneven_contribution';

alter table public.project_health
  add column if not exists statuses jsonb not null default '[]'::jsonb,
  add column if not exists class_id uuid references public.classes(id) on delete cascade,
  add column if not exists timeline_adherence numeric(5,2) not null default 0,
  add column if not exists deadline_risk numeric(5,2) not null default 0,
  add column if not exists contribution_balance numeric(5,2) not null default 0,
  add column if not exists workload_balance numeric(5,2) not null default 0,
  add column if not exists inactivity_days int not null default 0,
  add column if not exists ai_summary text,
  add column if not exists forecast jsonb not null default '{}'::jsonb,
  add column if not exists task_report jsonb not null default '{}'::jsonb,
  add column if not exists member_report jsonb not null default '[]'::jsonb,
  add column if not exists group_report jsonb not null default '{}'::jsonb,
  add column if not exists milestone_report jsonb not null default '[]'::jsonb,
  add column if not exists phase_report jsonb not null default '[]'::jsonb;

create table if not exists public.project_health_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  health_id uuid references public.project_health(id) on delete set null,
  score numeric(5,2) not null check (score between 0 and 100),
  status public.health_status not null,
  statuses jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.project_health_scores (
  id uuid primary key default gen_random_uuid(),
  health_id uuid not null references public.project_health(id) on delete cascade,
  category text not null,
  score numeric(5,2) not null check (score between 0 and 100),
  label text,
  explanation text,
  created_at timestamptz not null default now(),
  unique (health_id, category)
);

create table if not exists public.health_risk_reports (
  id uuid primary key default gen_random_uuid(),
  health_id uuid not null references public.project_health(id) on delete cascade,
  risk_type text not null,
  severity public.notification_priority not null default 'medium',
  probability numeric(5,2) check (probability between 0 and 100),
  description text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.health_forecasts (
  id uuid primary key default gen_random_uuid(),
  health_id uuid not null references public.project_health(id) on delete cascade,
  estimated_completion_at timestamptz,
  trend text not null default 'stable',
  expected_risk_level public.notification_priority not null default 'medium',
  missed_deadline_probability numeric(5,2) not null default 0,
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.health_recommendations (
  id uuid primary key default gen_random_uuid(),
  health_id uuid not null references public.project_health(id) on delete cascade,
  priority public.notification_priority not null default 'medium',
  title text not null,
  description text not null,
  action_type text,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.health_alerts (
  id uuid primary key default gen_random_uuid(),
  health_id uuid not null references public.project_health(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  alert_type text not null,
  severity public.notification_priority not null default 'medium',
  title text not null,
  body text,
  is_active boolean not null default true,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.health_phase_reports (
  id uuid primary key default gen_random_uuid(),
  health_id uuid not null references public.project_health(id) on delete cascade,
  phase text not null,
  score numeric(5,2) not null default 0 check (score between 0 and 100),
  status text not null default 'warning',
  task_count int not null default 0,
  completed_count int not null default 0,
  overdue_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_health_history_project_idx on public.project_health_history(project_id, created_at desc);
create index if not exists project_health_scores_health_idx on public.project_health_scores(health_id);
create index if not exists health_risk_reports_health_idx on public.health_risk_reports(health_id);
create index if not exists health_forecasts_health_idx on public.health_forecasts(health_id);
create index if not exists health_recommendations_health_idx on public.health_recommendations(health_id);
create index if not exists health_alerts_project_active_idx on public.health_alerts(project_id, is_active, created_at desc);
create index if not exists health_phase_reports_health_idx on public.health_phase_reports(health_id);

alter table public.project_health_history enable row level security;
alter table public.project_health_scores enable row level security;
alter table public.health_risk_reports enable row level security;
alter table public.health_forecasts enable row level security;
alter table public.health_recommendations enable row level security;
alter table public.health_alerts enable row level security;
alter table public.health_phase_reports enable row level security;

create policy "Users view accessible project health"
on public.project_health for select
using (
  public.is_group_member(group_id, auth.uid())
  or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = project_health.project_id and c.professor_id = auth.uid())
);

create policy "Users view accessible project health history"
on public.project_health_history for select
using (
  public.is_group_member(group_id, auth.uid())
  or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = project_health_history.project_id and c.professor_id = auth.uid())
);

create policy "Users view accessible health scores"
on public.project_health_scores for select
using (exists (select 1 from public.project_health h where h.id = project_health_scores.health_id and (public.is_group_member(h.group_id, auth.uid()) or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = h.project_id and c.professor_id = auth.uid()))));

create policy "Users view accessible health risks"
on public.health_risk_reports for select
using (exists (select 1 from public.project_health h where h.id = health_risk_reports.health_id and (public.is_group_member(h.group_id, auth.uid()) or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = h.project_id and c.professor_id = auth.uid()))));

create policy "Users view accessible health forecasts"
on public.health_forecasts for select
using (exists (select 1 from public.project_health h where h.id = health_forecasts.health_id and (public.is_group_member(h.group_id, auth.uid()) or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = h.project_id and c.professor_id = auth.uid()))));

create policy "Users view accessible health recommendations"
on public.health_recommendations for select
using (exists (select 1 from public.project_health h where h.id = health_recommendations.health_id and (public.is_group_member(h.group_id, auth.uid()) or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = h.project_id and c.professor_id = auth.uid()))));

create policy "Users view accessible health alerts"
on public.health_alerts for select
using (
  public.is_group_member(group_id, auth.uid())
  or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = health_alerts.project_id and c.professor_id = auth.uid())
);

create policy "Users view accessible health phases"
on public.health_phase_reports for select
using (exists (select 1 from public.project_health h where h.id = health_phase_reports.health_id and (public.is_group_member(h.group_id, auth.uid()) or exists (select 1 from public.projects p join public.classes c on c.id = p.class_id where p.id = h.project_id and c.professor_id = auth.uid()))));

alter table public.project_health_history replica identity full;
alter table public.project_health_scores replica identity full;
alter table public.health_risk_reports replica identity full;
alter table public.health_forecasts replica identity full;
alter table public.health_recommendations replica identity full;
alter table public.health_alerts replica identity full;
alter table public.health_phase_reports replica identity full;

do $$
begin
  alter publication supabase_realtime add table
    public.project_health,
    public.project_health_history,
    public.project_health_scores,
    public.health_risk_reports,
    public.health_forecasts,
    public.health_recommendations,
    public.health_alerts,
    public.health_phase_reports;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
