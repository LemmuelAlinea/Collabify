-- Submission versioning, final-version selection, and review permissions.

create unique index if not exists task_submissions_task_group_unique_idx
on public.task_submissions(task_id, group_id)
where group_id is not null;

create index if not exists task_submissions_group_status_idx
on public.task_submissions(group_id, status);

create index if not exists submission_versions_uploaded_by_idx
on public.submission_versions(uploaded_by);

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload own submission files" on storage.objects;

create policy "Authenticated users can upload own submission files"
on storage.objects for insert
with check (
  bucket_id = 'submissions'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create or replace function public.can_view_task_submission(target_submission_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_submissions s
    join public.tasks t on t.id = s.task_id
    join public.groups g on g.id = s.group_id
    join public.classes c on c.id = g.class_id
    where s.id = target_submission_id
      and (
        c.professor_id = target_user_id
        or public.is_group_member(t.group_id, target_user_id)
      )
  );
$$;

create or replace function public.can_manage_task_submission(target_submission_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_submissions s
    join public.tasks t on t.id = s.task_id
    where s.id = target_submission_id
      and public.is_group_member(t.group_id, target_user_id)
  );
$$;

create or replace function public.can_review_task_submission(target_submission_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_submissions s
    join public.groups g on g.id = s.group_id
    join public.classes c on c.id = g.class_id
    where s.id = target_submission_id
      and c.professor_id = target_user_id
  );
$$;

drop policy if exists "Submission viewers can view submissions" on public.task_submissions;
drop policy if exists "Group members can create submissions" on public.task_submissions;
drop policy if exists "Submission managers can update submissions" on public.task_submissions;
drop policy if exists "Submission viewers can view versions" on public.submission_versions;
drop policy if exists "Group members can upload submission versions" on public.submission_versions;

create policy "Submission viewers can view submissions"
on public.task_submissions for select
using (
  exists (
    select 1
    from public.tasks t
    join public.groups g on g.id = task_submissions.group_id
    join public.classes c on c.id = g.class_id
    where t.id = task_submissions.task_id
      and (
        c.professor_id = auth.uid()
        or public.is_group_member(t.group_id, auth.uid())
      )
  )
);

create policy "Group members can create submissions"
on public.task_submissions for insert
with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_submissions.task_id
      and t.group_id = task_submissions.group_id
      and public.is_group_member(t.group_id, auth.uid())
  )
);

create policy "Submission managers can update submissions"
on public.task_submissions for update
using (
  public.can_manage_task_submission(id, auth.uid())
  or public.can_review_task_submission(id, auth.uid())
)
with check (
  public.can_manage_task_submission(id, auth.uid())
  or public.can_review_task_submission(id, auth.uid())
);

create policy "Submission viewers can view versions"
on public.submission_versions for select
using (public.can_view_task_submission(submission_id, auth.uid()));

create policy "Group members can upload submission versions"
on public.submission_versions for insert
with check (
  uploaded_by = auth.uid()
  and public.can_manage_task_submission(submission_id, auth.uid())
);
