do $$
begin
  create type public.notification_priority as enum ('low', 'medium', 'high', 'critical');
exception
  when duplicate_object then null;
end;
$$;

alter type public.notification_type add value if not exists 'class';
alter type public.notification_type add value if not exists 'project';
alter type public.notification_type add value if not exists 'group';
alter type public.notification_type add value if not exists 'contribution';

alter table public.notifications
  add column if not exists priority public.notification_priority not null default 'medium',
  add column if not exists class_id uuid references public.classes(id) on delete cascade,
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists group_id uuid references public.groups(id) on delete cascade,
  add column if not exists task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists action_url text;

create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (notification_id, user_id)
);

create index if not exists notifications_user_type_created_idx
on public.notifications(user_id, type, created_at desc);

create index if not exists notifications_context_idx
on public.notifications(class_id, project_id, group_id, task_id);

create index if not exists notification_reads_user_idx
on public.notification_reads(user_id, read_at desc);

alter table public.notification_reads enable row level security;

create policy "Users can view own notification reads"
on public.notification_reads for select
using (user_id = auth.uid());

create policy "Users can manage own notification reads"
on public.notification_reads for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Class members can view related activity"
on public.activity_logs for select
using (
  actor_id = auth.uid()
  or (class_id is not null and public.is_class_member(class_id, auth.uid()))
  or (group_id is not null and public.is_group_member(group_id, auth.uid()))
);

alter table public.notifications replica identity full;
alter table public.notification_reads replica identity full;
alter table public.activity_logs replica identity full;

