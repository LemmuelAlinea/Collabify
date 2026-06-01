do $migration$
declare
  item record;
begin
  for item in
    select *
    from (values
      ('idx_users_role_active_seen', 'users', array['role', 'is_active', 'last_seen_at']::text[], $$create index if not exists idx_users_role_active_seen on public.users(role, is_active, last_seen_at desc)$$),

      ('idx_classes_professor_archived_created', 'classes', array['professor_id', 'is_archived', 'created_at']::text[], $$create index if not exists idx_classes_professor_archived_created on public.classes(professor_id, is_archived, created_at desc)$$),
      ('idx_classes_professor_section_created', 'classes', array['professor_id', 'section', 'created_at']::text[], $$create index if not exists idx_classes_professor_section_created on public.classes(professor_id, section, created_at desc)$$),
      ('idx_class_members_user_status_class', 'class_members', array['user_id', 'status', 'class_id']::text[], $$create index if not exists idx_class_members_user_status_class on public.class_members(user_id, status, class_id)$$),
      ('idx_class_members_class_status_role_user', 'class_members', array['class_id', 'status', 'role', 'user_id']::text[], $$create index if not exists idx_class_members_class_status_role_user on public.class_members(class_id, status, role, user_id)$$),

      ('idx_syllabi_class_active_created', 'syllabi', array['class_id', 'is_active', 'created_at']::text[], $$create index if not exists idx_syllabi_class_active_created on public.syllabi(class_id, is_active, created_at desc)$$),
      ('idx_syllabi_uploaded_active_created', 'syllabi', array['uploaded_by', 'is_active', 'created_at']::text[], $$create index if not exists idx_syllabi_uploaded_active_created on public.syllabi(uploaded_by, is_active, created_at desc)$$),

      ('idx_announcements_class_pinned_created', 'announcements', array['class_id', 'is_pinned', 'created_at']::text[], $$create index if not exists idx_announcements_class_pinned_created on public.announcements(class_id, is_pinned desc, created_at desc)$$),
      ('idx_announcements_author_created', 'announcements', array['author_id', 'created_at']::text[], $$create index if not exists idx_announcements_author_created on public.announcements(author_id, created_at desc)$$),
      ('idx_attachments_announcement_owner_created', 'attachments', array['owner_type', 'owner_id', 'created_at']::text[], $$create index if not exists idx_attachments_announcement_owner_created on public.attachments(owner_id, created_at desc) where owner_type = 'announcement'$$),

      ('idx_projects_created_status_created', 'projects', array['created_by', 'status', 'created_at']::text[], $$create index if not exists idx_projects_created_status_created on public.projects(created_by, status, created_at desc)$$),
      ('idx_projects_class_status_deadline', 'projects', array['class_id', 'status', 'deadline_at']::text[], $$create index if not exists idx_projects_class_status_deadline on public.projects(class_id, status, deadline_at)$$),
      ('idx_projects_class_archived_created', 'projects', array['class_id', 'archived_at', 'created_at']::text[], $$create index if not exists idx_projects_class_archived_created on public.projects(class_id, archived_at, created_at desc)$$),
      ('idx_project_class_releases_class_active_deadline', 'project_class_releases', array['class_id', 'is_active', 'deadline_at']::text[], $$create index if not exists idx_project_class_releases_class_active_deadline on public.project_class_releases(class_id, is_active, deadline_at)$$),
      ('idx_project_class_releases_project_active_class', 'project_class_releases', array['project_id', 'is_active', 'class_id']::text[], $$create index if not exists idx_project_class_releases_project_active_class on public.project_class_releases(project_id, is_active, class_id)$$),

      ('idx_groups_class_created', 'groups', array['class_id', 'created_at']::text[], $$create index if not exists idx_groups_class_created on public.groups(class_id, created_at desc)$$),
      ('idx_groups_project_created', 'groups', array['project_id', 'created_at']::text[], $$create index if not exists idx_groups_project_created on public.groups(project_id, created_at desc)$$),
      ('idx_groups_class_project_locked', 'groups', array['class_id', 'project_id', 'is_locked']::text[], $$create index if not exists idx_groups_class_project_locked on public.groups(class_id, project_id, is_locked)$$),
      ('idx_group_members_group_status_leader_user', 'group_members', array['group_id', 'status', 'is_leader', 'user_id']::text[], $$create index if not exists idx_group_members_group_status_leader_user on public.group_members(group_id, status, is_leader, user_id)$$),
      ('idx_group_members_user_status_group', 'group_members', array['user_id', 'status', 'group_id']::text[], $$create index if not exists idx_group_members_user_status_group on public.group_members(user_id, status, group_id)$$),

      ('idx_tasks_group_active_position_created', 'tasks', array['group_id', 'position', 'created_at', 'archived_at']::text[], $$create index if not exists idx_tasks_group_active_position_created on public.tasks(group_id, position, created_at desc) where archived_at is null$$),
      ('idx_tasks_project_active_due', 'tasks', array['project_id', 'due_at', 'archived_at']::text[], $$create index if not exists idx_tasks_project_active_due on public.tasks(project_id, due_at) where archived_at is null and due_at is not null$$),
      ('idx_tasks_group_status_due_active', 'tasks', array['group_id', 'status', 'due_at', 'archived_at']::text[], $$create index if not exists idx_tasks_group_status_due_active on public.tasks(group_id, status, due_at) where archived_at is null$$),
      ('idx_tasks_parent_position_active', 'tasks', array['parent_task_id', 'position', 'archived_at']::text[], $$create index if not exists idx_tasks_parent_position_active on public.tasks(parent_task_id, position) where archived_at is null$$),
      ('idx_tasks_created_by_created', 'tasks', array['created_by', 'created_at']::text[], $$create index if not exists idx_tasks_created_by_created on public.tasks(created_by, created_at desc)$$),
      ('idx_task_groups_group_task', 'task_groups', array['group_id', 'task_id']::text[], $$create index if not exists idx_task_groups_group_task on public.task_groups(group_id, task_id)$$),
      ('idx_task_progress_group_status_updated', 'task_progress', array['group_id', 'status', 'updated_at']::text[], $$create index if not exists idx_task_progress_group_status_updated on public.task_progress(group_id, status, updated_at desc)$$),
      ('idx_task_progress_task_group_status', 'task_progress', array['task_id', 'group_id', 'status']::text[], $$create index if not exists idx_task_progress_task_group_status on public.task_progress(task_id, group_id, status)$$),
      ('idx_task_weights_task_group', 'task_weights', array['task_id', 'group_id']::text[], $$create index if not exists idx_task_weights_task_group on public.task_weights(task_id, group_id)$$),
      ('idx_member_progress_group_member', 'member_progress', array['group_id', 'member_id']::text[], $$create index if not exists idx_member_progress_group_member on public.member_progress(group_id, member_id)$$),
      ('idx_member_progress_member_completed', 'member_progress', array['member_id', 'is_completed', 'calculated_at']::text[], $$create index if not exists idx_member_progress_member_completed on public.member_progress(member_id, is_completed, calculated_at desc)$$),
      ('idx_group_progress_group_project', 'group_progress', array['group_id', 'project_id']::text[], $$create index if not exists idx_group_progress_group_project on public.group_progress(group_id, project_id)$$),
      ('idx_task_recalculations_group_created', 'task_recalculations', array['group_id', 'created_at']::text[], $$create index if not exists idx_task_recalculations_group_created on public.task_recalculations(group_id, created_at desc)$$),
      ('idx_task_recalculations_project_created', 'task_recalculations', array['project_id', 'created_at']::text[], $$create index if not exists idx_task_recalculations_project_created on public.task_recalculations(project_id, created_at desc)$$),
      ('idx_task_assignments_assignee_created', 'task_assignments', array['assignee_id', 'created_at']::text[], $$create index if not exists idx_task_assignments_assignee_created on public.task_assignments(assignee_id, created_at desc)$$),
      ('idx_task_comments_author_created', 'task_comments', array['author_id', 'created_at']::text[], $$create index if not exists idx_task_comments_author_created on public.task_comments(author_id, created_at desc)$$),
      ('idx_task_comments_parent_created', 'task_comments', array['parent_comment_id', 'created_at']::text[], $$create index if not exists idx_task_comments_parent_created on public.task_comments(parent_comment_id, created_at) where parent_comment_id is not null$$),

      ('idx_task_submissions_group_updated', 'task_submissions', array['group_id', 'updated_at']::text[], $$create index if not exists idx_task_submissions_group_updated on public.task_submissions(group_id, updated_at desc)$$),
      ('idx_task_submissions_task_group_status', 'task_submissions', array['task_id', 'group_id', 'status']::text[], $$create index if not exists idx_task_submissions_task_group_status on public.task_submissions(task_id, group_id, status)$$),
      ('idx_task_submissions_status_updated', 'task_submissions', array['status', 'updated_at']::text[], $$create index if not exists idx_task_submissions_status_updated on public.task_submissions(status, updated_at desc)$$),
      ('idx_submission_versions_uploaded_created', 'submission_versions', array['uploaded_by', 'created_at']::text[], $$create index if not exists idx_submission_versions_uploaded_created on public.submission_versions(uploaded_by, created_at desc)$$),

      ('idx_messages_sender_created', 'messages', array['sender_id', 'created_at']::text[], $$create index if not exists idx_messages_sender_created on public.messages(sender_id, created_at desc)$$),
      ('idx_messages_reply_created', 'messages', array['reply_to_message_id', 'created_at']::text[], $$create index if not exists idx_messages_reply_created on public.messages(reply_to_message_id, created_at) where reply_to_message_id is not null$$),
      ('idx_attachments_message_owner_created', 'attachments', array['owner_type', 'owner_id', 'created_at']::text[], $$create index if not exists idx_attachments_message_owner_created on public.attachments(owner_id, created_at desc) where owner_type = 'message'$$),
      ('idx_pinned_messages_class_created', 'pinned_messages', array['class_chat_id', 'created_at']::text[], $$create index if not exists idx_pinned_messages_class_created on public.pinned_messages(class_chat_id, created_at desc) where class_chat_id is not null$$),
      ('idx_pinned_messages_group_created', 'pinned_messages', array['group_chat_id', 'created_at']::text[], $$create index if not exists idx_pinned_messages_group_created on public.pinned_messages(group_chat_id, created_at desc) where group_chat_id is not null$$),
      ('idx_message_deletions_message_user', 'message_deletions', array['message_id', 'user_id']::text[], $$create index if not exists idx_message_deletions_message_user on public.message_deletions(message_id, user_id)$$),

      ('idx_notifications_user_priority_created', 'notifications', array['user_id', 'priority', 'created_at']::text[], $$create index if not exists idx_notifications_user_priority_created on public.notifications(user_id, priority, created_at desc)$$),
      ('idx_notifications_class_created', 'notifications', array['class_id', 'created_at']::text[], $$create index if not exists idx_notifications_class_created on public.notifications(class_id, created_at desc) where class_id is not null$$),
      ('idx_notifications_project_created', 'notifications', array['project_id', 'created_at']::text[], $$create index if not exists idx_notifications_project_created on public.notifications(project_id, created_at desc) where project_id is not null$$),
      ('idx_notifications_group_created', 'notifications', array['group_id', 'created_at']::text[], $$create index if not exists idx_notifications_group_created on public.notifications(group_id, created_at desc) where group_id is not null$$),
      ('idx_activity_logs_group_created', 'activity_logs', array['group_id', 'created_at']::text[], $$create index if not exists idx_activity_logs_group_created on public.activity_logs(group_id, created_at desc) where group_id is not null$$),
      ('idx_activity_logs_entity_created', 'activity_logs', array['entity_type', 'entity_id', 'created_at']::text[], $$create index if not exists idx_activity_logs_entity_created on public.activity_logs(entity_type, entity_id, created_at desc)$$),

      ('idx_reassignment_class_status_created', 'reassignment_requests', array['class_id', 'status', 'created_at']::text[], $$create index if not exists idx_reassignment_class_status_created on public.reassignment_requests(class_id, status, created_at desc)$$),
      ('idx_reassignment_requester_status_created', 'reassignment_requests', array['requested_by', 'status', 'created_at']::text[], $$create index if not exists idx_reassignment_requester_status_created on public.reassignment_requests(requested_by, status, created_at desc)$$),
      ('idx_reassignment_current_assignee_status', 'reassignment_requests', array['current_assignee_id', 'status', 'created_at']::text[], $$create index if not exists idx_reassignment_current_assignee_status on public.reassignment_requests(current_assignee_id, status, created_at desc) where current_assignee_id is not null$$),
      ('idx_reassignment_requested_assignee_status', 'reassignment_requests', array['requested_assignee_id', 'status', 'created_at']::text[], $$create index if not exists idx_reassignment_requested_assignee_status on public.reassignment_requests(requested_assignee_id, status, created_at desc) where requested_assignee_id is not null$$),

      ('idx_analytics_question_sets_prof_active_created', 'analytics_question_sets', array['professor_id', 'is_archived', 'created_at']::text[], $$create index if not exists idx_analytics_question_sets_prof_active_created on public.analytics_question_sets(professor_id, is_archived, created_at desc)$$),
      ('idx_analytics_question_sets_class_active_created', 'analytics_question_sets', array['class_id', 'is_archived', 'created_at']::text[], $$create index if not exists idx_analytics_question_sets_class_active_created on public.analytics_question_sets(class_id, is_archived, created_at desc)$$),
      ('idx_analytics_answers_student_project_group', 'analytics_answers', array['student_id', 'project_id', 'group_id']::text[], $$create index if not exists idx_analytics_answers_student_project_group on public.analytics_answers(student_id, project_id, group_id)$$),
      ('idx_analytics_answers_question_student', 'analytics_answers', array['question_id', 'student_id']::text[], $$create index if not exists idx_analytics_answers_question_student on public.analytics_answers(question_id, student_id)$$),
      ('idx_student_analytics_class_generated', 'student_analytics', array['class_id', 'generated_at']::text[], $$create index if not exists idx_student_analytics_class_generated on public.student_analytics(class_id, generated_at desc)$$),
      ('idx_student_analytics_project_generated', 'student_analytics', array['project_id', 'generated_at']::text[], $$create index if not exists idx_student_analytics_project_generated on public.student_analytics(project_id, generated_at desc)$$),
      ('idx_analytics_reports_class_created', 'analytics_reports', array['class_id', 'created_at']::text[], $$create index if not exists idx_analytics_reports_class_created on public.analytics_reports(class_id, created_at desc) where class_id is not null$$),

      ('idx_project_validations_decision_created', 'project_validations', array['project_id', 'decision', 'created_at']::text[], $$create index if not exists idx_project_validations_decision_created on public.project_validations(project_id, decision, created_at desc)$$),
      ('idx_validation_history_validation_created', 'validation_history', array['validation_id', 'created_at']::text[], $$create index if not exists idx_validation_history_validation_created on public.validation_history(validation_id, created_at desc)$$),
      ('idx_ai_task_generations_group_created', 'ai_task_generations', array['group_id', 'created_at']::text[], $$create index if not exists idx_ai_task_generations_group_created on public.ai_task_generations(group_id, created_at desc)$$),
      ('idx_ai_task_generations_project_status_created', 'ai_task_generations', array['project_id', 'status', 'created_at']::text[], $$create index if not exists idx_ai_task_generations_project_status_created on public.ai_task_generations(project_id, status, created_at desc)$$),
      ('idx_task_dependencies_depends_on', 'task_dependencies', array['depends_on_task_id']::text[], $$create index if not exists idx_task_dependencies_depends_on on public.task_dependencies(depends_on_task_id)$$),
      ('idx_milestones_group_due', 'milestones', array['group_id', 'due_at']::text[], $$create index if not exists idx_milestones_group_due on public.milestones(group_id, due_at)$$),
      ('idx_milestone_tasks_task', 'milestone_tasks', array['task_id']::text[], $$create index if not exists idx_milestone_tasks_task on public.milestone_tasks(task_id)$$),

      ('idx_project_health_class_generated', 'project_health', array['class_id', 'generated_at']::text[], $$create index if not exists idx_project_health_class_generated on public.project_health(class_id, generated_at desc) where class_id is not null$$),
      ('idx_project_health_project_group_generated', 'project_health', array['project_id', 'group_id', 'generated_at']::text[], $$create index if not exists idx_project_health_project_group_generated on public.project_health(project_id, group_id, generated_at desc)$$),
      ('idx_project_health_history_group_created', 'project_health_history', array['group_id', 'created_at']::text[], $$create index if not exists idx_project_health_history_group_created on public.project_health_history(group_id, created_at desc) where group_id is not null$$),
      ('idx_health_alerts_group_active_created', 'health_alerts', array['group_id', 'is_active', 'created_at']::text[], $$create index if not exists idx_health_alerts_group_active_created on public.health_alerts(group_id, is_active, created_at desc) where group_id is not null$$),
      ('idx_health_recommendations_resolved_priority', 'health_recommendations', array['health_id', 'is_resolved', 'priority']::text[], $$create index if not exists idx_health_recommendations_resolved_priority on public.health_recommendations(health_id, is_resolved, priority)$$),

      ('idx_contribution_logs_group_user_logged', 'contribution_logs', array['group_id', 'user_id', 'logged_at']::text[], $$create index if not exists idx_contribution_logs_group_user_logged on public.contribution_logs(group_id, user_id, logged_at desc)$$),
      ('idx_contribution_logs_user_logged', 'contribution_logs', array['user_id', 'logged_at']::text[], $$create index if not exists idx_contribution_logs_user_logged on public.contribution_logs(user_id, logged_at desc)$$),
      ('idx_contribution_logs_task_user', 'contribution_logs', array['task_id', 'user_id']::text[], $$create index if not exists idx_contribution_logs_task_user on public.contribution_logs(task_id, user_id) where task_id is not null$$)
    ) as v(index_name, table_name, required_columns, ddl)
  loop
    if to_regclass(format('public.%I', item.table_name)) is not null
      and not exists (
        select 1
        from unnest(item.required_columns) as required(column_name)
        where not exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = item.table_name
            and c.column_name = required.column_name
        )
      )
    then
      execute item.ddl;
    end if;
  end loop;
end;
$migration$;
