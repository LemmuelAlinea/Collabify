import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { requireRole } from '../../../core/middleware/requireRole.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  deleteSyllabus,
  getSyllabi,
  getSyllabusDownload,
  patchSyllabus,
  postSyllabus,
} from '../controllers/syllabusController.js'
import { createSyllabusSchema, updateSyllabusSchema } from '../validators/syllabusSchemas.js'

export const syllabusRoutes = Router()

syllabusRoutes.use(authenticate, requireRole('professor'))

syllabusRoutes.get('/', getSyllabi)
syllabusRoutes.post('/', validateBody(createSyllabusSchema), postSyllabus)
syllabusRoutes.patch('/:id', validateBody(updateSyllabusSchema), patchSyllabus)
syllabusRoutes.delete('/:id', deleteSyllabus)
syllabusRoutes.get('/:id/download', getSyllabusDownload)
