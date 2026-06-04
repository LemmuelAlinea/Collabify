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

export function validateProjectFile(file) {
  if (!file) return

  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Only PDF and DOCX project files are supported.')
  }

  if (file.size > MAX_SIZE) {
    throw new Error('Project file must be 20 MB or smaller.')
  }
}

export async function uploadProjectFile(userId, file) {
  validateProjectFile(file)

  const extension = getExtension(file)
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(env.projectFilesBucket)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error

  return {
    fileStoragePath: storagePath,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
  }
}
