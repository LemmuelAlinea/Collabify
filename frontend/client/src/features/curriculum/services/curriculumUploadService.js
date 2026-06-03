import { env } from '../../../config/env'
import { supabase } from '../../../lib/supabase/client'

const allowedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export function validateCurriculumFile(file) {
  if (!file) return
  if (!allowedTypes.includes(file.type)) throw new Error('Select a PDF or DOCX curriculum file.')
  if (file.size > 20 * 1024 * 1024) throw new Error('Curriculum file must be 20 MB or smaller.')
}

export async function uploadCurriculumFile(userId, file) {
  validateCurriculumFile(file)

  const extension = file.name.split('.').pop()
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(env.curriculaBucket)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new Error(error.message)

  return {
    storagePath: path,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
  }
}
