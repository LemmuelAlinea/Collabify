import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  getGeneratedPlans,
  postAcceptPlan,
  postGeneratePlan,
} from '../controllers/taskGenerationController.js'
import {
  acceptPlanSchema,
  generatePlanSchema,
} from '../validators/taskGenerationSchemas.js'

export const taskGenerationRoutes = Router()

taskGenerationRoutes.get('/', authenticate, getGeneratedPlans)
taskGenerationRoutes.post('/generate', authenticate, validateBody(generatePlanSchema), postGeneratePlan)
taskGenerationRoutes.post('/:id/accept', authenticate, validateBody(acceptPlanSchema), postAcceptPlan)
