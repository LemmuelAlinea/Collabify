create or replace function public.handle_submission_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  submission_row record;
begin
  if tg_table_name = 'submission_versions' then
    select ts.id, ts.task_id, ts.submitted_by, t.title, t.project_id, t.group_id, g.class_id
    into submission_row
    from public.task_submissions ts
    join public.tasks t on t.id = ts.task_id
    left join public.groups g on g.id = t.group_id
    where ts.id = new.submission_id;

    perform public.log_activity(new.uploaded_by, submission_row.class_id, submission_row.project_id, submission_row.group_id, 'submission_version', new.id, 'submission_version_uploaded', jsonb_build_object('version', new.version));
    perform public.notify_group_members(submission_row.group_id, new.uploaded_by, 'submission', 'medium', 'Version ' || new.version || ' uploaded', submission_row.title, 'submission_version', new.id, submission_row.class_id, submission_row.project_id, submission_row.group_id, submission_row.task_id, '/submissions', '{}'::jsonb);
  elsif tg_table_name = 'task_submissions' and tg_op = 'UPDATE' and new.status is distinct from old.status then
    select ts.id, ts.task_id, ts.submitted_by, t.title, t.project_id, t.group_id, g.class_id
    into submission_row
    from public.task_submissions ts
    join public.tasks t on t.id = ts.task_id
    left join public.groups g on g.id = t.group_id
    where ts.id = new.id;

    perform public.log_activity(new.reviewed_by, submission_row.class_id, submission_row.project_id, submission_row.group_id, 'submission', new.id, 'submission_' || new.status, jsonb_build_object('status', new.status));
    perform public.notify_user(new.submitted_by, 'submission', 'high', 'Submission ' || new.status, submission_row.title, 'submission', new.id, submission_row.class_id, submission_row.project_id, submission_row.group_id, submission_row.task_id, '/submissions', '{}'::jsonb);
  end if;

  return new;
end;
$$;
