-- Group management permissions and one-active-group-per-project enforcement.

create or replace function public.enforce_one_active_group_per_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project_id uuid;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select g.project_id
  into target_project_id
  from public.groups g
  where g.id = new.group_id;

  if target_project_id is null then
    return new;
  end if;

  if exists (
    select 1
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.user_id = new.user_id
      and gm.status = 'active'
      and g.project_id = target_project_id
      and gm.id is distinct from new.id
  ) then
    raise exception 'Student already belongs to a group for this project';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_one_active_group_per_project_trigger on public.group_members;
create trigger enforce_one_active_group_per_project_trigger
before insert or update of group_id, user_id, status on public.group_members
for each row execute function public.enforce_one_active_group_per_project();

create index if not exists group_members_active_user_idx
on public.group_members(user_id, status);

create index if not exists groups_project_idx
on public.groups(project_id);

create or replace function public.can_student_use_project_group(
  target_project_id uuid,
  target_class_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.project_class_releases pcr on pcr.project_id = p.id
    where p.id = target_project_id
      and p.work_mode = 'group'
      and p.status <> 'archived'
      and pcr.class_id = target_class_id
      and pcr.is_active = true
      and pcr.release_at <= now()
      and public.is_class_member(target_class_id, target_user_id)
  );
$$;

create or replace function public.is_group_leader(target_group_id uuid, target_user_id uuid)
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
      and gm.is_leader = true
      and gm.status = 'active'
  );
$$;

drop policy if exists "Group members can view groups" on public.groups;
drop policy if exists "Group members can view group memberships" on public.group_members;

create policy "Students see own groups and professors see class groups"
on public.groups for select
using (
  public.is_group_member(id, auth.uid())
  or exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.professor_id = auth.uid()
  )
);

create policy "Students create groups in visible classes"
on public.groups for insert
with check (
  public.can_student_use_project_group(project_id, class_id, auth.uid())
  and created_by = auth.uid()
);

create policy "Professors and leaders update groups"
on public.groups for update
using (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.professor_id = auth.uid()
  )
  or public.is_group_leader(id, auth.uid())
)
with check (
  exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.professor_id = auth.uid()
  )
  or public.is_group_leader(id, auth.uid())
);

create policy "Students see own group memberships and professors see class memberships"
on public.group_members for select
using (
  user_id = auth.uid()
  or public.is_group_member(group_id, auth.uid())
  or exists (
    select 1
    from public.groups g
    join public.classes c on c.id = g.class_id
    where g.id = group_id
      and c.professor_id = auth.uid()
  )
);

create policy "Students join groups"
on public.group_members for insert
with check (
  user_id = auth.uid()
  and is_leader = false
  and status = 'active'
  and exists (
    select 1
    from public.groups g
    where g.id = group_id
      and g.is_locked = false
      and public.can_student_use_project_group(g.project_id, g.class_id, auth.uid())
  )
);

create policy "Professors and leaders manage memberships"
on public.group_members for update
using (
  exists (
    select 1
    from public.groups g
    join public.classes c on c.id = g.class_id
    where g.id = group_id
      and c.professor_id = auth.uid()
  )
  or public.is_group_leader(group_id, auth.uid())
)
with check (
  exists (
    select 1
    from public.groups g
    join public.classes c on c.id = g.class_id
    where g.id = group_id
      and c.professor_id = auth.uid()
  )
  or public.is_group_leader(group_id, auth.uid())
);
