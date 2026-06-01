import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { validateBody, validateQuery } from '../../../core/middleware/validateRequest.js'
import {
  getActivity,
  getNotificationCount,
  getNotifications,
  patchAllNotificationsRead,
  patchNotificationsRead,
} from '../controllers/notificationController.js'
import {
  activityQuerySchema,
  markSelectedReadSchema,
  notificationQuerySchema,
} from '../validators/notificationSchemas.js'

export const notificationRoutes = Router()

notificationRoutes.get('/', authenticate, validateQuery(notificationQuerySchema), getNotifications)
notificationRoutes.get('/count', authenticate, getNotificationCount)
notificationRoutes.patch('/read', authenticate, validateBody(markSelectedReadSchema), patchNotificationsRead)
notificationRoutes.patch('/read-all', authenticate, patchAllNotificationsRead)
notificationRoutes.get('/activity', authenticate, validateQuery(activityQuerySchema), getActivity)
