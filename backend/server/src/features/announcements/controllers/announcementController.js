import {
  createAnnouncement,
  deleteAnnouncement,
  listClassAnnouncements,
  updateAnnouncement,
} from '../services/announcementService.js'

export async function getClassAnnouncements(req, res, next) {
  try {
    const announcements = await listClassAnnouncements(
      req.auth.user.id,
      req.auth.role,
      req.params.classId,
    )
    res.json({ announcements })
  } catch (error) {
    next(error)
  }
}

export async function postAnnouncement(req, res, next) {
  try {
    const announcement = await createAnnouncement(req.auth.user.id, req.body)
    res.status(201).json({ announcement })
  } catch (error) {
    next(error)
  }
}

export async function patchAnnouncement(req, res, next) {
  try {
    const announcement = await updateAnnouncement(req.auth.user.id, req.params.id, req.body)
    res.json({ announcement })
  } catch (error) {
    next(error)
  }
}

export async function removeAnnouncement(req, res, next) {
  try {
    const announcement = await deleteAnnouncement(req.auth.user.id, req.params.id)
    res.json({ announcement })
  } catch (error) {
    next(error)
  }
}
