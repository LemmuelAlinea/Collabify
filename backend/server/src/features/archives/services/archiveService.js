import { HttpError } from '../../../core/errors/httpError.js'
import { supabaseAdminClient } from '../../../integrations/supabase/client.js'

const ARCHIVE_TYPES = new Set(['class', 'project', 'task', 'curriculum', 'syllabus'])

function assertArchiveType(type) {
  if (!ARCHIVE_TYPES.has(type)) throw new HttpError(404, 'Archive item not found')
}

function archiveDate(row) {
  return row.archived_at ?? row.updated_at ?? row.created_at
}

function normalizeItem(type, row, extra = {}) {
  return {
    id: row.id,
    type,
    title: row.title ?? row.name,
    description: row.description ?? '',
    related: extra.related ?? '',
    archivedAt: archiveDate(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function collectTaskDescendantIds(taskId) {
  const { data, error } = await supabaseAdminClient
    .from('tasks')
    .select('id')
    .eq('parent_task_id', taskId)

  if (error) throw new HttpError(400, 'Unable to load subtasks', error.message)

  const childIds = (data ?? []).map((task) => task.id)
  const descendantIds = []

  for (const childId of childIds) {
    descendantIds.push(childId, ...(await collectTaskDescendantIds(childId)))
  }

  return descendantIds
}

async function getOwnedProject(projectId, professorId) {
  const { data, error } = await supabaseAdminClient
    .from('projects')
    .select('id, class_id, classes:class_id (professor_id)')
    .eq('id', projectId)
    .single()

  if (error || !data) throw new HttpError(404, 'Archive item not found')
  if (data.classes?.professor_id !== professorId) throw new HttpError(403, 'You do not have permission to manage this archive item')
  return data
}

async function getOwnedTask(taskId, professorId) {
  const { data, error } = await supabaseAdminClient
    .from('tasks')
    .select(`
      id,
      group_id,
      archived_at,
      groups:group_id (
        id,
        classes:class_id (
          professor_id
        )
      )
    `)
    .eq('id', taskId)
    .single()

  if (error || !data) throw new HttpError(404, 'Archive item not found')
  if (data.groups?.classes?.professor_id !== professorId) throw new HttpError(403, 'You do not have permission to manage this archive item')
  return data
}

async function getOwnedSyllabus(syllabusId, professorId) {
  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .select('id, classes:class_id (professor_id)')
    .eq('id', syllabusId)
    .single()

  if (error || !data) throw new HttpError(404, 'Archive item not found')
  if (data.classes?.professor_id !== professorId) throw new HttpError(403, 'You do not have permission to manage this archive item')
  return data
}

async function listArchivedClasses(professorId) {
  const { data, error } = await supabaseAdminClient
    .from('classes')
    .select('id, title, description, subject, section, archived_at, created_at, updated_at')
    .eq('professor_id', professorId)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false, nullsFirst: false })

  if (error) throw new HttpError(400, 'Unable to load archived classes', error.message)

  return (data ?? []).map((row) => normalizeItem('class', row, {
    related: [row.subject, row.section].filter(Boolean).join(' - '),
  }))
}

async function listArchivedProjects(professorId) {
  const { data, error } = await supabaseAdminClient
    .from('projects')
    .select(`
      id,
      title,
      description,
      archived_at,
      created_at,
      updated_at,
      classes:class_id!inner (
        title,
        section,
        professor_id
      )
    `)
    .eq('classes.professor_id', professorId)
    .eq('status', 'archived')
    .order('archived_at', { ascending: false, nullsFirst: false })

  if (error) throw new HttpError(400, 'Unable to load archived projects', error.message)

  return (data ?? []).map((row) => normalizeItem('project', row, {
    related: [row.classes?.title, row.classes?.section].filter(Boolean).join(' - '),
  }))
}

async function listArchivedTasks(professorId) {
  const { data, error } = await supabaseAdminClient
    .from('tasks')
    .select(`
      id,
      title,
      description,
      archived_at,
      created_at,
      updated_at,
      groups:group_id!inner (
        name,
        classes:class_id!inner (
          title,
          professor_id
        )
      ),
      projects:project_id (
        title
      )
    `)
    .eq('groups.classes.professor_id', professorId)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })

  if (error) throw new HttpError(400, 'Unable to load archived tasks', error.message)

  return (data ?? []).map((row) => normalizeItem('task', row, {
    related: [row.projects?.title, row.groups?.name].filter(Boolean).join(' - '),
  }))
}

async function listArchivedCurricula(professorId) {
  const { data, error } = await supabaseAdminClient
    .from('curricula')
    .select('id, title, description, academic_year, archived_at, created_at, updated_at')
    .eq('professor_id', professorId)
    .eq('is_active', false)
    .order('archived_at', { ascending: false, nullsFirst: false })

  if (error) throw new HttpError(400, 'Unable to load archived curricula', error.message)

  return (data ?? []).map((row) => normalizeItem('curriculum', row, {
    related: row.academic_year,
  }))
}

