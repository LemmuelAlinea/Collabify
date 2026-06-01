import { env } from '../../../config/env.js'
import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'
import {
  scoreFinalVersionSelected,
  scoreSubmissionVersionUploaded,
} from '../../contributions/services/contributionScoringService.js'

const SUBMISSION_SELECT = `
  id,
  task_id,
  submitted_by,
  group_id,
  status,
  current_version_id,
  submitted_at,
  reviewed_by,
  reviewed_at,
  feedback,
  created_at,
  updated_at,
  tasks:task_id (
    id,
    title,
    project_id,
    group_id,
    due_at,
    projects:project_id (
      id,
      title
    )
  ),
  groups:group_id (
    id,
    name,
    class_id,
    classes:class_id (
      id,
      title,
      section,
      professor_id
    )
  )
`

const VERSION_SELECT = `
  id,
  submission_id,
  version,
  uploaded_by,
  storage_path,
  file_name,
  mime_type,
  file_size_bytes,
  notes,
  checksum,
  created_at,
  users:uploaded_by (
    email
  )
`

function normalizeVersion(version, currentVersionId, profileByUserId = new Map()) {
  const profile = profileByUserId.get(version.uploaded_by)
  return {
    id: version.id,
    submissionId: version.submission_id,
    version: version.version,
    uploadedBy: version.uploaded_by,
    storagePath: version.storage_path,
    fileName: version.file_name,
    mimeType: version.mime_type,
    fileSizeBytes: version.file_size_bytes,
    notes: version.notes,
    checksum: version.checksum,
    createdAt: version.created_at,
    isFinal: version.id === currentVersionId,
    email: version.users?.email,
    displayName: profile?.display_name ?? version.users?.email,
    avatarUrl: profile?.avatar_url,
  }
}

function normalizeSubmission(submission, versions = [], profileByUserId = new Map()) {
  return {
    id: submission.id,
    taskId: submission.task_id,
    submittedBy: submission.submitted_by,
    groupId: submission.group_id,
    status: submission.status,
    currentVersionId: submission.current_version_id,
    submittedAt: submission.submitted_at,
    reviewedBy: submission.reviewed_by,
    reviewedAt: submission.reviewed_at,
    feedback: submission.feedback,
    createdAt: submission.created_at,
    updatedAt: submission.updated_at,
    task: submission.tasks ? {
      id: submission.tasks.id,
      title: submission.tasks.title,
      projectId: submission.tasks.project_id,
      dueAt: submission.tasks.due_at,
      project: submission.tasks.projects ? {
        id: submission.tasks.projects.id,
        title: submission.tasks.projects.title,
      } : null,
    } : null,
    group: submission.groups ? {
      id: submission.groups.id,
      name: submission.groups.name,
      classId: submission.groups.class_id,
      className: submission.groups.classes?.title,
      section: submission.groups.classes?.section,
    } : null,
    versions: versions.map((version) => normalizeVersion(version, submission.current_version_id, profileByUserId)),
  }
}

async function getProfiles(userIds) {
  if (userIds.length === 0) return new Map()

  const { data } = await supabaseAdminClient
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', [...new Set(userIds)])

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]))
}

async function loadVersions(submissionIds) {
  if (submissionIds.length === 0) return { versionsBySubmissionId: new Map(), profileByUserId: new Map() }

  const { data, error } = await supabaseAdminClient
    .from('submission_versions')
    .select(VERSION_SELECT)
    .in('submission_id', submissionIds)
    .order('version', { ascending: false })

  if (error) throw new HttpError(400, 'Unable to load submission versions', error.message)

  const profileByUserId = await getProfiles((data ?? []).map((version) => version.uploaded_by))
  const versionsBySubmissionId = new Map()

  for (const version of data ?? []) {
    const versions = versionsBySubmissionId.get(version.submission_id) ?? []
    versions.push(version)
    versionsBySubmissionId.set(version.submission_id, versions)
  }

  return { versionsBySubmissionId, profileByUserId }
}

async function getTaskWithAccess(taskId, userId, role) {
  const { data, error } = await supabaseAdminClient
    .from('tasks')
    .select(`
      id,
      title,
      group_id,
      project_id,
      groups:group_id (
        id,
        class_id,
        classes:class_id (
          professor_id
        )
      )
    `)
    .eq('id', taskId)
    .single()

  if (error || !data) throw new HttpError(404, 'Task not found')

  if (role === 'professor') {
    await assertProfessorOwnsClass(data.groups.class_id, userId)
    return data
  }

  const { data: membership, error: membershipError } = await supabaseAdminClient
    .from('group_members')
    .select('id')
    .eq('group_id', data.group_id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) throw new HttpError(403, 'You do not have permission to submit this task')
  return data
}

