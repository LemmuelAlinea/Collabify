import { z } from 'zod'

const uuid = z.string().uuid()

const editableGeneratedTaskSchema = z.lazy(() => z.object({
  id: uuid,
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).optional().nullable(),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
  subtasks: z.array(editableGeneratedTaskSchema).optional().default([]),
}))

export const generatePlanSchema = z.object({
  projectId: uuid,
  groupId: uuid.optional().nullable(),
  mode: z.enum(['replace', 'merge', 'draft']).default('draft'),
})

export const acceptPlanSchema = z.object({
  mode: z.enum(['replace', 'merge']).default('merge'),
  tasks: z.array(editableGeneratedTaskSchema).optional().default([]),
})
