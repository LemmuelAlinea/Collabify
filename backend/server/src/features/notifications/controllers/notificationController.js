import {
  getUnreadCount,
  listActivities,
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
} from '../services/notificationService.js'

export async function getNotifications(req, res, next) {
  try {
    const notifications = await listNotifications(req.auth.user.id, req.query)
    res.json({ notifications })
  } catch (error) {
    next(error)
  }
}

export async function getNotificationCount(req, res, next) {
  try {
    const unreadCount = await getUnreadCount(req.auth.user.id)
    res.json({ unreadCount })
  } catch (error) {
    next(error)
  }
}

export async function patchNotificationsRead(req, res, next) {
  try {
    const notifications = await markNotificationsRead(req.auth.user.id, req.body.ids)
    res.json({ notifications })
  } catch (error) {
    next(error)
  }
}

export async function patchAllNotificationsRead(req, res, next) {
  try {
    const notifications = await markAllNotificationsRead(req.auth.user.id)
    res.json({ notifications })
  } catch (error) {
    next(error)
  }
}

export async function getActivity(req, res, next) {
  try {
    const activity = await listActivities(req.auth.user.id, req.auth.role, req.query)
    res.json({ activity })
  } catch (error) {
    next(error)
  }
}
