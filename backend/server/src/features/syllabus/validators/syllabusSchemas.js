import { z } from 'zod'

const uuid = z.string().uuid()

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

export const createSyllabusSchema = z.object({
  classId: uuid,
  title: z.string().trim().min(1, 'Title is required').max(160),
  description: optionalText(),
  storagePath: z.string().trim().min(1).max(1024),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(allowedMimeTypes),
  fileSizeBytes: z.number().int().min(1).max(20 * 1024 * 1024),
  effectiveFrom: z.string().date().optional().nullable(),
  effectiveTo: z.string().date().optional().nullable(),
})

export const updateSyllabusSchema = z.object({
  classId: uuid.optional(),
  title: z.string().trim().min(1).max(160).optional(),
  description: optionalText(),
  storagePath: z.string().trim().min(1).max(1024).optional(),
  fileName: z.string().trim().min(1).max(255).optional(),
  mimeType: z.enum(allowedMimeTypes).optional(),
  fileSizeBytes: z.number().int().min(1).max(20 * 1024 * 1024).optional(),
  effectiveFrom: z.string().date().optional().nullable(),
  effectiveTo: z.string().date().optional().nullable(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
})
