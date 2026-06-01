import { z } from 'zod'

const uuid = z.string().uuid()

export const generatePlanSchema = z.object({
  projectId: uuid,
  groupId: uuid.optional().nullable(),
  mode: z.enum(['replace', 'merge', 'draft']).default('draft'),
})

export const acceptPlanSchema = z.object({
  mode: z.enum(['replace', 'merge']).default('merge'),
})
