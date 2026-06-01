import { z } from 'zod'

const attachmentSchema = z.object({
  storageBucket: z.string().trim().min(1).max(120),
  storagePath: z.string().trim().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  fileSizeBytes: z.number().int().nonnegative(),
})

export const createAnnouncementSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().min(1, 'Title is required').max(160),
  body: z.string().trim().min(1, 'Announcement body is required').max(5000),
  isPinned: z.boolean().optional().default(false),
  attachments: z.array(attachmentSchema).max(8).optional().default([]),
})

export const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  body: z.string().trim().min(1).max(5000).optional(),
  isPinned: z.boolean().optional(),
  attachments: z.array(attachmentSchema).max(8).optional(),
  removeAttachmentIds: z.array(z.string().uuid()).max(8).optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
})
