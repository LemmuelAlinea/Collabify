import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { getProgress } from '../controllers/progressController.js'

export const progressRoutes = Router()

progressRoutes.get('/', authenticate, getProgress)
