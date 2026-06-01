import { env } from '../../../config/env'
import { supabase } from '../../../lib/supabase/client'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024

function getExtension(fileName) {
  const extension = fileName.split('.').pop()
  return extension ? extension.toLowerCase() : 'png'
}

export async function uploadProfilePhoto(userId, file) {
  if (!file) return null

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Profile photo must be a JPG, PNG, WebP, or GIF image.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Profile photo must be 5 MB or smaller.')
  }

  const path = `${userId}/${crypto.randomUUID()}.${getExtension(file.name)}`
  const bucket = env.profileAssetsBucket

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
