-- Collabify initial Supabase PostgreSQL schema.
-- Identity is owned by auth.users. public.users mirrors application role/state.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('student', 'professor');
create type public.member_status as enum ('invited', 'active', 'removed');
create type public.project_status as enum ('draft', 'open', 'in_progress', 'submitted', 'completed', 'archived');
create type public.assignment_scope as enum ('student', 'group');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.submission_status as enum ('draft', 'submitted', 'reviewed', 'returned', 'accepted');
create type public.reassignment_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.message_scope as enum ('class', 'group');
create type public.attachment_owner_type as enum ('message', 'task_comment', 'submission_version', 'announcement', 'syllabus');
create type public.notification_type as enum ('announcement', 'task', 'submission', 'message', 'reassignment', 'project_health', 'analytics', 'system');
create type public.health_status as enum ('healthy', 'at_risk', 'critical');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.user_role not null,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.user_has_role(target_user_id uuid, expected_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = target_user_id
      and u.role = expected_role
      and u.is_active = true
  );
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  student_number text unique,
  employee_number text unique,
  first_name text not null,
  middle_name text,
  last_name text not null,
  display_name text generated always as (trim(first_name || ' ' || last_name)) stored,
  avatar_url text,
  program text not null default 'BSIT',
  year_level int check (year_level between 1 and 5),
  section text,
  bio text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.users(id) on delete restrict,
  code text not null,
  title text not null,
  description text,
  term text not null,
  academic_year text not null,
  section text,
  join_code text not null unique,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_professor_role check (
    public.user_has_role(professor_id, 'professor')
  )
);

create table public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.user_role not null,
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, user_id)
);

create table public.syllabi (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  title text not null,
  description text,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  version int not null default 1 check (version > 0),
  is_active boolean not null default true,
  effective_from date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, version)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete restrict,
  title text not null,
  description text not null,
  objectives text,
  requirements jsonb not null default '[]'::jsonb,
  status public.project_status not null default 'draft',
  due_at timestamptz,
  max_group_size int check (max_group_size > 0),
  rubric jsonb not null default '{}'::jsonb,
  ai_validation_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  released_by uuid not null references public.users(id) on delete restrict,
  version int not null check (version > 0),
  release_notes text,
  payload jsonb not null default '{}'::jsonb,
  released_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references public.users(id) on delete restrict,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, project_id, name)
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  is_leader boolean not null default false,
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scope public.assignment_scope not null,
  assigned_user_id uuid references public.users(id) on delete cascade,
  assigned_group_id uuid references public.groups(id) on delete cascade,
  assigned_by uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint project_assignments_one_target check (
    (scope = 'student' and assigned_user_id is not null and assigned_group_id is null)
    or
    (scope = 'group' and assigned_group_id is not null and assigned_user_id is null)
  )
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  parent_task_id uuid references public.tasks(id) on delete set null,
  created_by uuid not null references public.users(id) on delete restrict,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  position int not null default 0,
  due_at timestamptz,
  estimated_hours numeric(6,2) check (estimated_hours >= 0),
  completed_at timestamptz,
  ai_generated boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete restrict,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  position int not null default 0,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  assignee_id uuid not null references public.users(id) on delete cascade,
  assigned_by uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (task_id, assignee_id)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  body text not null,
  parent_comment_id uuid references public.task_comments(id) on delete cascade,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  submitted_by uuid not null references public.users(id) on delete restrict,
  group_id uuid references public.groups(id) on delete cascade,
  status public.submission_status not null default 'submitted',
  current_version_id uuid,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.task_submissions(id) on delete cascade,
  version int not null check (version > 0),
  uploaded_by uuid not null references public.users(id) on delete restrict,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  notes text,
  checksum text,
  created_at timestamptz not null default now(),
  unique (submission_id, version)
);

alter table public.task_submissions
  add constraint task_submissions_current_version_fk
  foreign key (current_version_id) references public.submission_versions(id) on delete set null;

