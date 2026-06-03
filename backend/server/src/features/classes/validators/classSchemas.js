import { z } from 'zod'

const optionalText = () => z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value === undefined ? undefined : value || null)

export const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required').max(160),
  section: z.string().trim().min(1, 'Section is required').max(80),
  subject: z.string().trim().min(1, 'Subject is required').max(160),
  yearLevel: z.number().int().min(1).max(5),
  semester: z.string().trim().min(1, 'Semester is required').max(80),
  schoolYear: z.string().trim().min(1, 'School year is required').max(40),
  description: optionalText(),
  syllabusId: z.string().uuid().optional().nullable(),
  curriculumId: z.string().uuid().optional().nullable(),
})

export const updateClassSchema = createClassSchema.partial().refine(
  (payload) => Object.keys(payload).length > 0,
  { message: 'At least one field is required' },
)

export const joinClassSchema = z.object({
  classCode: z.string().trim().min(4).max(16).transform((value) => value.toUpperCase()),
})

export const assignSyllabusSchema = z.object({
  syllabusId: z.string().uuid(),
})
