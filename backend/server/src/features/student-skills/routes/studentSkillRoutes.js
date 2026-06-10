import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import { getOwnSkills, replaceOwnSkills } from '../controllers/studentSkillController.js'
import { replaceSkillSetSchema } from '../validators/studentSkillSchemas.js'

export const studentSkillRoutes = Router()

studentSkillRoutes.get('/me', authenticate, requireRole('student'), getOwnSkills)
studentSkillRoutes.put(
  '/me',
  authenticate,
  requireRole('student'),
  validateBody(replaceSkillSetSchema),
  replaceOwnSkills,
)
