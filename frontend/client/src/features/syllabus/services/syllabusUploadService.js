import { env } from '../../../config/env'
import { supabase } from '../../../lib/supabase/client'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 20 * 1024 * 1024

function getExtension(file) {
  const fallback = file.type === 'application/pdf' ? 'pdf' : 'docx'
  return file.name.split('.').pop()?.toLowerCase() || fallback
}

export function validateSyllabusFile(file) {
  if (!file) {
    throw new Error('Select a PDF or DOCX syllabus file.')
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Only PDF and DOCX files are supported.')
  }

  if (file.size > MAX_SIZE) {
    throw new Error('Syllabus file must be 20 MB or smaller.')
  }
}

export async function uploadSyllabusFile(userId, file) {
  validateSyllabusFile(file)

  const extension = getExtension(file)
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(env.syllabiBucket)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error

  return {
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
  }
}
