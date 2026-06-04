alter table public.groups
  add column if not exists member_limit int check (member_limit is null or member_limit > 0);

create index if not exists groups_project_member_limit_idx
on public.groups(project_id, member_limit);
