import { z } from 'zod'

const optionalText = (max) => z
  .string()
  .trim()
  .max(max)
  .optional()
  .nullable()
  .transform((value) => value === undefined ? undefined : value || null)

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  middleName: optionalText(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  avatarUrl: optionalText(2048),
  bio: optionalText(500),
  department: optionalText(120),
  yearLevel: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null
      return Number(value)
    })
    .pipe(z.number().int().min(1).max(5).nullable()),
  section: optionalText(40),
  subjectSpecialization: optionalText(160),
})
