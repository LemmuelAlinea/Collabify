import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import { getOwnProfile, updateOwnProfile } from '../controllers/profileController.js'
import { updateProfileSchema } from '../validators/profileSchemas.js'

export const profileRoutes = Router()

profileRoutes.get('/me', authenticate, getOwnProfile)
profileRoutes.patch('/me', authenticate, validateBody(updateProfileSchema), updateOwnProfile)
