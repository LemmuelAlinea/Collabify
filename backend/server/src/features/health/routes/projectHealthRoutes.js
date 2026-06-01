import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { validateQuery } from '../../../core/middleware/validateRequest.js'
import {
  getProjectHealth,
  postEvaluateProjectHealth,
} from '../controllers/projectHealthController.js'
import { healthQuerySchema } from '../validators/projectHealthSchemas.js'

export const projectHealthRoutes = Router()

projectHealthRoutes.get('/', authenticate, validateQuery(healthQuerySchema), getProjectHealth)
projectHealthRoutes.post('/evaluate', authenticate, validateQuery(healthQuerySchema), postEvaluateProjectHealth)
