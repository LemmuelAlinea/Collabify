import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import {
  getArchive,
  postArchiveRestore,
  removeArchiveItem,
} from '../controllers/archiveController.js'

export const archiveRoutes = Router()

archiveRoutes.use(authenticate, requireRole('professor'))

archiveRoutes.get('/', getArchive)
archiveRoutes.post('/:type/:id/restore', postArchiveRestore)
archiveRoutes.delete('/:type/:id', removeArchiveItem)
