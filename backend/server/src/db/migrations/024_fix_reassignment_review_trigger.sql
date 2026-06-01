create or replace function public.handle_reassignment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.requested_by, new.class_id, new.project_id, new.current_group_id, 'reassignment', new.id, 'reassignment_requested', '{}'::jsonb);
    perform public.notify_class_members(
      new.class_id,
      new.requested_by,
      'reassignment'::public.notification_type,
      'medium'::public.notification_priority,
      'Reassignment request submitted',
      new.reason,
      'reassignment',
      new.id,
      new.project_id,
      new.current_group_id,
      new.task_id,
      '/reassignments',
      '{}'::jsonb
    );
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.log_activity(new.reviewed_by, new.class_id, new.project_id, new.current_group_id, 'reassignment', new.id, 'reassignment_' || new.status, '{}'::jsonb);
    perform public.notify_user(
      new.requested_by,
      'reassignment'::public.notification_type,
      (case when new.status = 'approved' then 'high' else 'medium' end)::public.notification_priority,
      'Reassignment request ' || new.status,
      new.review_notes,
      'reassignment',
      new.id,
      new.class_id,
      new.project_id,
      new.current_group_id,
      new.task_id,
      '/reassignments',
      '{}'::jsonb
    );
  end if;

  return new;
end;
$$;
