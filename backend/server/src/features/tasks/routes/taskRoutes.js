import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  getTasks,
  patchTask,
  postTask,
  postTaskComment,
  removeTask,
} from '../controllers/taskController.js'
import {
  commentSchema,
  createTaskSchema,
  updateTaskSchema,
} from '../validators/taskSchemas.js'

export const taskRoutes = Router()

taskRoutes.get('/', authenticate, getTasks)
taskRoutes.post('/', authenticate, validateBody(createTaskSchema), postTask)
taskRoutes.patch('/:id', authenticate, validateBody(updateTaskSchema), patchTask)
taskRoutes.delete('/:id', authenticate, removeTask)
taskRoutes.post('/:id/comments', authenticate, validateBody(commentSchema), postTaskComment)
