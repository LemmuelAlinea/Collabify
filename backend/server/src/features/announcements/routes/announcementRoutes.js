import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  getClassAnnouncements,
  patchAnnouncement,
  postAnnouncement,
  removeAnnouncement,
} from '../controllers/announcementController.js'
import { createAnnouncementSchema, updateAnnouncementSchema } from '../validators/announcementSchemas.js'

export const announcementRoutes = Router()

announcementRoutes.get('/class/:classId', authenticate, getClassAnnouncements)
announcementRoutes.post('/', authenticate, requireRole('professor'), validateBody(createAnnouncementSchema), postAnnouncement)
announcementRoutes.patch('/:id', authenticate, requireRole('professor'), validateBody(updateAnnouncementSchema), patchAnnouncement)
announcementRoutes.delete('/:id', authenticate, requireRole('professor'), removeAnnouncement)
