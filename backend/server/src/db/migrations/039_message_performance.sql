create index if not exists idx_messages_class_chat_created_at_desc
  on public.messages (class_chat_id, created_at desc)
  where class_chat_id is not null;

create index if not exists idx_messages_group_chat_created_at_desc
  on public.messages (group_chat_id, created_at desc)
  where group_chat_id is not null;

create index if not exists idx_attachments_message_owner_created_at
  on public.attachments (owner_id, created_at)
  where owner_type = 'message';

create index if not exists idx_pinned_messages_message_id
  on public.pinned_messages (message_id);

create index if not exists idx_message_deletions_user_message
  on public.message_deletions (user_id, message_id);
