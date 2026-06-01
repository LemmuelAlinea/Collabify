import { env } from '../../../config/env'
import { supabase } from '../../../lib/supabase/client'

const MAX_SIZE = 100 * 1024 * 1024

function extensionFor(file) {
  return file.name.split('.').pop()?.toLowerCase() || 'bin'
}

export function validateSubmissionFile(file) {
  if (!file) throw new Error('Select a submission file.')
  if (file.size > MAX_SIZE) throw new Error('Submission file must be 100 MB or smaller.')
}

export async function uploadSubmissionFile(userId, taskId, file) {
  validateSubmissionFile(file)

  const storagePath = `${taskId}/${userId}/${crypto.randomUUID()}.${extensionFor(file)}`
  const { error } = await supabase.storage
    .from(env.submissionsBucket)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (error) throw error

  return {
    storagePath,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSizeBytes: file.size,
  }
}
