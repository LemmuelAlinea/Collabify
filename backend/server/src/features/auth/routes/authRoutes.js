import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { getSessionUser } from '../controllers/authController.js'

export const authRoutes = Router()

authRoutes.get('/me', authenticate, getSessionUser)
authRoutes.get('/student/session', authenticate, requireRole('student'), getSessionUser)
authRoutes.get('/professor/session', authenticate, requireRole('professor'), getSessionUser)
