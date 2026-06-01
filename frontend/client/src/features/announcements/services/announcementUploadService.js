import { env } from '../../../config/env'
import { supabase } from '../../../lib/supabase/client'

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function validateAnnouncementPhotos(files) {
  if (files.length > 8) throw new Error('Upload up to 8 photos only.')

  files.forEach((file) => {
    if (!allowedImageTypes.includes(file.type)) throw new Error(`${file.name} is not a supported image type.`)
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} exceeds 10MB.`)
  })
}

export async function uploadAnnouncementPhotos(userId, classId, files) {
  validateAnnouncementPhotos(files)

  return Promise.all(files.map(async (file) => {
    const extension = file.name.split('.').pop() || 'bin'
    const storagePath = `${classId}/${userId}/${crypto.randomUUID()}.${extension}`

    const { error } = await supabase.storage
      .from(env.announcementAttachmentsBucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })

    if (error) throw error

    return {
      storageBucket: env.announcementAttachmentsBucket,
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
    }
  }))
}

