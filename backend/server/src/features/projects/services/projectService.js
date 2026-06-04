import { env } from '../../../config/env.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { HttpError } from '../../../core/errors/httpError.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'

const PROJECT_SELECT = `
  id,
  class_id,
  created_by,
  title,
  description,
  guidelines,
  project_type,
  year_level,
  work_mode,
  member_count,
  start_at,
  deadline_at,
  visibility_at,
  rubric,
  file_storage_path,
  file_name,
  mime_type,
  file_size_bytes,
  file_text_extracted_at,
  file_text_error,
  status,
  due_at,
  archived_at,
  reopened_at,
  created_at,
  updated_at,
  classes:class_id (
    id,
    title,
    subject,
    section,
    professor_id
  )
`

const RELEASE_SELECT = `
  id,
  project_id,
  class_id,
  released_by,
  start_at,
  deadline_at,
  release_at,
  is_active,
  classes:class_id (
    id,
    title,
    subject,
    section
  )
`

function parseRubrics(value) {
  if (!value) return {}

  try {
    return JSON.parse(value)
  } catch {
    return { text: value }
  }
}

function normalizeRelease(release) {
  return {
    id: release.id,
    projectId: release.project_id,
    classId: release.class_id,
    releasedBy: release.released_by,
    startAt: release.start_at,
    deadlineAt: release.deadline_at,
    releaseAt: release.release_at,
    isActive: release.is_active,
    class: release.classes ? {
      id: release.classes.id,
      name: release.classes.title,
      subject: release.classes.subject,
      section: release.classes.section,
    } : null,
  }
}

function normalizeProject(project) {
  const releases = (project.releases ?? project.project_class_releases ?? []).map(normalizeRelease)
  const primaryRelease = project.release ?? releases[0]
  const visibleAt = primaryRelease?.release_at ?? project.visibility_at
  const startAt = primaryRelease?.start_at ?? project.start_at
  const deadlineAt = primaryRelease?.deadline_at ?? project.deadline_at ?? project.due_at

  return {
    id: project.id,
    classId: project.class_id,
    classIds: releases.length > 0 ? releases.map((release) => release.classId) : [project.class_id],
    createdBy: project.created_by,
    title: project.title,
    description: project.description,
    guidelines: project.guidelines,
    projectType: project.project_type,
    yearLevel: project.year_level,
    workMode: project.work_mode,
    memberCount: project.member_count,
    startAt,
    deadlineAt,
    visibilityAt: visibleAt,
    releaseAt: visibleAt,
    isVisible: project.status !== 'archived' && (!visibleAt || new Date(visibleAt) <= new Date()),
    rubrics: project.rubric,
    fileStoragePath: project.file_storage_path,
    fileName: project.file_name,
    mimeType: project.mime_type,
    fileSizeBytes: project.file_size_bytes,
    fileTextExtractedAt: project.file_text_extracted_at,
    fileTextError: project.file_text_error,
    status: project.status,
    archivedAt: project.archived_at,
    reopenedAt: project.reopened_at,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    class: project.classes ? {
      id: project.classes.id,
      name: project.classes.title,
      subject: project.classes.subject,
      section: project.classes.section,
    } : null,
    releases,
    classes: releases.length > 0
      ? releases.map((release) => release.class).filter(Boolean)
      : project.classes ? [{
        id: project.classes.id,
        name: project.classes.title,
        subject: project.classes.subject,
        section: project.classes.section,
      }] : [],
  }
}

function buildProjectFilePayload(payload) {
  if (!payload.fileStoragePath) return {}

  return {
    file_storage_path: payload.fileStoragePath,
    file_name: payload.fileName,
    mime_type: payload.mimeType,
    file_size_bytes: payload.fileSizeBytes,
    file_text: null,
    file_text_extracted_at: null,
    file_text_error: null,
  }
}

function uniqueClassIds(payload) {
  return [...new Set((payload.classIds?.length ? payload.classIds : [payload.classId]).filter(Boolean))]
}

async function assertProfessorOwnsClasses(classIds, professorId) {
  await Promise.all(classIds.map((classId) => assertProfessorOwnsClass(classId, professorId)))
}

