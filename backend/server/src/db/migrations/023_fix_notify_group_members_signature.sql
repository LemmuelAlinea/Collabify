create or replace function public.notify_group_members(
  target_group_id uuid,
  target_actor_id uuid,
  target_type public.notification_type,
  target_priority public.notification_priority,
  target_title text,
  target_body text,
  target_entity_type text,
  target_entity_id uuid,
  target_class_id uuid default null,
  target_project_id uuid default null,
  target_context_group_id uuid default null,
  target_task_id uuid default null,
  target_action_url text default null,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
begin
  for recipient in
    select gm.user_id
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.status = 'active'
      and gm.user_id <> coalesce(target_actor_id, '00000000-0000-0000-0000-000000000000'::uuid)
  loop
    perform public.notify_user(
      recipient.user_id,
      target_type,
      target_priority,
      target_title,
      target_body,
      target_entity_type,
      target_entity_id,
      target_class_id,
      target_project_id,
      coalesce(target_context_group_id, target_group_id),
      target_task_id,
      target_action_url,
      target_metadata
    );
  end loop;
end;
$$;

