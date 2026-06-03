import { Router } from 'express'
import { announcementRoutes } from './features/announcements/routes/announcementRoutes.js'
import { analyticsRoutes } from './features/analytics/routes/analyticsRoutes.js'
import { authRoutes } from './features/auth/routes/authRoutes.js'
import { classRoutes } from './features/classes/routes/classRoutes.js'
import { contributionRoutes } from './features/contributions/routes/contributionRoutes.js'
import { curriculumRoutes } from './features/curriculum/routes/curriculumRoutes.js'
import { groupRoutes } from './features/groups/routes/groupRoutes.js'
import { messageRoutes } from './features/messages/routes/messageRoutes.js'
import { notificationRoutes } from './features/notifications/routes/notificationRoutes.js'
import { projectHealthRoutes } from './features/health/routes/projectHealthRoutes.js'
import { profileRoutes } from './features/profiles/routes/profileRoutes.js'
import { taskGenerationRoutes } from './features/planning/routes/taskGenerationRoutes.js'
import { progressRoutes } from './features/progress/routes/progressRoutes.js'
import { projectRoutes } from './features/projects/routes/projectRoutes.js'
import { projectValidationRoutes } from './features/validations/routes/projectValidationRoutes.js'
import { reassignmentRoutes } from './features/reassignments/routes/reassignmentRoutes.js'
import { syllabusRoutes } from './features/syllabus/routes/syllabusRoutes.js'
import { submissionRoutes } from './features/submissions/routes/submissionRoutes.js'
import { taskRoutes } from './features/tasks/routes/taskRoutes.js'

export const routes = Router()

routes.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

routes.use('/auth', authRoutes)
routes.use('/announcements', announcementRoutes)
routes.use('/analytics', analyticsRoutes)
routes.use('/classes', classRoutes)
routes.use('/contributions', contributionRoutes)
routes.use('/curricula', curriculumRoutes)
routes.use('/groups', groupRoutes)
routes.use('/messages', messageRoutes)
routes.use('/notifications', notificationRoutes)
routes.use('/project-health', projectHealthRoutes)
routes.use('/profiles', profileRoutes)
routes.use('/planning', taskGenerationRoutes)
routes.use('/progress', progressRoutes)
routes.use('/projects', projectRoutes)
routes.use('/validations', projectValidationRoutes)
routes.use('/reassignments', reassignmentRoutes)
routes.use('/syllabi', syllabusRoutes)
routes.use('/submissions', submissionRoutes)
routes.use('/tasks', taskRoutes)
