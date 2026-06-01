-- Project release functionality for one-or-many class assignment.

create table if not exists public.project_class_releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  released_by uuid not null references public.users(id) on delete restrict,
  start_at timestamptz not null,
  deadline_at timestamptz not null,
  release_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, class_id)
);

create index if not exists project_class_releases_project_idx
on public.project_class_releases(project_id);

create index if not exists project_class_releases_class_release_idx
on public.project_class_releases(class_id, release_at, is_active);

create trigger set_project_class_releases_updated_at
before update on public.project_class_releases
for each row execute function public.set_updated_at();

insert into public.project_class_releases (
  project_id,
  class_id,
  released_by,
  start_at,
  deadline_at,
  release_at,
  is_active
)
select
  p.id,
  p.class_id,
  p.created_by,
  coalesce(p.start_at, p.created_at),
  coalesce(p.deadline_at, p.due_at, p.created_at),
  coalesce(p.visibility_at, p.created_at),
  p.status <> 'archived'
from public.projects p
where p.class_id is not null
on conflict (project_id, class_id) do nothing;

alter table public.project_class_releases enable row level security;
alter table public.project_class_releases replica identity full;

create policy "Class members can view project releases"
on public.project_class_releases for select
using (public.is_class_member(class_id, auth.uid()));

create policy "Professors can manage project releases for own classes"
on public.project_class_releases for all
using (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.professor_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.professor_id = auth.uid()
  )
);

do $$
begin
  alter publication supabase_realtime add table public.project_class_releases;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
