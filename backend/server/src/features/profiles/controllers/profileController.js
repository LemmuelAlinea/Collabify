import { getProfileByUserId, updateProfile } from '../services/profileService.js'

export async function getOwnProfile(req, res, next) {
  try {
    const profile = await getProfileByUserId(req.auth.user.id)
    res.json({ profile })
  } catch (error) {
    next(error)
  }
}

export async function updateOwnProfile(req, res, next) {
  try {
    const profile = await updateProfile(req.auth.user.id, req.body, req.auth.role)
    res.json({ profile })
  } catch (error) {
    next(error)
  }
}
