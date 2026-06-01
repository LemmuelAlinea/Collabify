import { z } from 'zod'

const uuid = z.string().uuid()

export const createSubmissionVersionSchema = z.object({
  taskId: uuid,
  storagePath: z.string().trim().min(1).max(1000),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(255),
  fileSizeBytes: z.number().int().min(0),
  notes: z.string().trim().max(2000).optional().nullable().transform((value) => value || null),
  checksum: z.string().trim().max(255).optional().nullable().transform((value) => value || null),
  selectAsFinal: z.boolean().optional().default(false),
})

export const selectFinalVersionSchema = z.object({
  versionId: uuid,
})

export const reviewSubmissionSchema = z.object({
  status: z.enum(['reviewed', 'returned', 'accepted']),
  feedback: z.string().trim().max(5000).optional().nullable().transform((value) => value || null),
})