async function isStudentProjectGroupMember(projectId, userId) {
  const { data, error } = await supabaseAdminClient
    .from('group_members')
    .select('id, groups!inner(id, project_id)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('groups.project_id', projectId)
    .limit(1)

  if (error) throw new HttpError(400, 'Unable to verify project group access', error.message)
  return (data ?? []).length > 0
}

async function attachReleases(projects) {
  if (projects.length === 0) return projects

  const projectIds = projects.map((project) => project.id)
  const { data, error } = await supabaseAdminClient
    .from('project_class_releases')
    .select(RELEASE_SELECT)
    .in('project_id', projectIds)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) throw new HttpError(400, 'Unable to load project releases', error.message)

  const releasesByProjectId = new Map()
  for (const release of data ?? []) {
    const releases = releasesByProjectId.get(release.project_id) ?? []
    releases.push(release)
    releasesByProjectId.set(release.project_id, releases)
  }

  return projects.map((project) => ({
    ...project,
    releases: releasesByProjectId.get(project.id) ?? [],
  }))
}

async function upsertProjectReleases(project, classIds, professorId, payload) {
  const rows = classIds.map((classId) => ({
    project_id: project.id,
    class_id: classId,
    released_by: professorId,
    start_at: payload.startAt,
    deadline_at: payload.deadlineAt,
    release_at: payload.releaseAt ?? payload.visibilityAt,
    is_active: true,
  }))

  const { error: upsertError } = await supabaseAdminClient
    .from('project_class_releases')
    .upsert(rows, { onConflict: 'project_id,class_id' })

  if (upsertError) throw new HttpError(400, 'Unable to assign project releases', upsertError.message)

  const { error: deactivateError } = await supabaseAdminClient
    .from('project_class_releases')
    .update({ is_active: false })
    .eq('project_id', project.id)
    .not('class_id', 'in', `(${classIds.join(',')})`)

  if (deactivateError) throw new HttpError(400, 'Unable to update project releases', deactivateError.message)
}

async function assertCanViewClass(userId, role, classId) {
  if (role === 'professor') {
    await assertProfessorOwnsClass(classId, userId)
    return
  }

  const { data, error } = await supabaseAdminClient
    .from('class_members')
    .select('id')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) {
    throw new HttpError(403, 'You do not have permission to view this class')
  }
}

async function getOwnedProject(projectId, professorId) {
  const { data, error } = await supabaseAdminClient
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', projectId)
    .single()

  if (error || !data) throw new HttpError(404, 'Project not found')
  if (data.classes?.professor_id !== professorId) {
    throw new HttpError(403, 'You do not have permission to manage this project')
  }

  return data
}

