import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  getProjectValidations,
  getValidationById,
  patchValidationDecision,
  postAnalyzeProject,
} from '../controllers/projectValidationController.js'
import { validationDecisionSchema } from '../validators/validationSchemas.js'

export const projectValidationRoutes = Router()

projectValidationRoutes.post('/projects/:projectId/analyze', authenticate, requireRole('professor'), postAnalyzeProject)
projectValidationRoutes.get('/projects/:projectId', authenticate, getProjectValidations)
projectValidationRoutes.get('/:id', authenticate, getValidationById)
projectValidationRoutes.patch('/:id/decision', authenticate, requireRole('professor'), validateBody(validationDecisionSchema), patchValidationDecision)
