do $$
begin
  create type public.analytics_question_type as enum ('rating_scale', 'multiple_choice', 'short_answer', 'long_answer');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.analytics_report_type as enum ('project', 'group', 'student', 'class', 'professor');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.analytics_question_sets (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  professor_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.analytics_questions
  add column if not exists question_set_id uuid references public.analytics_question_sets(id) on delete cascade,
  add column if not exists question_type public.analytics_question_type not null default 'rating_scale',
  add column if not exists prompt text,
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists position int not null default 0,
  add column if not exists is_required boolean not null default true,
  add column if not exists is_archived boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

update public.analytics_questions
set prompt = coalesce(prompt, question)
where prompt is null;

alter table public.analytics_answers
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists group_id uuid references public.groups(id) on delete cascade,
  add column if not exists student_id uuid references public.users(id) on delete cascade,
  add column if not exists question_set_id uuid references public.analytics_question_sets(id) on delete cascade,
  add column if not exists answer_value jsonb not null default '{}'::jsonb,
  add column if not exists rating numeric(5,2),
  add column if not exists text_answer text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.project_analytics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  completion_rate numeric(5,2) not null default 0,
  success_rate numeric(5,2) not null default 0,
  deadline_compliance numeric(5,2) not null default 0,
  submission_quality numeric(5,2) not null default 0,
  learning_effectiveness numeric(5,2) not null default 0,
  project_effectiveness numeric(5,2) not null default 0,
  contribution_fairness numeric(5,2) not null default 0,
  health_score numeric(5,2) not null default 0,
  ai_insights text,
  metrics jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_analytics (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null unique references public.groups(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  group_performance numeric(5,2) not null default 0,
  task_distribution numeric(5,2) not null default 0,
  contribution_balance numeric(5,2) not null default 0,
  communication_activity numeric(5,2) not null default 0,
  submission_activity numeric(5,2) not null default 0,
  status_label text not null default 'Needs Data',
  metrics jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_analytics (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  projects_completed int not null default 0,
  personal_completion numeric(5,2) not null default 0,
  task_completion numeric(5,2) not null default 0,
  contribution_score numeric(5,2) not null default 0,
  average_learning_score numeric(5,2) not null default 0,
  submission_success_rate numeric(5,2) not null default 0,
  trend jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, project_id)
);

create table if not exists public.class_analytics (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes(id) on delete cascade,
  completion_rate numeric(5,2) not null default 0,
  average_learning numeric(5,2) not null default 0,
  average_contribution numeric(5,2) not null default 0,
  average_project_health numeric(5,2) not null default 0,
  average_task_completion numeric(5,2) not null default 0,
  curriculum_effectiveness jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professor_analytics (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null unique references public.users(id) on delete cascade,
  projects_created int not null default 0,
  projects_completed int not null default 0,
  average_learning_effectiveness numeric(5,2) not null default 0,
  average_project_effectiveness numeric(5,2) not null default 0,
  average_completion_rate numeric(5,2) not null default 0,
  average_group_performance numeric(5,2) not null default 0,
  deadline_extension_frequency numeric(8,2) not null default 0,
  contribution_fairness_trends jsonb not null default '[]'::jsonb,
  project_health_trends jsonb not null default '[]'::jsonb,
  ai_insights text,
  metrics jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_reports (
  id uuid primary key default gen_random_uuid(),
  report_type public.analytics_report_type not null,
  requested_by uuid not null references public.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  student_id uuid references public.users(id) on delete cascade,
  format text not null check (format in ('pdf', 'excel', 'csv')),
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  storage_bucket text,
  storage_path text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists analytics_answers_once_idx
on public.analytics_answers(question_id, project_id, group_id, student_id);

create index if not exists analytics_questions_set_idx on public.analytics_questions(question_set_id, position);
create index if not exists analytics_answers_project_group_idx on public.analytics_answers(project_id, group_id);
create index if not exists project_analytics_class_idx on public.project_analytics(class_id, generated_at desc);
create index if not exists group_analytics_project_idx on public.group_analytics(project_id, generated_at desc);
create index if not exists student_analytics_student_idx on public.student_analytics(student_id, generated_at desc);
create index if not exists analytics_reports_requested_idx on public.analytics_reports(requested_by, created_at desc);

create trigger set_analytics_question_sets_updated_at before update on public.analytics_question_sets for each row execute function public.set_updated_at();
create trigger set_project_analytics_updated_at before update on public.project_analytics for each row execute function public.set_updated_at();
create trigger set_group_analytics_updated_at before update on public.group_analytics for each row execute function public.set_updated_at();
create trigger set_student_analytics_updated_at before update on public.student_analytics for each row execute function public.set_updated_at();
create trigger set_class_analytics_updated_at before update on public.class_analytics for each row execute function public.set_updated_at();
create trigger set_professor_analytics_updated_at before update on public.professor_analytics for each row execute function public.set_updated_at();

alter table public.analytics_question_sets enable row level security;
alter table public.project_analytics enable row level security;
alter table public.group_analytics enable row level security;
alter table public.student_analytics enable row level security;
alter table public.class_analytics enable row level security;
alter table public.professor_analytics enable row level security;
alter table public.analytics_reports enable row level security;

create policy "Professors manage own analytics question sets"
on public.analytics_question_sets for all
using (professor_id = auth.uid())
with check (professor_id = auth.uid());

create policy "Class members view question sets"
on public.analytics_question_sets for select
using (class_id is null or public.is_class_member(class_id, auth.uid()));

create policy "Users view accessible project analytics"
on public.project_analytics for select
using (
  public.is_class_member(class_id, auth.uid())
  or exists (select 1 from public.classes c where c.id = project_analytics.class_id and c.professor_id = auth.uid())
);

create policy "Users view accessible group analytics"
on public.group_analytics for select
using (
  public.is_group_member(group_id, auth.uid())
  or exists (select 1 from public.classes c where c.id = group_analytics.class_id and c.professor_id = auth.uid())
);

create policy "Students view own analytics"
on public.student_analytics for select
using (
  student_id = auth.uid()
  or exists (select 1 from public.classes c where c.id = student_analytics.class_id and c.professor_id = auth.uid())
);

create policy "Users view accessible class analytics"
on public.class_analytics for select
using (
  public.is_class_member(class_id, auth.uid())
  or exists (select 1 from public.classes c where c.id = class_analytics.class_id and c.professor_id = auth.uid())
);

create policy "Professors view own professor analytics"
on public.professor_analytics for select
using (professor_id = auth.uid());

create policy "Users manage own analytics reports"
on public.analytics_reports for all
using (requested_by = auth.uid())
with check (requested_by = auth.uid());

alter table public.project_analytics replica identity full;
alter table public.group_analytics replica identity full;
alter table public.student_analytics replica identity full;
alter table public.class_analytics replica identity full;
alter table public.professor_analytics replica identity full;

do $$
declare
  target_professor uuid;
  target_set uuid;
begin
  select id into target_professor from public.users where role = 'professor' limit 1;

  if target_professor is not null and not exists (
    select 1 from public.analytics_question_sets where is_default = true
  ) then
    insert into public.analytics_question_sets (professor_id, title, description, is_default)
    values (target_professor, 'Default Post-Project Learning Evaluation', 'Reusable BSIT post-project learning questionnaire.', true)
    returning id into target_set;

    insert into public.analytics_questions (question_set_id, asked_by, question, prompt, question_type, position, context)
    values
      (target_set, target_professor, 'Did this project improve your technical skills?', 'Did this project improve your technical skills?', 'rating_scale', 1, '{}'::jsonb),
      (target_set, target_professor, 'Did this project help you understand course concepts?', 'Did this project help you understand course concepts?', 'rating_scale', 2, '{}'::jsonb),
      (target_set, target_professor, 'Was the workload manageable?', 'Was the workload manageable?', 'rating_scale', 3, '{}'::jsonb),
      (target_set, target_professor, 'Did your group collaborate effectively?', 'Did your group collaborate effectively?', 'rating_scale', 4, '{}'::jsonb),
      (target_set, target_professor, 'Do you feel more confident performing similar tasks?', 'Do you feel more confident performing similar tasks?', 'rating_scale', 5, '{}'::jsonb);
  end if;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table
    public.project_analytics,
    public.group_analytics,
    public.student_analytics,
    public.class_analytics,
    public.professor_analytics;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
