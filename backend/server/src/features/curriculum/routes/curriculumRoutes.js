import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  deleteCurriculum,
  getCurricula,
  getCurriculumDetails,
  getCurriculumDownload,
  patchCurriculum,
  postCurriculum,
} from '../controllers/curriculumController.js'
import { createCurriculumSchema, updateCurriculumSchema } from '../validators/curriculumSchemas.js'

export const curriculumRoutes = Router()

curriculumRoutes.use(authenticate, requireRole('professor'))

curriculumRoutes.get('/', getCurricula)
curriculumRoutes.post('/', validateBody(createCurriculumSchema), postCurriculum)
curriculumRoutes.get('/:id', getCurriculumDetails)
curriculumRoutes.patch('/:id', validateBody(updateCurriculumSchema), patchCurriculum)
curriculumRoutes.delete('/:id', deleteCurriculum)
curriculumRoutes.get('/:id/download', getCurriculumDownload)
