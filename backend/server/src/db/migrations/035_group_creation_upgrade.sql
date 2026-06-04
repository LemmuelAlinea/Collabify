alter table public.groups
  add column if not exists creation_method text not null default 'manual',
  add column if not exists formation_status text;

update public.groups
set creation_method = coalesce(creation_method, 'manual')
where creation_method is null;

create index if not exists groups_project_creation_method_idx
on public.groups(project_id, creation_method, created_at desc);

create index if not exists groups_class_creation_method_idx
on public.groups(class_id, creation_method, created_at desc);