async function getSubmissionWithAccess(submissionId, userId, role) {
  const { data, error } = await supabaseAdminClient
    .from('task_submissions')
    .select(SUBMISSION_SELECT)
    .eq('id', submissionId)
    .single()

  if (error || !data) throw new HttpError(404, 'Submission not found')

  if (role === 'professor') {
    await assertProfessorOwnsClass(data.groups.class_id, userId)
  } else {
    const { data: membership, error: membershipError } = await supabaseAdminClient
      .from('group_members')
      .select('id')
      .eq('group_id', data.group_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (membershipError || !membership) throw new HttpError(404, 'Submission not found')
  }

  return data
}

async function normalizeSubmissions(rows) {
  const { versionsBySubmissionId, profileByUserId } = await loadVersions(rows.map((submission) => submission.id))
  return rows.map((submission) => normalizeSubmission(
    submission,
    versionsBySubmissionId.get(submission.id) ?? [],
    profileByUserId,
  ))
}

export async function listSubmissions(userId, role, filters = {}) {
  let query = supabaseAdminClient
    .from('task_submissions')
    .select(role === 'professor'
      ? SUBMISSION_SELECT
        .replace('groups:group_id', 'groups:group_id!inner')
        .replace('classes:class_id', 'classes:class_id!inner')
      : SUBMISSION_SELECT)
    .order('updated_at', { ascending: false })

  if (filters.taskId) query = query.eq('task_id', filters.taskId)
  if (filters.groupId) query = query.eq('group_id', filters.groupId)

  if (role === 'professor') {
    query = query.eq('groups.classes.professor_id', userId)
  } else {
    const { data: memberships, error } = await supabaseAdminClient
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (error) throw new HttpError(400, 'Unable to load your groups', error.message)
    const groupIds = (memberships ?? []).map((membership) => membership.group_id)
    if (groupIds.length === 0) return []
    query = query.in('group_id', groupIds)
  }

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load submissions', error.message)
  return normalizeSubmissions(data ?? [])
}

export async function getSubmission(userId, role, submissionId) {
  const submission = await getSubmissionWithAccess(submissionId, userId, role)
  return (await normalizeSubmissions([submission]))[0]
}

export async function createSubmissionVersion(userId, role, payload) {
  if (role !== 'student') throw new HttpError(403, 'Only students can upload submission versions')

  const task = await getTaskWithAccess(payload.taskId, userId, role)

  const { data: existingSubmission, error: existingError } = await supabaseAdminClient
    .from('task_submissions')
    .select(SUBMISSION_SELECT)
    .eq('task_id', task.id)
    .eq('group_id', task.group_id)
    .maybeSingle()

  if (existingError) throw new HttpError(400, 'Unable to load submission', existingError.message)

  let submission = existingSubmission

  if (submission) {
    const { data, error } = await supabaseAdminClient
      .from('task_submissions')
      .update({
        submitted_by: userId,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        reviewed_by: null,
        reviewed_at: null,
        feedback: null,
      })
      .eq('id', submission.id)
      .select(SUBMISSION_SELECT)
      .single()

    if (error) throw new HttpError(400, 'Unable to update submission', error.message)
    submission = data
  } else {
    const { data, error } = await supabaseAdminClient
      .from('task_submissions')
      .insert({
        task_id: task.id,
        group_id: task.group_id,
        submitted_by: userId,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select(SUBMISSION_SELECT)
      .single()

    if (error) throw new HttpError(400, 'Unable to create submission', error.message)
    submission = data
  }

  const { data: latest } = await supabaseAdminClient
    .from('submission_versions')
    .select('version')
    .eq('submission_id', submission.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (latest?.version ?? 0) + 1
  const { data: version, error: versionError } = await supabaseAdminClient
    .from('submission_versions')
    .insert({
      submission_id: submission.id,
      version: nextVersion,
      uploaded_by: userId,
      storage_path: payload.storagePath,
      file_name: payload.fileName,
      mime_type: payload.mimeType,
      file_size_bytes: payload.fileSizeBytes,
      notes: payload.notes,
      checksum: payload.checksum,
    })
    .select(VERSION_SELECT)
    .single()

  if (versionError) throw new HttpError(400, 'Unable to create submission version', versionError.message)
  await scoreSubmissionVersionUploaded({ submission, userId, version })

  if (!submission.current_version_id || payload.selectAsFinal) {
    const { error: finalError } = await supabaseAdminClient
      .from('task_submissions')
      .update({ current_version_id: version.id })
      .eq('id', submission.id)

    if (finalError) throw new HttpError(400, 'Unable to select final version', finalError.message)
    await scoreFinalVersionSelected({ submission, userId, versionId: version.id })
  }

  return getSubmission(userId, role, submission.id)
}

export async function selectFinalVersion(userId, role, submissionId, versionId) {
  if (role !== 'student') throw new HttpError(403, 'Only students can select the final version')

  const submission = await getSubmissionWithAccess(submissionId, userId, role)
  const { data: version, error: versionError } = await supabaseAdminClient
    .from('submission_versions')
    .select('id')
    .eq('id', versionId)
    .eq('submission_id', submissionId)
    .single()

  if (versionError || !version) throw new HttpError(404, 'Submission version not found')

  const { error } = await supabaseAdminClient
    .from('task_submissions')
    .update({ current_version_id: versionId, status: 'submitted' })
    .eq('id', submission.id)

  if (error) throw new HttpError(400, 'Unable to select final version', error.message)
  await scoreFinalVersionSelected({ submission, userId, versionId })
  return getSubmission(userId, role, submissionId)
}

export async function reviewSubmission(userId, role, submissionId, payload) {
  if (role !== 'professor') throw new HttpError(403, 'Only professors can review submissions')

  const submission = await getSubmissionWithAccess(submissionId, userId, role)
  const { error } = await supabaseAdminClient
    .from('task_submissions')
    .update({
      status: payload.status,
      feedback: payload.feedback,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submission.id)

  if (error) throw new HttpError(400, 'Unable to review submission', error.message)
  return getSubmission(userId, role, submissionId)
}

export async function createVersionDownloadUrl(userId, role, versionId) {
  const { data: version, error } = await supabaseAdminClient
    .from('submission_versions')
    .select(VERSION_SELECT)
    .eq('id', versionId)
    .single()

  if (error || !version) throw new HttpError(404, 'Submission version not found')
  await getSubmissionWithAccess(version.submission_id, userId, role)

  const { data, error: signedError } = await supabaseAdminClient.storage
    .from(env.submissionsBucket)
    .createSignedUrl(version.storage_path, 60 * 5)

  if (signedError) throw new HttpError(400, 'Unable to create download URL', signedError.message)
  return data.signedUrl
}
