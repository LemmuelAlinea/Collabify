import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  getReassignments,
  patchReassignmentReview,
  postReassignment,
} from '../controllers/reassignmentController.js'
import {
  createReassignmentSchema,
  reviewReassignmentSchema,
} from '../validators/reassignmentSchemas.js'

export const reassignmentRoutes = Router()

reassignmentRoutes.get('/', authenticate, getReassignments)
reassignmentRoutes.post('/', authenticate, validateBody(createReassignmentSchema), postReassignment)
reassignmentRoutes.patch('/:id/review', authenticate, requireRole('professor'), validateBody(reviewReassignmentSchema), patchReassignmentReview)
