-- Contribution tracking scoring support.

create index if not exists contribution_logs_event_key_idx
on public.contribution_logs ((metadata ->> 'eventKey'));

create unique index if not exists contribution_logs_unique_event_key_idx
on public.contribution_logs ((metadata ->> 'eventKey'))
where metadata ? 'eventKey';

create index if not exists contribution_logs_type_logged_idx
on public.contribution_logs(contribution_type, logged_at desc);

alter table public.contribution_logs replica identity full;

create or replace function public.log_reassignment_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.contribution_logs (
      project_id,
      group_id,
      user_id,
      task_id,
      contribution_type,
      description,
      points,
      metadata
    )
    values (
      new.project_id,
      coalesce(new.current_group_id, new.requested_group_id),
      new.requested_by,
      new.task_id,
      'reassignment_request',
      'Requested reassignment',
      4,
      jsonb_build_object('eventKey', 'reassignment-request:' || new.id, 'reassignmentId', new.id)
    )
    on conflict do nothing;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'approved' then
    insert into public.contribution_logs (
      project_id,
      group_id,
      user_id,
      task_id,
      contribution_type,
      description,
      points,
      metadata
    )
    values (
      new.project_id,
      coalesce(new.requested_group_id, new.current_group_id),
      coalesce(new.requested_assignee_id, new.requested_by),
      new.task_id,
      'reassignment_approved',
      'Approved reassignment completed',
      6,
      jsonb_build_object('eventKey', 'reassignment-approved:' || new.id, 'reassignmentId', new.id)
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists track_reassignment_contribution on public.reassignment_requests;

create trigger track_reassignment_contribution
after insert or update on public.reassignment_requests
for each row execute function public.log_reassignment_contribution();

do $$
begin
  alter publication supabase_realtime add table public.contribution_logs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
