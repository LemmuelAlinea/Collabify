import { z } from 'zod'

const uuid = z.string().uuid()

export const notificationQuerySchema = z.object({
  type: z.string().trim().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  classId: uuid.optional(),
  projectId: uuid.optional(),
  groupId: uuid.optional(),
  unread: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
})

export const markSelectedReadSchema = z.object({
  ids: z.array(uuid).min(1).max(100),
})

export const activityQuerySchema = z.object({
  classId: uuid.optional(),
  projectId: uuid.optional(),
  groupId: uuid.optional(),
  taskId: uuid.optional(),
  actorId: uuid.optional(),
  entityType: z.string().trim().max(80).optional(),
})
