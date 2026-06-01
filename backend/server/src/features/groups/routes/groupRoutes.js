import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  getGroup,
  getGroups,
  patchGroup,
  patchGroupMember,
  postGroup,
  postJoinGroup,
} from '../controllers/groupController.js'
import {
  createGroupSchema,
  updateGroupSchema,
  updateMemberSchema,
} from '../validators/groupSchemas.js'

export const groupRoutes = Router()

groupRoutes.get('/', authenticate, getGroups)
groupRoutes.get('/:id', authenticate, getGroup)
groupRoutes.post('/', authenticate, validateBody(createGroupSchema), postGroup)
groupRoutes.post('/:id/join', authenticate, requireRole('student'), postJoinGroup)
groupRoutes.patch('/:id', authenticate, validateBody(updateGroupSchema), patchGroup)
groupRoutes.patch('/:id/members/:userId', authenticate, validateBody(updateMemberSchema), patchGroupMember)
