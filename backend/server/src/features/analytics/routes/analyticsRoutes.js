import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody, validateQuery } from '../../../core/middleware/validateRequest.js'
import {
  getDashboard,
  getQuestionSets,
  getSurvey,
  patchQuestion,
  patchQuestionSet,
  postCompareProjects,
  postExportReport,
  postQuestion,
  postQuestionSet,
  postSurveyAnswers,
} from '../controllers/analyticsController.js'
import {
  analyticsQuerySchema,
  answerSurveySchema,
  compareProjectsSchema,
  createQuestionSchema,
  createQuestionSetSchema,
  exportReportSchema,
  updateQuestionSchema,
  updateQuestionSetSchema,
} from '../validators/analyticsSchemas.js'

export const analyticsRoutes = Router()

analyticsRoutes.get('/question-sets', authenticate, getQuestionSets)
analyticsRoutes.post('/question-sets', authenticate, requireRole('professor'), validateBody(createQuestionSetSchema), postQuestionSet)
analyticsRoutes.patch('/question-sets/:id', authenticate, requireRole('professor'), validateBody(updateQuestionSetSchema), patchQuestionSet)
analyticsRoutes.post('/questions', authenticate, requireRole('professor'), validateBody(createQuestionSchema), postQuestion)
analyticsRoutes.patch('/questions/:id', authenticate, requireRole('professor'), validateBody(updateQuestionSchema), patchQuestion)
analyticsRoutes.get('/survey', authenticate, validateQuery(analyticsQuerySchema), getSurvey)
analyticsRoutes.post('/survey/answers', authenticate, requireRole('student'), validateBody(answerSurveySchema), postSurveyAnswers)
analyticsRoutes.get('/dashboard', authenticate, validateQuery(analyticsQuerySchema), getDashboard)
analyticsRoutes.post('/compare', authenticate, requireRole('professor'), validateBody(compareProjectsSchema), postCompareProjects)
analyticsRoutes.post('/reports/export', authenticate, validateBody(exportReportSchema), postExportReport)