async function listArchivedSyllabi(professorId) {
  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .select(`
      id,
      title,
      description,
      archived_at,
      created_at,
      updated_at,
      classes:class_id!inner (
        title,
        section,
        professor_id
      )
    `)
    .eq('classes.professor_id', professorId)
    .eq('is_active', false)
    .order('archived_at', { ascending: false, nullsFirst: false })

  if (error) throw new HttpError(400, 'Unable to load archived syllabi', error.message)

  return (data ?? []).map((row) => normalizeItem('syllabus', row, {
    related: [row.classes?.title, row.classes?.section].filter(Boolean).join(' - '),
  }))
}

export async function listProfessorArchive(professorId) {
  const results = await Promise.all([
    listArchivedClasses(professorId),
    listArchivedProjects(professorId),
    listArchivedTasks(professorId),
    listArchivedCurricula(professorId),
    listArchivedSyllabi(professorId),
  ])

  return results
    .flat()
    .sort((left, right) => new Date(right.archivedAt ?? 0) - new Date(left.archivedAt ?? 0))
}

export async function restoreArchiveItem(professorId, type, id) {
  assertArchiveType(type)

  if (type === 'class') {
    const { data, error } = await supabaseAdminClient
      .from('classes')
      .update({ is_archived: false, archived_at: null, archived_by: null })
      .eq('id', id)
      .eq('professor_id', professorId)
      .eq('is_archived', true)
      .select('id')
      .maybeSingle()

    if (error) throw new HttpError(400, 'Unable to restore class', error.message)
    if (!data) throw new HttpError(404, 'Archive item not found')
    return { id, type }
  }

  if (type === 'project') {
    await getOwnedProject(id, professorId)
    const { data, error } = await supabaseAdminClient
      .from('projects')
      .update({ status: 'open', archived_at: null, reopened_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'archived')
      .select('id')
      .maybeSingle()

    if (error) throw new HttpError(400, 'Unable to restore project', error.message)
    if (!data) throw new HttpError(404, 'Archive item not found')
    return { id, type }
  }

  if (type === 'task') {
    const task = await getOwnedTask(id, professorId)
    if (!task.archived_at) throw new HttpError(404, 'Archive item not found')
    const ids = [id, ...(await collectTaskDescendantIds(id))]
    const { error } = await supabaseAdminClient
      .from('tasks')
      .update({ archived_at: null })
      .in('id', ids)

    if (error) throw new HttpError(400, 'Unable to restore task', error.message)
    return { id, type, restoredIds: ids }
  }

  if (type === 'curriculum') {
    const { data, error } = await supabaseAdminClient
      .from('curricula')
      .update({ is_active: true, archived_at: null, archived_by: null })
      .eq('id', id)
      .eq('professor_id', professorId)
      .eq('is_active', false)
      .select('id')
      .maybeSingle()

    if (error) throw new HttpError(400, 'Unable to restore curriculum', error.message)
    if (!data) throw new HttpError(404, 'Archive item not found')
    return { id, type }
  }

  await getOwnedSyllabus(id, professorId)
  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .update({ is_active: true, archived_at: null, archived_by: null })
    .eq('id', id)
    .eq('is_active', false)
    .select('id')
    .maybeSingle()

  if (error) throw new HttpError(400, 'Unable to restore syllabus', error.message)
  if (!data) throw new HttpError(404, 'Archive item not found')
  return { id, type }
}

export async function deleteArchiveItem(professorId, type, id) {
  assertArchiveType(type)

  if (type === 'class') {
    const { data, error } = await supabaseAdminClient
      .from('classes')
      .delete()
      .eq('id', id)
      .eq('professor_id', professorId)
      .eq('is_archived', true)
      .select('id')
      .maybeSingle()

    if (error) throw new HttpError(400, 'Unable to delete class', error.message)
    if (!data) throw new HttpError(404, 'Archive item not found')
    return { id, type }
  }

  if (type === 'project') {
    await getOwnedProject(id, professorId)
    const { data, error } = await supabaseAdminClient
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('status', 'archived')
      .select('id')
      .maybeSingle()

    if (error) throw new HttpError(400, 'Unable to delete project', error.message)
    if (!data) throw new HttpError(404, 'Archive item not found')
    return { id, type }
  }

  if (type === 'task') {
    const task = await getOwnedTask(id, professorId)
    if (!task.archived_at) throw new HttpError(404, 'Archive item not found')
    const ids = [id, ...(await collectTaskDescendantIds(id))]
    const { error } = await supabaseAdminClient
      .from('tasks')
      .delete()
      .in('id', ids)
      .eq('group_id', task.group_id)

    if (error) throw new HttpError(400, 'Unable to delete task', error.message)
    return { id, type, deletedIds: ids }
  }

  if (type === 'curriculum') {
    const { data, error } = await supabaseAdminClient
      .from('curricula')
      .delete()
      .eq('id', id)
      .eq('professor_id', professorId)
      .eq('is_active', false)
      .select('id')
      .maybeSingle()

    if (error) throw new HttpError(400, 'Unable to delete curriculum', error.message)
    if (!data) throw new HttpError(404, 'Archive item not found')
    return { id, type }
  }

  await getOwnedSyllabus(id, professorId)
  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .delete()
    .eq('id', id)
    .eq('is_active', false)
    .select('id')
    .maybeSingle()

  if (error) throw new HttpError(400, 'Unable to delete syllabus', error.message)
  if (!data) throw new HttpError(404, 'Archive item not found')
  return { id, type }
}
