import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { getContributions } from '../controllers/contributionController.js'

export const contributionRoutes = Router()

contributionRoutes.get('/', authenticate, getContributions)
