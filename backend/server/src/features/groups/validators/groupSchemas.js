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
  memberLimit: z.coerce.number().int().min(1).max(100).optional().nullable(),
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

export const groupModeSchema = z.enum(['manual', 'random', 'similar_performance', 'student_formed'])

export const groupPreviewSchema = z.object({
  projectId: uuid,
  mode: groupModeSchema,
})

const generatedMemberSchema = z.object({
  userId: uuid,
  displayName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
})

const generatedGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: optionalText(1000),
  members: z.array(generatedMemberSchema).default([]),
})

export const groupGenerationSchema = z.object({
  projectId: uuid,
  mode: groupModeSchema,
  formationStatus: z.enum(['open', 'closed', 'finalized']).optional(),
  groups: z.array(generatedGroupSchema).min(1),
})

export const studentFormedStatusSchema = z.object({
  projectId: uuid,
  status: z.enum(['open', 'closed', 'finalized']),
})

export const popQuizSubmitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1).max(100),
    selectedOption: z.enum(['A', 'B', 'C', 'D']),
  })).length(5),
})
