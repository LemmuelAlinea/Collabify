-- Group task system with progress, hierarchy permissions, assignments, and comments.

alter table public.tasks
  add column if not exists progress int not null default 0 check (progress >= 0 and progress <= 100);

create index if not exists tasks_parent_task_idx
on public.tasks(parent_task_id);

create index if not exists tasks_group_due_idx
on public.tasks(group_id, due_at);

create or replace function public.can_view_group_task(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    join public.classes c on c.id = g.class_id
    where g.id = target_group_id
      and (
        c.professor_id = target_user_id
        or public.is_group_member(target_group_id, target_user_id)
      )
  );
$$;

create or replace function public.can_manage_group_task(target_group_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    join public.classes c on c.id = g.class_id
    where g.id = target_group_id
      and (
        c.professor_id = target_user_id
        or public.is_group_member(target_group_id, target_user_id)
      )
  );
$$;

drop policy if exists "Group task viewers can view tasks" on public.tasks;
drop policy if exists "Group task managers can create tasks" on public.tasks;
drop policy if exists "Group task managers can update tasks" on public.tasks;
drop policy if exists "Group task viewers can view task assignments" on public.task_assignments;
drop policy if exists "Group task managers can manage task assignments" on public.task_assignments;
drop policy if exists "Group task viewers can view comments" on public.task_comments;
drop policy if exists "Group task viewers can create comments" on public.task_comments;
drop policy if exists "Comment authors can update comments" on public.task_comments;

create policy "Group task viewers can view tasks"
on public.tasks for select
using (public.can_view_group_task(group_id, auth.uid()));

create policy "Group task managers can create tasks"
on public.tasks for insert
with check (
  created_by = auth.uid()
  and public.can_manage_group_task(group_id, auth.uid())
);

create policy "Group task managers can update tasks"
on public.tasks for update
using (public.can_manage_group_task(group_id, auth.uid()))
with check (public.can_manage_group_task(group_id, auth.uid()));

create policy "Group task viewers can view task assignments"
on public.task_assignments for select
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_view_group_task(t.group_id, auth.uid())
  )
);

create policy "Group task managers can manage task assignments"
on public.task_assignments for all
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_manage_group_task(t.group_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_manage_group_task(t.group_id, auth.uid())
  )
);

create policy "Group task viewers can view comments"
on public.task_comments for select
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_view_group_task(t.group_id, auth.uid())
  )
);

create policy "Group task viewers can create comments"
on public.task_comments for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and public.can_view_group_task(t.group_id, auth.uid())
  )
);

create policy "Comment authors can update comments"
on public.task_comments for update
using (author_id = auth.uid())
with check (author_id = auth.uid());
