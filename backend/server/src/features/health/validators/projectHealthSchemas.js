import { z } from 'zod'

export const healthQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
})
