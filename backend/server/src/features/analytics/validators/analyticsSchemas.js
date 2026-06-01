import { z } from 'zod'

const uuid = z.string().uuid()

const questionType = z.enum(['rating_scale', 'multiple_choice', 'short_answer', 'long_answer'])

export const createQuestionSetSchema = z.object({
  classId: uuid.optional().nullable(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(600).optional().nullable(),
  isDefault: z.boolean().default(false),
})

export const updateQuestionSetSchema = createQuestionSetSchema.partial().extend({
  isArchived: z.boolean().optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
})

export const createQuestionSchema = z.object({
  questionSetId: uuid,
  prompt: z.string().trim().min(1).max(500),
  questionType,
  options: z.array(z.string().trim().min(1).max(120)).default([]),
  position: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
})

export const updateQuestionSchema = createQuestionSchema.partial().extend({
  isArchived: z.boolean().optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
})

export const answerSurveySchema = z.object({
  projectId: uuid,
  groupId: uuid,
  questionSetId: uuid,
  answers: z.array(z.object({
    questionId: uuid,
    answerValue: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.record(z.any())]),
  })).min(1),
})

export const analyticsQuerySchema = z.object({
  classId: uuid.optional(),
  projectId: uuid.optional(),
  groupId: uuid.optional(),
  studentId: uuid.optional(),
})

export const compareProjectsSchema = z.object({
  projectAId: uuid,
  projectBId: uuid,
})

export const exportReportSchema = z.object({
  reportType: z.enum(['project', 'group', 'student', 'class', 'professor']),
  format: z.enum(['pdf', 'excel', 'csv']),
  classId: uuid.optional(),
  projectId: uuid.optional(),
  groupId: uuid.optional(),
  studentId: uuid.optional(),
})
