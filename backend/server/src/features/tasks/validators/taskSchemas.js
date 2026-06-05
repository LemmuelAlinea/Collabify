import { z } from 'zod'

const uuid = z.string().uuid()
const optionalText = (max) => z
  .string()
  .trim()
  .max(max)
  .optional()
  .nullable()
  .transform((value) => value === undefined ? undefined : value || null)

const isoDateTime = z.string().datetime({ offset: true })

export const taskStatuses = ['todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled']
export const taskPriorities = ['low', 'medium', 'high', 'urgent']
export const taskTypes = ['standalone', 'main', 'child']
export const groupModes = ['selected', 'all', 'future']

export const createTaskSchema = z.object({
  projectId: uuid,
  groupId: uuid.optional(),
  groupIds: z.array(uuid).optional().default([]),
  groupMode: z.enum(groupModes).optional().default('selected'),
  taskType: z.enum(taskTypes).optional().default('standalone'),
  parentTaskId: uuid.optional().nullable(),
  parentTaskGroupMode: z.enum(['all']).optional().nullable(),
  parentTaskTitle: z.string().trim().min(1).max(180).optional().nullable(),
  title: z.string().trim().min(1, 'Title is required').max(180),
  description: optionalText(5000),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  dueAt: isoDateTime.optional().nullable(),
  estimatedHours: z.number().min(0).max(999).optional().nullable(),
  scoreWeight: z.number().min(0).max(100).optional().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'critical']).optional(),
  complexity: z.number().min(0.1).max(10).optional(),
  assigneeIds: z.array(uuid).optional().default([]),
})

export const updateTaskSchema = z.object({
  parentTaskId: uuid.optional().nullable(),
  title: z.string().trim().min(1).max(180).optional(),
  description: optionalText(5000),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  dueAt: isoDateTime.optional().nullable(),
  estimatedHours: z.number().min(0).max(999).optional().nullable(),
  scoreWeight: z.number().min(0).max(100).optional().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'critical']).optional(),
  complexity: z.number().min(0.1).max(10).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  assigneeIds: z.array(uuid).optional(),
  archived: z.boolean().optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
})

export const commentSchema = z.object({
  body: z.string().trim().min(1, 'Comment is required').max(3000),
  parentCommentId: uuid.optional().nullable(),
})