export async function listProjects(userId, role) {
  if (role === 'professor') {
    const { data, error } = await supabaseAdminClient
      .from('projects')
      .select(PROJECT_SELECT.replace('classes:class_id', 'classes:class_id!inner'))
      .eq('classes.professor_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new HttpError(400, 'Unable to load projects', error.message)
    return (await attachReleases(data)).map(normalizeProject)
  }

  const { data: memberships, error: membershipError } = await supabaseAdminClient
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (membershipError) throw new HttpError(400, 'Unable to load classes', membershipError.message)

  const classIds = memberships.map((membership) => membership.class_id)
  if (classIds.length === 0) return []

  const now = new Date().toISOString()
  const { data: releases, error: releaseError } = await supabaseAdminClient
    .from('project_class_releases')
    .select(RELEASE_SELECT)
    .in('class_id', classIds)
    .eq('is_active', true)
    .lte('release_at', now)
    .order('deadline_at', { ascending: true })

  if (releaseError) throw new HttpError(400, 'Unable to load project releases', releaseError.message)

  const projectIds = [...new Set((releases ?? []).map((release) => release.project_id))]
  if (projectIds.length === 0) return []

  const { data, error } = await supabaseAdminClient
    .from('projects')
    .select(PROJECT_SELECT)
    .in('id', projectIds)
    .neq('status', 'archived')
    .order('deadline_at', { ascending: true })

  if (error) throw new HttpError(400, 'Unable to load projects', error.message)

  const releasesByProjectId = new Map()
  for (const release of releases ?? []) {
    const projectReleases = releasesByProjectId.get(release.project_id) ?? []
    projectReleases.push(release)
    releasesByProjectId.set(release.project_id, projectReleases)
  }

  return data.map((project) => normalizeProject({
    ...project,
    releases: releasesByProjectId.get(project.id) ?? [],
  }))
}

export async function listClassProjects(userId, role, classId) {
  await assertCanViewClass(userId, role, classId)

  let releaseQuery = supabaseAdminClient
    .from('project_class_releases')
    .select(RELEASE_SELECT)
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('deadline_at', { ascending: true })

  if (role === 'student') {
    releaseQuery = releaseQuery.lte('release_at', new Date().toISOString())
  }

  const { data: releases, error: releaseError } = await releaseQuery
  if (releaseError) throw new HttpError(400, 'Unable to load project releases', releaseError.message)

  const projectIds = [...new Set((releases ?? []).map((release) => release.project_id))]
  if (projectIds.length === 0) return []

  let query = supabaseAdminClient
    .from('projects')
    .select(PROJECT_SELECT)
    .in('id', projectIds)
    .order('deadline_at', { ascending: true })

  if (role === 'student') query = query.neq('status', 'archived')

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load projects', error.message)
  return data.map((project) => normalizeProject({
    ...project,
    release: releases.find((release) => release.project_id === project.id),
    releases: releases.filter((release) => release.project_id === project.id),
  }))
}

export async function getProject(userId, role, projectId) {
  const { data, error } = await supabaseAdminClient
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', projectId)
    .single()

  if (error || !data) throw new HttpError(404, 'Project not found')

  const { data: releases, error: releaseError } = await supabaseAdminClient
    .from('project_class_releases')
    .select(RELEASE_SELECT)
    .eq('project_id', projectId)
    .eq('is_active', true)

  if (releaseError) throw new HttpError(400, 'Unable to load project releases', releaseError.message)

  let visibleReleases = releases ?? []

  if (role === 'professor') {
    await assertProfessorOwnsClass(data.class_id, userId)
  } else {
    const hasGroupAccess = await isStudentProjectGroupMember(projectId, userId)
    const classIds = (releases ?? []).map((release) => release.class_id)
    if (classIds.length === 0 && !hasGroupAccess) throw new HttpError(404, 'Project not found')

    let memberships = []

    if (classIds.length > 0) {
      const { data: membershipRows, error: membershipError } = await supabaseAdminClient
        .from('class_members')
        .select('class_id')
        .in('class_id', classIds)
        .eq('user_id', userId)
        .eq('status', 'active')

      if (membershipError) throw new HttpError(400, 'Unable to verify project access', membershipError.message)
      memberships = membershipRows ?? []
    }

    const memberClassIds = new Set((memberships ?? []).map((membership) => membership.class_id))
    visibleReleases = (releases ?? []).filter((release) => (
      memberClassIds.has(release.class_id)
      && new Date(release.release_at) <= new Date()
    ))

    if (visibleReleases.length === 0 && !hasGroupAccess) throw new HttpError(404, 'Project not found')
  }

  if (
    role === 'student'
    && data.status === 'archived'
  ) {
    throw new HttpError(404, 'Project not found')
  }

  return normalizeProject({ ...data, releases: visibleReleases })
}

export async function createProject(professorId, payload) {
  const classIds = uniqueClassIds(payload)
  await assertProfessorOwnsClasses(classIds, professorId)

  const memberCount = payload.workMode === 'individual' ? 1 : payload.memberCount
  const releaseAt = payload.releaseAt ?? payload.visibilityAt

  const { data, error } = await supabaseAdminClient
    .from('projects')
    .insert({
      class_id: classIds[0],
      created_by: professorId,
      title: payload.title,
      description: payload.description,
      guidelines: payload.guidelines,
      objectives: payload.guidelines,
      project_type: payload.projectType,
      year_level: payload.yearLevel,
      work_mode: payload.workMode,
      member_count: memberCount,
      max_group_size: memberCount,
      start_at: payload.startAt,
      deadline_at: payload.deadlineAt,
      due_at: payload.deadlineAt,
      visibility_at: releaseAt,
      rubric: parseRubrics(payload.rubrics),
      ...buildProjectFilePayload(payload),
      status: 'open',
    })
    .select(PROJECT_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to create project', error.message)
  await upsertProjectReleases(data, classIds, professorId, { ...payload, releaseAt })

  return normalizeProject((await attachReleases([data]))[0])
}

export async function updateProject(professorId, projectId, payload) {
  await getOwnedProject(projectId, professorId)

  const classIds = payload.classIds?.length ? uniqueClassIds(payload) : null
  if (classIds) await assertProfessorOwnsClasses(classIds, professorId)

  const memberCount = payload.workMode === 'individual' ? 1 : payload.memberCount
  const releaseAt = payload.releaseAt ?? payload.visibilityAt
  const updatePayload = {
    class_id: classIds?.[0],
    title: payload.title,
    description: payload.description,
    guidelines: payload.guidelines,
    objectives: payload.guidelines,
    project_type: payload.projectType,
    year_level: payload.yearLevel,
    work_mode: payload.workMode,
    member_count: memberCount,
    max_group_size: memberCount,
    start_at: payload.startAt,
    deadline_at: payload.deadlineAt,
    due_at: payload.deadlineAt,
    visibility_at: releaseAt,
    rubric: payload.rubrics === undefined ? undefined : parseRubrics(payload.rubrics),
    ...buildProjectFilePayload(payload),
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key]
  })

  const { data, error } = await supabaseAdminClient
    .from('projects')
    .update(updatePayload)
    .eq('id', projectId)
    .select(PROJECT_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to update project', error.message)

  if (classIds) {
    await upsertProjectReleases(data, classIds, professorId, {
      startAt: data.start_at,
      deadlineAt: data.deadline_at ?? data.due_at,
      releaseAt: data.visibility_at,
    })
  } else if (payload.startAt || payload.deadlineAt || releaseAt) {
    const releaseUpdate = {}
    if (payload.startAt) releaseUpdate.start_at = payload.startAt
    if (payload.deadlineAt) releaseUpdate.deadline_at = payload.deadlineAt
    if (releaseAt) releaseUpdate.release_at = releaseAt

    const { error: releaseError } = await supabaseAdminClient
      .from('project_class_releases')
      .update(releaseUpdate)
      .eq('project_id', projectId)
      .eq('is_active', true)

    if (releaseError) throw new HttpError(400, 'Unable to update project releases', releaseError.message)
  }

  return normalizeProject((await attachReleases([data]))[0])
}

export async function archiveProject(professorId, projectId) {
  await getOwnedProject(projectId, professorId)

  const { data, error } = await supabaseAdminClient
    .from('projects')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', projectId)
    .select(PROJECT_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to archive project', error.message)
  return normalizeProject((await attachReleases([data]))[0])
}

export async function reopenProject(professorId, projectId) {
  await getOwnedProject(projectId, professorId)

  const { data, error } = await supabaseAdminClient
    .from('projects')
    .update({ status: 'open', archived_at: null, reopened_at: new Date().toISOString() })
    .eq('id', projectId)
    .select(PROJECT_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to reopen project', error.message)

  const { data: activeReleases, error: activeReleaseError } = await supabaseAdminClient
    .from('project_class_releases')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .limit(1)

  if (activeReleaseError) throw new HttpError(400, 'Unable to load project releases', activeReleaseError.message)

  if ((activeReleases ?? []).length === 0) {
    const { error: releaseError } = await supabaseAdminClient
      .from('project_class_releases')
      .update({ is_active: true })
      .eq('project_id', projectId)

    if (releaseError) throw new HttpError(400, 'Unable to reopen project releases', releaseError.message)
  }

  return normalizeProject((await attachReleases([data]))[0])
}

export async function rescheduleDeadline(professorId, projectId, deadlineAt) {
  await getOwnedProject(projectId, professorId)

  const { data, error } = await supabaseAdminClient
    .from('projects')
    .update({ deadline_at: deadlineAt, due_at: deadlineAt })
    .eq('id', projectId)
    .select(PROJECT_SELECT)
    .single()

  if (error) throw new HttpError(400, 'Unable to reschedule deadline', error.message)
  const { error: releaseError } = await supabaseAdminClient
    .from('project_class_releases')
    .update({ deadline_at: deadlineAt })
    .eq('project_id', projectId)
    .eq('is_active', true)

  if (releaseError) throw new HttpError(400, 'Unable to reschedule project releases', releaseError.message)

  return normalizeProject((await attachReleases([data]))[0])
}

export async function getProjectDownloadUrl(userId, role, projectId) {
  const project = await getProject(userId, role, projectId)

  if (!project.fileStoragePath) {
    throw new HttpError(404, 'Project file not found')
  }

  const { data, error } = await supabaseAdminClient.storage
    .from(env.projectFilesBucket)
    .createSignedUrl(project.fileStoragePath, 60 * 10)

  if (error || !data?.signedUrl) {
    throw new HttpError(400, 'Unable to create project download link', error?.message)
  }

  return data.signedUrl
}
