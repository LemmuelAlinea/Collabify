-- Project management fields, enums, indexes, and realtime.

do $$
begin
  create type public.project_type as enum (
    'web_development',
    'mobile_application',
    'system_development',
    'research',
    'capstone',
    'group_programming',
    'individual_programming'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.project_work_mode as enum ('group', 'individual');
exception
  when duplicate_object then null;
end;
$$;

alter table public.projects
  add column if not exists guidelines text,
  add column if not exists project_type public.project_type,
  add column if not exists year_level int check (year_level between 1 and 5),
  add column if not exists work_mode public.project_work_mode not null default 'group',
  add column if not exists member_count int check (member_count > 0),
  add column if not exists start_at timestamptz,
  add column if not exists deadline_at timestamptz,
  add column if not exists visibility_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists reopened_at timestamptz;

update public.projects
set
  guidelines = coalesce(guidelines, objectives),
  deadline_at = coalesce(deadline_at, due_at),
  member_count = coalesce(member_count, max_group_size),
  project_type = coalesce(project_type, 'system_development'::public.project_type)
where guidelines is null
   or deadline_at is null
   or member_count is null
   or project_type is null;

create index if not exists projects_class_visibility_idx on public.projects(class_id, visibility_at, status);
create index if not exists projects_class_deadline_idx on public.projects(class_id, deadline_at);
create index if not exists projects_type_idx on public.projects(project_type);
create index if not exists projects_work_mode_idx on public.projects(work_mode);

alter table public.projects replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.projects;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
