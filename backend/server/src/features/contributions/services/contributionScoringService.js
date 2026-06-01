import { supabaseAdminClient } from '../../../integrations/supabase/client.js'

export const CONTRIBUTION_SCORES = {
  comment_created: 2,
  submission_final_selected: 5,
  submission_version_uploaded: 8,
  task_completed: 15,
  task_edited: 3,
  reassignment_request: 4,
  reassignment_approved: 6,
}

function eventKey(type, id) {
  return `${type}:${id}`
}

async function logContribution({
  contributionType,
  description,
  eventId,
  groupId,
  metadata = {},
  points,
  projectId,
  submissionVersionId = null,
  taskId = null,
  userId,
}) {
  if (!projectId || !userId) return null

  const { data, error } = await supabaseAdminClient
    .from('contribution_logs')
    .insert({
      project_id: projectId,
      group_id: groupId,
      user_id: userId,
      task_id: taskId,
      submission_version_id: submissionVersionId,
      contribution_type: contributionType,
      description,
      points,
      metadata: {
        ...metadata,
        eventKey: eventKey(contributionType, eventId),
      },
    })
    .select('id')
    .single()

  if (error && error.code !== '23505') {
    console.warn(`Unable to log contribution: ${error.message}`)
  }

  return data
}

export async function scoreTaskEdited({ actorId, task }) {
  return logContribution({
    contributionType: 'task_edited',
    description: `Edited task: ${task.title}`,
    eventId: `${task.id}:${Date.now()}`,
    groupId: task.group_id,
    points: CONTRIBUTION_SCORES.task_edited,
    projectId: task.project_id,
    taskId: task.id,
    userId: actorId,
  })
}

export async function scoreTaskCompleted({ actorId, task }) {
  return logContribution({
    contributionType: 'task_completed',
    description: `Completed task: ${task.title}`,
    eventId: task.id,
    groupId: task.group_id,
    points: CONTRIBUTION_SCORES.task_completed,
    projectId: task.project_id,
    taskId: task.id,
    userId: actorId,
  })
}

export async function scoreCommentCreated({ actorId, commentId, task }) {
  return logContribution({
    contributionType: 'comment_created',
    description: `Commented on task: ${task.title}`,
    eventId: commentId,
    groupId: task.group_id,
    points: CONTRIBUTION_SCORES.comment_created,
    projectId: task.project_id,
    taskId: task.id,
    userId: actorId,
  })
}

export async function scoreSubmissionVersionUploaded({ submission, userId, version }) {
  return logContribution({
    contributionType: 'submission_version_uploaded',
    description: `Uploaded submission version ${version.version}`,
    eventId: version.id,
    groupId: submission.group_id,
    points: CONTRIBUTION_SCORES.submission_version_uploaded,
    projectId: submission.tasks?.project_id,
    submissionVersionId: version.id,
    taskId: submission.task_id,
    userId,
  })
}

export async function scoreFinalVersionSelected({ submission, userId, versionId }) {
  return logContribution({
    contributionType: 'submission_final_selected',
    description: 'Selected final submission version',
    eventId: `${submission.id}:${versionId}`,
    groupId: submission.group_id,
    points: CONTRIBUTION_SCORES.submission_final_selected,
    projectId: submission.tasks?.project_id,
    submissionVersionId: versionId,
    taskId: submission.task_id,
    userId,
  })
}
