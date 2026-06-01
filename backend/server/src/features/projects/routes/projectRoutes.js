import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  deleteProject,
  getProjectById,
  getProjects,
  getProjectsByClass,
  patchDeadline,
  patchProject,
  postProject,
  postReopenProject,
} from '../controllers/projectController.js'
import { createProjectSchema, deadlineSchema, updateProjectSchema } from '../validators/projectSchemas.js'

export const projectRoutes = Router()

projectRoutes.get('/', authenticate, getProjects)
projectRoutes.get('/class/:classId', authenticate, getProjectsByClass)
projectRoutes.get('/:id', authenticate, getProjectById)
projectRoutes.post('/', authenticate, requireRole('professor'), validateBody(createProjectSchema), postProject)
projectRoutes.patch('/:id', authenticate, requireRole('professor'), validateBody(updateProjectSchema), patchProject)
projectRoutes.delete('/:id', authenticate, requireRole('professor'), deleteProject)
projectRoutes.post('/:id/reopen', authenticate, requireRole('professor'), postReopenProject)
projectRoutes.patch('/:id/deadline', authenticate, requireRole('professor'), validateBody(deadlineSchema), patchDeadline)
