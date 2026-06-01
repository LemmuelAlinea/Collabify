import { env } from '../../../config/env'
import { supabase } from '../../../lib/supabase/client'

const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]

export function validateMessageFiles(files) {
  if (files.length > 6) throw new Error('Upload up to 6 files only.')

  files.forEach((file) => {
    if (!allowedTypes.includes(file.type)) throw new Error(`${file.name} is not supported.`)
    if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name} exceeds 25MB.`)
  })
}

export async function uploadMessageFiles(userId, chatId, files) {
  validateMessageFiles(files)

  return Promise.all(files.map(async (file) => {
    const extension = file.name.split('.').pop() || 'bin'
    const storagePath = `${chatId}/${userId}/${crypto.randomUUID()}.${extension}`

    const { error } = await supabase.storage
      .from(env.messageAttachmentsBucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })

    if (error) throw error

    return {
      storageBucket: env.messageAttachmentsBucket,
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
    }
  }))
}
