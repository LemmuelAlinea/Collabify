create or replace function public.handle_message_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  class_chat record;
  group_chat record;
  mentioned record;
begin
  if new.scope = 'class' then
    select cc.id, cc.class_id
    into class_chat
    from public.class_chats cc
    where cc.id = new.class_chat_id;

    perform public.notify_class_members(
      class_chat.class_id,
      new.sender_id,
      'message'::public.notification_type,
      'low'::public.notification_priority,
      'New class message',
      left(coalesce(new.body, 'Attachment received'), 160),
      'message',
      new.id,
      null,
      null,
      null,
      '/messages',
      '{}'::jsonb
    );

    perform public.log_activity(
      new.sender_id,
      class_chat.class_id,
      null,
      null,
      'message',
      new.id,
      'class_message_sent',
      '{}'::jsonb
    );
  else
    select gc.id, gc.group_id, g.class_id, g.project_id
    into group_chat
    from public.group_chats gc
    join public.groups g on g.id = gc.group_id
    where gc.id = new.group_chat_id;

    perform public.notify_group_members(
      group_chat.group_id,
      new.sender_id,
      'message'::public.notification_type,
      'low'::public.notification_priority,
      'New group message',
      left(coalesce(new.body, 'Attachment received'), 160),
      'message',
      new.id,
      group_chat.class_id,
      group_chat.project_id,
      group_chat.group_id,
      null,
      '/messages',
      '{}'::jsonb
    );

    perform public.log_activity(
      new.sender_id,
      group_chat.class_id,
      group_chat.project_id,
      group_chat.group_id,
      'message',
      new.id,
      'group_message_sent',
      '{}'::jsonb
    );
  end if;

  for mentioned in
    select p.user_id, p.display_name
    from public.profiles p
    where new.body ilike '%@' || p.display_name || '%'
  loop
    perform public.notify_user(
      mentioned.user_id,
      'message'::public.notification_type,
      'high'::public.notification_priority,
      'You were mentioned',
      left(coalesce(new.body, ''), 160),
      'message',
      new.id,
      coalesce(class_chat.class_id, group_chat.class_id),
      group_chat.project_id,
      group_chat.group_id,
      null,
      '/messages',
      jsonb_build_object('mention', true)
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notifications_message_activity on public.messages;
create trigger notifications_message_activity
after insert on public.messages
for each row execute function public.handle_message_activity();
