import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  getAvailableGroups,
  getEligibleMembers,
  getGroup,
  getGroups,
  patchGroup,
  patchGroupMember,
  patchStudentFormedGroupsStatus,
  postGroupGeneration,
  postGroupPreview,
  postGroupMember,
  postGroup,
  postJoinGroup,
} from '../controllers/groupController.js'
import {
  addMemberSchema,
  createGroupSchema,
  groupGenerationSchema,
  groupPreviewSchema,
  updateGroupSchema,
  updateMemberSchema,
  studentFormedStatusSchema,
} from '../validators/groupSchemas.js'

export const groupRoutes = Router()

groupRoutes.get('/', authenticate, getGroups)
groupRoutes.get('/available', authenticate, getAvailableGroups)
groupRoutes.get('/:id', authenticate, getGroup)
groupRoutes.get('/:id/eligible-members', authenticate, requireRole('professor'), getEligibleMembers)
groupRoutes.post('/preview', authenticate, requireRole('professor'), validateBody(groupPreviewSchema), postGroupPreview)
groupRoutes.post('/generate', authenticate, requireRole('professor'), validateBody(groupGenerationSchema), postGroupGeneration)
groupRoutes.patch('/student-formed/status', authenticate, requireRole('professor'), validateBody(studentFormedStatusSchema), patchStudentFormedGroupsStatus)
groupRoutes.post('/', authenticate, validateBody(createGroupSchema), postGroup)
groupRoutes.post('/:id/join', authenticate, requireRole('student'), postJoinGroup)
groupRoutes.post('/:id/members', authenticate, requireRole('professor'), validateBody(addMemberSchema), postGroupMember)
groupRoutes.patch('/:id', authenticate, validateBody(updateGroupSchema), patchGroup)
groupRoutes.patch('/:id/members/:userId', authenticate, validateBody(updateMemberSchema), patchGroupMember)
