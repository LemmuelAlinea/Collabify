import { z } from 'zod'

const optionalText = () => z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value === undefined ? undefined : value || null)

const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const programStudies = z
  .array(z.union([
    z.string().trim().min(1).max(4000).transform((content) => ({
      title: content.slice(0, 120),
      content,
    })),
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().trim().min(1).max(180),
      content: z.string().trim().min(1).max(4000),
    }),
  ]))
  .max(80)
  .optional()
  .default([])

export const createCurriculumSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(180),
  description: optionalText(),
  programObjectives: optionalText(),
  programOutcomes: optionalText(),
  curriculumComponents: optionalText(),
  academicYear: z.string().trim().max(40).optional().nullable().transform((value) => value || null),
  storagePath: z.string().trim().min(1).max(1024).optional().nullable(),
  fileName: z.string().trim().min(1).max(255).optional().nullable(),
  mimeType: z.enum(allowedMimeTypes).optional().nullable(),
  fileSizeBytes: z.number().int().min(1).max(20 * 1024 * 1024).optional().nullable(),
  programStudies,
})

export const updateCurriculumSchema = createCurriculumSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: 'At least one field is required' },
)
