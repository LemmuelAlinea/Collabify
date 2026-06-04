import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { getProgress, getTimeline } from '../controllers/progressController.js'

export const progressRoutes = Router()

progressRoutes.get('/timeline', authenticate, getTimeline)
progressRoutes.get('/', authenticate, getProgress)
