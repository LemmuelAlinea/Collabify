import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  deleteClass,
  getClass,
  getMyClasses,
  patchClass,
  postClass,
  postJoinClass,
  putClassSyllabus,
} from '../controllers/classController.js'
import {
  assignSyllabusSchema,
  createClassSchema,
  joinClassSchema,
  updateClassSchema,
} from '../validators/classSchemas.js'

export const classRoutes = Router()

classRoutes.get('/mine', authenticate, getMyClasses)
classRoutes.post('/', authenticate, requireRole('professor'), validateBody(createClassSchema), postClass)
classRoutes.post('/join', authenticate, requireRole('student'), validateBody(joinClassSchema), postJoinClass)
classRoutes.get('/:id', authenticate, getClass)
classRoutes.patch('/:id', authenticate, requireRole('professor'), validateBody(updateClassSchema), patchClass)
classRoutes.delete('/:id', authenticate, requireRole('professor'), deleteClass)
classRoutes.put('/:id/syllabus', authenticate, requireRole('professor'), validateBody(assignSyllabusSchema), putClassSyllabus)