create table public.contribution_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  submission_version_id uuid references public.submission_versions(id) on delete set null,
  contribution_type text not null,
  description text,
  points numeric(8,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  class_id uuid references public.classes(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.reassignment_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  requested_by uuid not null references public.users(id) on delete restrict,
  current_assignee_id uuid references public.users(id) on delete set null,
  requested_assignee_id uuid references public.users(id) on delete set null,
  current_group_id uuid references public.groups(id) on delete set null,
  requested_group_id uuid references public.groups(id) on delete set null,
  reason text not null,
  status public.reassignment_status not null default 'pending',
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_chats (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_chats (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null unique references public.groups(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  scope public.message_scope not null,
  class_chat_id uuid references public.class_chats(id) on delete cascade,
  group_chat_id uuid references public.group_chats(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete restrict,
  body text,
  reply_to_message_id uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_one_chat check (
    (scope = 'class' and class_chat_id is not null and group_chat_id is null)
    or
    (scope = 'group' and group_chat_id is not null and class_chat_id is null)
  )
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  owner_type public.attachment_owner_type not null,
  owner_id uuid not null,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.pinned_messages (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  pinned_by uuid not null references public.users(id) on delete restrict,
  class_chat_id uuid references public.class_chats(id) on delete cascade,
  group_chat_id uuid references public.group_chats(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id),
  constraint pinned_messages_one_chat check (
    (class_chat_id is not null and group_chat_id is null)
    or
    (group_chat_id is not null and class_chat_id is null)
  )
);

create table public.analytics_questions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  asked_by uuid not null references public.users(id) on delete restrict,
  question text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.analytics_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.analytics_questions(id) on delete cascade,
  answered_by uuid references public.users(id) on delete set null,
  answer text not null,
  sources jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) check (confidence between 0 and 1),
  created_at timestamptz not null default now()
);

create table public.project_health (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  status public.health_status not null,
  score numeric(5,2) not null check (score between 0 and 100),
  risk_factors jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  generated_by text not null default 'system',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_class_member(target_class_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_members cm
    where cm.class_id = target_class_id
      and cm.user_id = target_user_id
      and cm.status = 'active'
  );
$$;

create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = target_user_id
      and gm.status = 'active'
  );
$$;

-- Indexes
create index users_role_idx on public.users(role);
create index profiles_user_id_idx on public.profiles(user_id);
create index classes_professor_id_idx on public.classes(professor_id);
create index classes_term_year_idx on public.classes(term, academic_year);
create index class_members_class_id_idx on public.class_members(class_id);
create index class_members_user_id_idx on public.class_members(user_id);
create index class_members_active_idx on public.class_members(class_id, user_id) where status = 'active';
create index syllabi_class_id_idx on public.syllabi(class_id);
create index announcements_class_published_idx on public.announcements(class_id, published_at desc);
create index projects_class_id_idx on public.projects(class_id);
create index projects_status_idx on public.projects(status);
create index project_releases_project_version_idx on public.project_releases(project_id, version desc);
create index project_assignments_project_id_idx on public.project_assignments(project_id);
create index project_assignments_user_idx on public.project_assignments(assigned_user_id) where assigned_user_id is not null;
create index project_assignments_group_idx on public.project_assignments(assigned_group_id) where assigned_group_id is not null;
create index groups_class_project_idx on public.groups(class_id, project_id);
create index group_members_group_id_idx on public.group_members(group_id);
create index group_members_user_id_idx on public.group_members(user_id);
create index tasks_project_status_idx on public.tasks(project_id, status);
create index tasks_group_status_idx on public.tasks(group_id, status);
create index tasks_due_at_idx on public.tasks(due_at) where due_at is not null;
create index subtasks_task_status_idx on public.subtasks(task_id, status);
create index task_assignments_task_id_idx on public.task_assignments(task_id);
create index task_assignments_assignee_id_idx on public.task_assignments(assignee_id);
create index task_comments_task_created_idx on public.task_comments(task_id, created_at);
create index task_submissions_task_id_idx on public.task_submissions(task_id);
create index task_submissions_submitted_by_idx on public.task_submissions(submitted_by);
create index submission_versions_submission_version_idx on public.submission_versions(submission_id, version desc);
create index contribution_logs_project_user_idx on public.contribution_logs(project_id, user_id);
create index contribution_logs_group_idx on public.contribution_logs(group_id);
create index activity_logs_actor_created_idx on public.activity_logs(actor_id, created_at desc);
create index activity_logs_class_created_idx on public.activity_logs(class_id, created_at desc);
create index activity_logs_project_created_idx on public.activity_logs(project_id, created_at desc);
create index reassignment_requests_project_status_idx on public.reassignment_requests(project_id, status);
create index class_chats_class_id_idx on public.class_chats(class_id);
create index group_chats_group_id_idx on public.group_chats(group_id);
create index messages_class_chat_created_idx on public.messages(class_chat_id, created_at desc) where class_chat_id is not null;
create index messages_group_chat_created_idx on public.messages(group_chat_id, created_at desc) where group_chat_id is not null;
create index attachments_owner_idx on public.attachments(owner_type, owner_id);
create index attachments_uploaded_by_idx on public.attachments(uploaded_by);
create index pinned_messages_class_chat_idx on public.pinned_messages(class_chat_id) where class_chat_id is not null;
create index pinned_messages_group_chat_idx on public.pinned_messages(group_chat_id) where group_chat_id is not null;
create index analytics_questions_class_idx on public.analytics_questions(class_id, created_at desc);
create index analytics_questions_project_idx on public.analytics_questions(project_id, created_at desc);
create index analytics_answers_question_idx on public.analytics_answers(question_id);
create index project_health_project_generated_idx on public.project_health(project_id, generated_at desc);
create index project_health_group_generated_idx on public.project_health(group_id, generated_at desc);
create index notifications_user_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);

-- Updated-at triggers
create trigger set_users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_classes_updated_at before update on public.classes for each row execute function public.set_updated_at();
create trigger set_class_members_updated_at before update on public.class_members for each row execute function public.set_updated_at();
create trigger set_syllabi_updated_at before update on public.syllabi for each row execute function public.set_updated_at();
create trigger set_announcements_updated_at before update on public.announcements for each row execute function public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger set_groups_updated_at before update on public.groups for each row execute function public.set_updated_at();
create trigger set_group_members_updated_at before update on public.group_members for each row execute function public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_subtasks_updated_at before update on public.subtasks for each row execute function public.set_updated_at();
create trigger set_task_comments_updated_at before update on public.task_comments for each row execute function public.set_updated_at();
create trigger set_task_submissions_updated_at before update on public.task_submissions for each row execute function public.set_updated_at();
create trigger set_reassignment_requests_updated_at before update on public.reassignment_requests for each row execute function public.set_updated_at();
create trigger set_class_chats_updated_at before update on public.class_chats for each row execute function public.set_updated_at();
create trigger set_group_chats_updated_at before update on public.group_chats for each row execute function public.set_updated_at();
create trigger set_messages_updated_at before update on public.messages for each row execute function public.set_updated_at();

-- RLS baseline. Detailed policy matrix is documented in docs/database-architecture.md.
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.syllabi enable row level security;
alter table public.announcements enable row level security;
alter table public.projects enable row level security;
alter table public.project_releases enable row level security;
alter table public.project_assignments enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.task_assignments enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_submissions enable row level security;
alter table public.submission_versions enable row level security;
alter table public.contribution_logs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.reassignment_requests enable row level security;
alter table public.class_chats enable row level security;
alter table public.group_chats enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.pinned_messages enable row level security;
alter table public.analytics_questions enable row level security;
alter table public.analytics_answers enable row level security;
alter table public.project_health enable row level security;
alter table public.notifications enable row level security;

create policy "Users can view themselves"
on public.users for select
using (id = auth.uid());

create policy "Users can view own profile"
on public.profiles for select
using (user_id = auth.uid());

create policy "Users can update own profile"
on public.profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Class members can view their classes"
on public.classes for select
using (
  professor_id = auth.uid()
  or public.is_class_member(id, auth.uid())
);

create policy "Professors can manage own classes"
on public.classes for all
using (professor_id = auth.uid())
with check (professor_id = auth.uid());

create policy "Class members can view memberships"
on public.class_members for select
using (
  user_id = auth.uid()
  or public.is_class_member(class_id, auth.uid())
);

create policy "Class members can view syllabi"
on public.syllabi for select
using (public.is_class_member(class_id, auth.uid()));

create policy "Class members can view announcements"
on public.announcements for select
using (public.is_class_member(class_id, auth.uid()));

create policy "Class members can view projects"
on public.projects for select
using (public.is_class_member(class_id, auth.uid()));

create policy "Group members can view groups"
on public.groups for select
using (
  public.is_class_member(class_id, auth.uid())
  or public.is_group_member(id, auth.uid())
);

create policy "Group members can view group memberships"
on public.group_members for select
using (public.is_group_member(group_id, auth.uid()) or user_id = auth.uid());

create policy "Users can view own notifications"
on public.notifications for select
using (user_id = auth.uid());

create policy "Users can update own notifications"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Realtime support. Run after tables exist. Supabase may already own this publication.
alter table public.messages replica identity full;
alter table public.notifications replica identity full;
alter table public.tasks replica identity full;
alter table public.subtasks replica identity full;
alter table public.task_comments replica identity full;
alter table public.task_submissions replica identity full;
alter table public.submission_versions replica identity full;
alter table public.contribution_logs replica identity full;
alter table public.project_health replica identity full;
alter table public.activity_logs replica identity full;

do $$
begin
  alter publication supabase_realtime add table
    public.messages,
    public.notifications,
    public.tasks,
    public.subtasks,
    public.task_comments,
    public.task_submissions,
    public.submission_versions,
    public.contribution_logs,
    public.project_health,
    public.activity_logs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
