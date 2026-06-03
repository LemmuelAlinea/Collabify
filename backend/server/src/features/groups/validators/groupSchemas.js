import { z } from 'zod'

const uuid = z.string().uuid()
const optionalText = (max) => z
  .string()
  .trim()
  .max(max)
  .optional()
  .nullable()
  .transform((value) => value === undefined ? undefined : value || null)

export const createGroupSchema = z.object({
  projectId: uuid,
  name: z.string().trim().min(1, 'Group name is required').max(120),
  description: optionalText(1000),
})

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: optionalText(1000),
  isLocked: z.boolean().optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
})

export const updateMemberSchema = z.object({
  isLeader: z.boolean().optional(),
  status: z.enum(['active', 'removed']).optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
})

export const addMemberSchema = z.object({
  userId: uuid,
})
