import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  getEligibleMembers,
  getGroup,
  getGroups,
  patchGroup,
  patchGroupMember,
  postGroupMember,
  postGroup,
  postJoinGroup,
} from '../controllers/groupController.js'
import {
  addMemberSchema,
  createGroupSchema,
  updateGroupSchema,
  updateMemberSchema,
} from '../validators/groupSchemas.js'

export const groupRoutes = Router()

groupRoutes.get('/', authenticate, getGroups)
groupRoutes.get('/:id', authenticate, getGroup)
groupRoutes.get('/:id/eligible-members', authenticate, requireRole('professor'), getEligibleMembers)
groupRoutes.post('/', authenticate, validateBody(createGroupSchema), postGroup)
groupRoutes.post('/:id/join', authenticate, requireRole('student'), postJoinGroup)
groupRoutes.post('/:id/members', authenticate, requireRole('professor'), validateBody(addMemberSchema), postGroupMember)
groupRoutes.patch('/:id', authenticate, validateBody(updateGroupSchema), patchGroup)
groupRoutes.patch('/:id/members/:userId', authenticate, validateBody(updateMemberSchema), patchGroupMember)
