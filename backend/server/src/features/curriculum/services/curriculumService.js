import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { HttpError } from '../../../core/errors/httpError.js'

const CURRICULUM_SELECT = `
  id,
  professor_id,
  title,
  description,
  program_objectives,
  program_outcomes,
  curriculum_components,
  academic_year,
  storage_path,
  file_name,
  mime_type,
  file_size_bytes,
  is_active,
  archived_at,
  archived_by,
  created_at,
  updated_at,
  programStudies:curriculum_program_studies (
    id,
    curriculum_id,
    title,
    content,
    sort_order,
    created_at,
    updated_at
  )
`

function normalizeProgramStudy(item) {
  return {
    id: item.id,
    curriculumId: item.curriculum_id,
    title: item.title,
    content: item.content,
    sortOrder: item.sort_order,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }
}

export function normalizeCurriculum(curriculum) {
  return {
    id: curriculum.id,
    professorId: curriculum.professor_id,
    title: curriculum.title,
    description: curriculum.description,
    programObjectives: curriculum.program_objectives,
    programOutcomes: curriculum.program_outcomes,
    curriculumComponents: curriculum.curriculum_components,
    academicYear: curriculum.academic_year,
    storagePath: curriculum.storage_path,
    fileName: curriculum.file_name,
    mimeType: curriculum.mime_type,
    fileSizeBytes: curriculum.file_size_bytes,
    isActive: curriculum.is_active,
    archivedAt: curriculum.archived_at,
    archivedBy: curriculum.archived_by,
    createdAt: curriculum.created_at,
    updatedAt: curriculum.updated_at,
    programStudies: (curriculum.programStudies ?? [])
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(normalizeProgramStudy),
  }
}

export async function assertProfessorOwnsCurriculum(curriculumId, professorId) {
  if (!curriculumId) return

  const { data, error } = await supabaseAdminClient
    .from('curricula')
    .select('id')
    .eq('id', curriculumId)
    .eq('professor_id', professorId)
    .maybeSingle()

  if (error || !data) {
    throw new HttpError(400, 'Selected curriculum is invalid', error?.message)
  }
}

async function getOwnedCurriculum(curriculumId, professorId) {
  const { data, error } = await supabaseAdminClient
    .from('curricula')
    .select(CURRICULUM_SELECT)
    .eq('id', curriculumId)
    .eq('professor_id', professorId)
    .single()

  if (error || !data) throw new HttpError(404, 'Curriculum not found')
  return data
}

async function replaceProgramStudies(curriculumId, programStudies) {
  if (!Array.isArray(programStudies)) return

  const { error: deleteError } = await supabaseAdminClient
    .from('curriculum_program_studies')
    .delete()
    .eq('curriculum_id', curriculumId)

  if (deleteError) throw new HttpError(400, 'Unable to update program of study', deleteError.message)

  const rows = programStudies
    .map((study, index) => {
      const content = typeof study === 'string' ? study : study?.content
      const title = typeof study === 'string' ? study.slice(0, 120) : study?.title
      return {
        curriculum_id: curriculumId,
        title: title || content?.slice(0, 120) || `Program of Study ${index + 1}`,
        content,
        sort_order: index,
      }
    })
    .filter((item) => item.content)

  if (!rows.length) return

  const { error } = await supabaseAdminClient
    .from('curriculum_program_studies')
    .insert(rows)

  if (error) throw new HttpError(400, 'Unable to save program of study', error.message)
}

export async function listProfessorCurricula(professorId, includeArchived = true) {
  let query = supabaseAdminClient
    .from('curricula')
    .select(CURRICULUM_SELECT)
    .eq('professor_id', professorId)
    .order('created_at', { ascending: false })

  if (!includeArchived) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new HttpError(400, 'Unable to load curricula', error.message)

  return (data ?? []).map(normalizeCurriculum)
}

export async function getCurriculum(professorId, curriculumId) {
  return normalizeCurriculum(await getOwnedCurriculum(curriculumId, professorId))
}

export async function createCurriculum(professorId, payload) {
  const { data, error } = await supabaseAdminClient
    .from('curricula')
    .insert({
      professor_id: professorId,
      title: payload.title,
      description: payload.description,
      program_objectives: payload.programObjectives,
      program_outcomes: payload.programOutcomes,
      curriculum_components: payload.curriculumComponents,
      academic_year: payload.academicYear,
      storage_path: payload.storagePath,
      file_name: payload.fileName,
      mime_type: payload.mimeType,
      file_size_bytes: payload.fileSizeBytes,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) throw new HttpError(400, 'Unable to create curriculum', error.message)

  await replaceProgramStudies(data.id, payload.programStudies ?? [])
  return getCurriculum(professorId, data.id)
}

export async function updateCurriculum(professorId, curriculumId, payload) {
  await getOwnedCurriculum(curriculumId, professorId)

  const updatePayload = {
    title: payload.title,
    description: payload.description,
    program_objectives: payload.programObjectives,
    program_outcomes: payload.programOutcomes,
    curriculum_components: payload.curriculumComponents,
    academic_year: payload.academicYear,
    storage_path: payload.storagePath,
    file_name: payload.fileName,
    mime_type: payload.mimeType,
    file_size_bytes: payload.fileSizeBytes,
    is_active: true,
    archived_at: null,
    archived_by: null,
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key]
  })

  if (Object.keys(updatePayload).length) {
    const { error } = await supabaseAdminClient
      .from('curricula')
      .update(updatePayload)
      .eq('id', curriculumId)
      .eq('professor_id', professorId)

    if (error) throw new HttpError(400, 'Unable to update curriculum', error.message)
  }

  if (payload.programStudies !== undefined) await replaceProgramStudies(curriculumId, payload.programStudies)
  return getCurriculum(professorId, curriculumId)
}

export async function archiveCurriculum(professorId, curriculumId) {
  await getOwnedCurriculum(curriculumId, professorId)

  const { error } = await supabaseAdminClient
    .from('curricula')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      archived_by: professorId,
    })
    .eq('id', curriculumId)
    .eq('professor_id', professorId)

  if (error) throw new HttpError(400, 'Unable to archive curriculum', error.message)
  return getCurriculum(professorId, curriculumId)
}

export async function createCurriculumDownloadUrl(professorId, curriculumId) {
  const curriculum = await getOwnedCurriculum(curriculumId, professorId)
  if (!curriculum.storage_path) throw new HttpError(404, 'Curriculum file not found')

  const { data, error } = await supabaseAdminClient.storage
    .from('curricula')
    .createSignedUrl(curriculum.storage_path, 60 * 5)

  if (error) throw new HttpError(400, 'Unable to create download URL', error.message)
  return data.signedUrl
}
