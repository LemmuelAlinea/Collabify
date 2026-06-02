import { Router } from 'express'
import { authenticate } from '../../../core/middleware/authenticate.js'
import { validateBody } from '../../../core/middleware/validateRequest.js'
import {
  getSubmissionById,
  getSubmissions,
  getVersionDownload,
  patchVersionArchive,
  patchFinalVersion,
  patchSubmissionReview,
  postSubmissionVersion,
  removeVersion,
} from '../controllers/submissionController.js'
import {
  createSubmissionVersionSchema,
  reviewSubmissionSchema,
  selectFinalVersionSchema,
} from '../validators/submissionSchemas.js'

export const submissionRoutes = Router()

submissionRoutes.get('/', authenticate, getSubmissions)
submissionRoutes.post('/versions', authenticate, validateBody(createSubmissionVersionSchema), postSubmissionVersion)
submissionRoutes.get('/versions/:versionId/download', authenticate, getVersionDownload)
submissionRoutes.patch('/versions/:versionId/archive', authenticate, patchVersionArchive)
submissionRoutes.delete('/versions/:versionId', authenticate, removeVersion)
submissionRoutes.get('/:id', authenticate, getSubmissionById)
submissionRoutes.patch('/:id/final-version', authenticate, validateBody(selectFinalVersionSchema), patchFinalVersion)
submissionRoutes.patch('/:id/review', authenticate, validateBody(reviewSubmissionSchema), patchSubmissionReview)
