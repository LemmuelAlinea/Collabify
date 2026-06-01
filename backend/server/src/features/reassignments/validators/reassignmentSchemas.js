import { z } from 'zod'

const scorePolicy = z.enum(['keep_original', 'split_50_50', 'full_transfer'])

export const createReassignmentSchema = z.object({
  taskId: z.string().uuid(),
  currentAssigneeId: z.string().uuid(),
  requestedAssigneeId: z.string().uuid(),
  reason: z.string().trim().min(1, 'Reason is required').max(2000),
  scorePolicy: scorePolicy.default('keep_original'),
})

export const reviewReassignmentSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().trim().max(2000).optional().nullable().transform((value) => value || null),
  scorePolicy: scorePolicy.optional(),
})
