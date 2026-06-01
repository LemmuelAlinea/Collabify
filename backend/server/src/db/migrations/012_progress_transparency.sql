-- Progress transparency indexes and realtime support.

create index if not exists tasks_project_group_status_progress_idx
on public.tasks(project_id, group_id, status, progress);

create index if not exists task_assignments_assignee_task_idx
on public.task_assignments(assignee_id, task_id);

create index if not exists contribution_logs_user_project_group_idx
on public.contribution_logs(user_id, project_id, group_id);

alter table public.tasks replica identity full;
alter table public.task_assignments replica identity full;
alter table public.contribution_logs replica identity full;
alter table public.task_submissions replica identity full;

do $$
begin
  alter publication supabase_realtime add table
    public.tasks,
    public.task_assignments,
    public.contribution_logs,
    public.task_submissions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
