import { supabaseAdminClient } from '../../../integrations/supabase/client.js'
import { HttpError } from '../../../core/errors/httpError.js'
import { assertProfessorOwnsClass } from '../../classes/services/classService.js'

const SYLLABUS_SELECT = `
  id,
  class_id,
  uploaded_by,
  title,
  description,
  storage_path,
  file_name,
  mime_type,
  file_size_bytes,
  version,
  is_active,
  effective_from,
  effective_to,
  archived_at,
  created_at,
  updated_at,
  classes:class_id (
    id,
    code,
    title,
    section,
    term,
    academic_year,
    professor_id
  )
`

function normalizeSyllabus(syllabus) {
  return {
    id: syllabus.id,
    classId: syllabus.class_id,
    uploadedBy: syllabus.uploaded_by,
    title: syllabus.title,
    description: syllabus.description,
    storagePath: syllabus.storage_path,
    fileName: syllabus.file_name,
    mimeType: syllabus.mime_type,
    fileSizeBytes: syllabus.file_size_bytes,
    version: syllabus.version,
    isActive: syllabus.is_active,
    effectiveFrom: syllabus.effective_from,
    effectiveTo: syllabus.effective_to,
    archivedAt: syllabus.archived_at,
    createdAt: syllabus.created_at,
    updatedAt: syllabus.updated_at,
    class: syllabus.classes ? {
      id: syllabus.classes.id,
      code: syllabus.classes.code,
      title: syllabus.classes.title,
      section: syllabus.classes.section,
      term: syllabus.classes.term,
      academicYear: syllabus.classes.academic_year,
    } : null,
  }
}

async function getOwnedSyllabus(id, professorId) {
  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .select(SYLLABUS_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) {
    throw new HttpError(404, 'Syllabus not found')
  }

  if (data.classes?.professor_id !== professorId) {
    throw new HttpError(403, 'You do not have permission to manage this syllabus')
  }

  return data
}

export async function listProfessorSyllabi(professorId) {
  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .select(SYLLABUS_SELECT.replace('classes:class_id', 'classes:class_id!inner'))
    .eq('classes.professor_id', professorId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new HttpError(400, 'Unable to load syllabi', error.message)
  }

  return data.map(normalizeSyllabus)
}

export async function createSyllabus(professorId, payload) {
  await assertProfessorOwnsClass(payload.classId, professorId)

  const { data: latest } = await supabaseAdminClient
    .from('syllabi')
    .select('version')
    .eq('class_id', payload.classId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .insert({
      class_id: payload.classId,
      uploaded_by: professorId,
      title: payload.title,
      description: payload.description,
      storage_path: payload.storagePath,
      file_name: payload.fileName,
      mime_type: payload.mimeType,
      file_size_bytes: payload.fileSizeBytes,
      version: (latest?.version ?? 0) + 1,
      effective_from: payload.effectiveFrom,
      effective_to: payload.effectiveTo,
      is_active: true,
    })
    .select(SYLLABUS_SELECT)
    .single()

  if (error) {
    throw new HttpError(400, 'Unable to create syllabus', error.message)
  }

  return normalizeSyllabus(data)
}

export async function updateSyllabus(professorId, syllabusId, payload) {
  const existing = await getOwnedSyllabus(syllabusId, professorId)

  if (payload.classId) {
    await assertProfessorOwnsClass(payload.classId, professorId)
  }

  const updatePayload = {
    class_id: payload.classId,
    title: payload.title,
    description: payload.description,
    storage_path: payload.storagePath,
    file_name: payload.fileName,
    mime_type: payload.mimeType,
    file_size_bytes: payload.fileSizeBytes,
    effective_from: payload.effectiveFrom,
    effective_to: payload.effectiveTo,
    is_active: true,
    archived_at: null,
    archived_by: null,
  }

  if (payload.classId && payload.classId !== existing.class_id) {
    const { data: latest } = await supabaseAdminClient
      .from('syllabi')
      .select('version')
      .eq('class_id', payload.classId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    updatePayload.version = (latest?.version ?? 0) + 1
  }

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) delete updatePayload[key]
  })

  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .update(updatePayload)
    .eq('id', syllabusId)
    .select(SYLLABUS_SELECT)
    .single()

  if (error) {
    throw new HttpError(400, 'Unable to update syllabus', error.message)
  }

  return normalizeSyllabus(data)
}

export async function archiveSyllabus(professorId, syllabusId) {
  await getOwnedSyllabus(syllabusId, professorId)

  const { data, error } = await supabaseAdminClient
    .from('syllabi')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      archived_by: professorId,
    })
    .eq('id', syllabusId)
    .select(SYLLABUS_SELECT)
    .single()

  if (error) {
    throw new HttpError(400, 'Unable to archive syllabus', error.message)
  }

  return normalizeSyllabus(data)
}

export async function createSyllabusDownloadUrl(professorId, syllabusId) {
  const syllabus = await getOwnedSyllabus(syllabusId, professorId)

  const { data, error } = await supabaseAdminClient.storage
    .from('syllabi')
    .createSignedUrl(syllabus.storage_path, 60 * 5)

  if (error) {
    throw new HttpError(400, 'Unable to create download URL', error.message)
  }

  return data.signedUrl
}
