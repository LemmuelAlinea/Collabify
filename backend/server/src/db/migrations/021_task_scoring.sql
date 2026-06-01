alter table public.tasks
  add column if not exists score_weight numeric(6,2) check (score_weight >= 0);

create index if not exists tasks_group_score_idx
on public.tasks(group_id, parent_task_id, score_weight);
