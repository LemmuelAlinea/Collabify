import { z } from 'zod'

const uuid = z.string().uuid()
const scope = z.enum(['class', 'group'])

const attachmentSchema = z.object({
  storageBucket: z.string().trim().min(1).max(120),
  storagePath: z.string().trim().min(1).max(1024),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(180),
  fileSizeBytes: z.number().int().min(1).max(25 * 1024 * 1024),
})

export const listMessagesSchema = z.object({
  scope,
  chatId: uuid,
})

export const createMessageSchema = z.object({
  scope,
  chatId: uuid,
  body: z.string().trim().max(4000).optional().nullable(),
  replyToMessageId: uuid.optional().nullable(),
  attachments: z.array(attachmentSchema).max(6).default([]),
}).refine((payload) => Boolean(payload.body) || payload.attachments.length > 0, {
  message: 'Message body or attachment is required',
})

export const deleteMessageSchema = z.object({
  mode: z.enum(['me', 'everyone']),
})

export const pinMessageSchema = z.object({
  isPinned: z.boolean(),
})
