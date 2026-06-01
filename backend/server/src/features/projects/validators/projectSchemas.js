import { z } from 'zod'

export const projectTypes = [
  'web_development',
  'mobile_application',
  'system_development',
  'research',
  'capstone',
  'group_programming',
  'individual_programming',
]

const optionalText = (max) => z
  .string()
  .trim()
  .max(max)
  .optional()
  .nullable()
  .transform((value) => value === undefined ? undefined : value || null)

const isoDateTime = z.string().datetime({ offset: true })

const projectBaseSchema = z.object({
  classId: z.string().uuid(),
  classIds: z.array(z.string().uuid()).min(1).optional(),
  title: z.string().trim().min(1, 'Title is required').max(180),
  description: z.string().trim().min(1, 'Description is required').max(5000),
  guidelines: optionalText(8000),
  rubrics: z.string().trim().max(8000).optional().nullable().transform((value) => value || ''),
  projectType: z.enum(projectTypes),
  yearLevel: z.number().int().min(1).max(5),
  workMode: z.enum(['group', 'individual']),
  memberCount: z.number().int().min(1).max(20).optional().nullable(),
  startAt: isoDateTime,
  deadlineAt: isoDateTime,
  visibilityAt: isoDateTime,
  releaseAt: isoDateTime.optional(),
})

function validateProjectDatesAndMode(payload, ctx) {
  if (payload.startAt && payload.deadlineAt && new Date(payload.deadlineAt) <= new Date(payload.startAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deadlineAt'], message: 'Deadline must be after the start date' })
  }

  const releaseAt = payload.releaseAt ?? payload.visibilityAt
  if (releaseAt && payload.deadlineAt && new Date(releaseAt) >= new Date(payload.deadlineAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['releaseAt'], message: 'Release date and time must be before the deadline' })
  }

  if (payload.workMode === 'group' && !payload.memberCount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memberCount'], message: 'Group projects require a member count' })
  }

  if (payload.workMode === 'individual' && payload.memberCount && payload.memberCount !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memberCount'], message: 'Individual projects must have a member count of 1' })
  }
}

export const createProjectSchema = projectBaseSchema.superRefine(validateProjectDatesAndMode)

export const updateProjectSchema = projectBaseSchema
  .omit({ classId: true })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field is required',
  })
  .superRefine(validateProjectDatesAndMode)

export const deadlineSchema = z.object({
  deadlineAt: isoDateTime,
})
