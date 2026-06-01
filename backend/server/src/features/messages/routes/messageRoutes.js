import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { validateBody, validateQuery } from '../../../core/middleware/validateRequest.js'
import {
  deleteMessageController,
  getMessages,
  postMessage,
  putPinnedMessage,
} from '../controllers/messageController.js'
import {
  createMessageSchema,
  deleteMessageSchema,
  listMessagesSchema,
  pinMessageSchema,
} from '../validators/messageSchemas.js'

export const messageRoutes = Router()

messageRoutes.get('/', authenticate, validateQuery(listMessagesSchema), getMessages)
messageRoutes.post('/', authenticate, validateBody(createMessageSchema), postMessage)
messageRoutes.delete('/:id', authenticate, validateBody(deleteMessageSchema), deleteMessageController)
messageRoutes.put('/:id/pin', authenticate, validateBody(pinMessageSchema), putPinnedMessage)