create or replace function public.notify_user(
  target_user_id uuid,
  target_type public.notification_type,
  target_priority public.notification_priority,
  target_title text,
  target_body text,
  target_entity_type text,
  target_entity_id uuid,
  target_class_id uuid default null,
  target_project_id uuid default null,
  target_group_id uuid default null,
  target_task_id uuid default null,
  target_action_url text default null,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null then
    return;
  end if;

  insert into public.notifications (
    user_id,
    type,
    priority,
    title,
    body,
    entity_type,
    entity_id,
    class_id,
    project_id,
    group_id,
    task_id,
    action_url,
    metadata
  )
  values (
    target_user_id,
    target_type,
    target_priority,
    target_title,
    target_body,
    target_entity_type,
    target_entity_id,
    target_class_id,
    target_project_id,
    target_group_id,
    target_task_id,
    target_action_url,
    coalesce(target_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.log_activity(
  target_actor_id uuid,
  target_class_id uuid,
  target_project_id uuid,
  target_group_id uuid,
  target_entity_type text,
  target_entity_id uuid,
  target_action text,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (
    actor_id,
    class_id,
    project_id,
    group_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  values (
    target_actor_id,
    target_class_id,
    target_project_id,
    target_group_id,
    target_entity_type,
    target_entity_id,
    target_action,
    coalesce(target_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.notify_class_members(
  target_class_id uuid,
  target_actor_id uuid,
  target_type public.notification_type,
  target_priority public.notification_priority,
  target_title text,
  target_body text,
  target_entity_type text,
  target_entity_id uuid,
  target_project_id uuid default null,
  target_group_id uuid default null,
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
    select cm.user_id
    from public.class_members cm
    where cm.class_id = target_class_id
      and cm.status = 'active'
      and cm.user_id <> coalesce(target_actor_id, '00000000-0000-0000-0000-000000000000'::uuid)
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
      target_group_id,
      target_task_id,
      target_action_url,
      target_metadata
    );
  end loop;
end;
$$;

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

create or replace function public.handle_class_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.professor_id, new.id, null, null, 'class', new.id, 'class_created', jsonb_build_object('title', new.title));
  elsif tg_op = 'UPDATE' then
    perform public.log_activity(new.professor_id, new.id, null, null, 'class', new.id, case when new.is_archived and not old.is_archived then 'class_archived' when not new.is_archived and old.is_archived then 'class_restored' else 'class_updated' end, jsonb_build_object('title', new.title));
    perform public.notify_class_members(new.id, new.professor_id, 'class', 'medium', 'Class updated', new.title, 'class', new.id, null, null, null, '/classes/' || new.id, jsonb_build_object('action', 'class_updated'));
  end if;
  return new;
end;
$$;

create or replace function public.handle_class_member_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  class_row record;
  member_name text;
begin
  select c.id, c.title, c.professor_id into class_row from public.classes c where c.id = new.class_id;
  select p.display_name into member_name from public.profiles p where p.user_id = new.user_id;

  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status = 'active' and old.status <> 'active') then
    perform public.log_activity(new.user_id, new.class_id, null, null, 'class_member', new.id, 'student_joined_class', jsonb_build_object('name', member_name));
    perform public.notify_user(class_row.professor_id, 'class', 'medium', coalesce(member_name, 'Student') || ' joined ' || class_row.title, null, 'class', new.class_id, new.class_id, null, null, null, '/professor/classes/' || new.class_id, '{}'::jsonb);
  elsif tg_op = 'UPDATE' and new.status = 'removed' and old.status <> 'removed' then
    perform public.log_activity(new.user_id, new.class_id, null, null, 'class_member', new.id, 'student_left_class', jsonb_build_object('name', member_name));
    perform public.notify_user(class_row.professor_id, 'class', 'medium', coalesce(member_name, 'Student') || ' left ' || class_row.title, null, 'class', new.class_id, new.class_id, null, null, null, '/professor/classes/' || new.class_id, '{}'::jsonb);
  end if;

  return new;
end;
$$;

create or replace function public.handle_announcement_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.author_id, new.class_id, null, null, 'announcement', new.id, 'announcement_created', jsonb_build_object('title', new.title));
    perform public.notify_class_members(new.class_id, new.author_id, 'announcement', 'medium', 'New announcement posted', new.title, 'announcement', new.id, null, null, null, '/classes/' || new.class_id, '{}'::jsonb);
  elsif tg_op = 'UPDATE' then
    perform public.log_activity(new.author_id, new.class_id, null, null, 'announcement', new.id, case when new.is_pinned and not old.is_pinned then 'announcement_pinned' when not new.is_pinned and old.is_pinned then 'announcement_unpinned' else 'announcement_updated' end, jsonb_build_object('title', new.title));
    perform public.notify_class_members(new.class_id, new.author_id, 'announcement', 'low', 'Announcement updated', new.title, 'announcement', new.id, null, null, null, '/classes/' || new.class_id, '{}'::jsonb);
  end if;
  return new;
end;
$$;

create or replace function public.handle_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  group_row record;
begin
  select g.id, g.class_id, g.project_id into group_row from public.groups g where g.id = new.group_id;

  if tg_op = 'INSERT' then
    perform public.log_activity(new.created_by, group_row.class_id, new.project_id, new.group_id, 'task', new.id, 'task_created', jsonb_build_object('title', new.title));
    perform public.notify_group_members(
      new.group_id,
      new.created_by,
      'task'::public.notification_type,
      'medium'::public.notification_priority,
      'Task created',
      new.title,
      'task',
      new.id,
      group_row.class_id,
      new.project_id,
      new.group_id,
      new.id,
      '/tasks',
      '{}'::jsonb
    );
  elsif tg_op = 'UPDATE' then
    perform public.log_activity(new.created_by, group_row.class_id, new.project_id, new.group_id, 'task', new.id, case when new.status = 'done' and old.status <> 'done' then 'task_completed' when new.due_at is distinct from old.due_at then 'task_deadline_changed' else 'task_updated' end, jsonb_build_object('title', new.title));
    perform public.notify_group_members(
      new.group_id,
      new.created_by,
      'task'::public.notification_type,
      (case when new.due_at is distinct from old.due_at then 'high' else 'low' end)::public.notification_priority,
      'Task updated',
      new.title,
      'task',
      new.id,
      group_row.class_id,
      new.project_id,
      new.group_id,
      new.id,
      '/tasks',
      '{}'::jsonb
    );
  end if;

  return new;
end;
$$;

create or replace function public.handle_task_assignment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row record;
begin
  select t.id, t.title, t.project_id, t.group_id, g.class_id
  into task_row
  from public.tasks t
  left join public.groups g on g.id = t.group_id
  where t.id = new.task_id;

  perform public.log_activity(new.assigned_by, task_row.class_id, task_row.project_id, task_row.group_id, 'task_assignment', new.id, 'task_assigned', jsonb_build_object('task', task_row.title, 'assigneeId', new.assignee_id));
  perform public.notify_user(new.assignee_id, 'task', 'medium', 'You were assigned to ' || task_row.title, null, 'task', new.task_id, task_row.class_id, task_row.project_id, task_row.group_id, new.task_id, '/tasks', '{}'::jsonb);
  return new;
end;
$$;

create or replace function public.handle_task_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row record;
begin
  select t.id, t.title, t.project_id, t.group_id, g.class_id
  into task_row
  from public.tasks t
  left join public.groups g on g.id = t.group_id
  where t.id = new.task_id;

  perform public.log_activity(new.author_id, task_row.class_id, task_row.project_id, task_row.group_id, 'task_comment', new.id, 'task_commented', jsonb_build_object('task', task_row.title));
  perform public.notify_group_members(task_row.group_id, new.author_id, 'task', 'low', 'New comment on ' || task_row.title, left(new.body, 160), 'task', new.task_id, task_row.class_id, task_row.project_id, task_row.group_id, new.task_id, '/tasks', '{}'::jsonb);
  return new;
end;
$$;

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
    select cc.id, cc.class_id into class_chat from public.class_chats cc where cc.id = new.class_chat_id;
    perform public.notify_class_members(class_chat.class_id, new.sender_id, 'message', 'low', 'New class message', left(coalesce(new.body, 'Attachment received'), 160), 'message', new.id, class_chat.class_id, null, null, null, '/messages', '{}'::jsonb);
    perform public.log_activity(new.sender_id, class_chat.class_id, null, null, 'message', new.id, 'class_message_sent', '{}'::jsonb);
  else
    select gc.id, gc.group_id, g.class_id, g.project_id into group_chat from public.group_chats gc join public.groups g on g.id = gc.group_id where gc.id = new.group_chat_id;
    perform public.notify_group_members(group_chat.group_id, new.sender_id, 'message', 'low', 'New group message', left(coalesce(new.body, 'Attachment received'), 160), 'message', new.id, group_chat.class_id, group_chat.project_id, group_chat.group_id, null, '/messages', '{}'::jsonb);
    perform public.log_activity(new.sender_id, group_chat.class_id, group_chat.project_id, group_chat.group_id, 'message', new.id, 'group_message_sent', '{}'::jsonb);
  end if;

  for mentioned in
    select p.user_id, p.display_name
    from public.profiles p
    where new.body ilike '%@' || p.display_name || '%'
  loop
    perform public.notify_user(mentioned.user_id, 'message', 'high', 'You were mentioned', left(coalesce(new.body, ''), 160), 'message', new.id, coalesce(class_chat.class_id, group_chat.class_id), group_chat.project_id, group_chat.group_id, null, '/messages', jsonb_build_object('mention', true));
  end loop;

  return new;
end;
$$;

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

drop trigger if exists notifications_class_activity on public.classes;
create trigger notifications_class_activity after insert or update on public.classes for each row execute function public.handle_class_activity();

drop trigger if exists notifications_class_member_activity on public.class_members;
create trigger notifications_class_member_activity after insert or update on public.class_members for each row execute function public.handle_class_member_activity();

drop trigger if exists notifications_announcement_activity on public.announcements;
create trigger notifications_announcement_activity after insert or update on public.announcements for each row execute function public.handle_announcement_activity();

drop trigger if exists notifications_task_activity on public.tasks;
create trigger notifications_task_activity after insert or update on public.tasks for each row execute function public.handle_task_activity();

drop trigger if exists notifications_task_assignment_activity on public.task_assignments;
create trigger notifications_task_assignment_activity after insert on public.task_assignments for each row execute function public.handle_task_assignment_activity();

drop trigger if exists notifications_task_comment_activity on public.task_comments;
create trigger notifications_task_comment_activity after insert on public.task_comments for each row execute function public.handle_task_comment_activity();

drop trigger if exists notifications_message_activity on public.messages;
create trigger notifications_message_activity after insert on public.messages for each row execute function public.handle_message_activity();

drop trigger if exists notifications_submission_status_activity on public.task_submissions;
create trigger notifications_submission_status_activity after update on public.task_submissions for each row execute function public.handle_submission_activity();

drop trigger if exists notifications_submission_version_activity on public.submission_versions;
create trigger notifications_submission_version_activity after insert on public.submission_versions for each row execute function public.handle_submission_activity();

drop trigger if exists notifications_reassignment_activity on public.reassignment_requests;
create trigger notifications_reassignment_activity after insert or update on public.reassignment_requests for each row execute function public.handle_reassignment_activity();

do $$
begin
  alter publication supabase_realtime add table
    public.notifications,
    public.notification_reads,
    public.activity_logs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
