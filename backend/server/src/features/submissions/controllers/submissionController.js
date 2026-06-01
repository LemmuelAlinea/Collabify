import {
  createSubmissionVersion,
  createVersionDownloadUrl,
  getSubmission,
  listSubmissions,
  reviewSubmission,
  selectFinalVersion,
} from '../services/submissionService.js'

export async function getSubmissions(req, res, next) {
  try {
    const submissions = await listSubmissions(req.auth.user.id, req.auth.role, req.query)
    res.json({ submissions })
  } catch (error) {
    next(error)
  }
}

export async function getSubmissionById(req, res, next) {
  try {
    const submission = await getSubmission(req.auth.user.id, req.auth.role, req.params.id)
    res.json({ submission })
  } catch (error) {
    next(error)
  }
}

export async function postSubmissionVersion(req, res, next) {
  try {
    const submission = await createSubmissionVersion(req.auth.user.id, req.auth.role, req.body)
    res.status(201).json({ submission })
  } catch (error) {
    next(error)
  }
}

export async function patchFinalVersion(req, res, next) {
  try {
    const submission = await selectFinalVersion(req.auth.user.id, req.auth.role, req.params.id, req.body.versionId)
    res.json({ submission })
  } catch (error) {
    next(error)
  }
}

export async function patchSubmissionReview(req, res, next) {
  try {
    const submission = await reviewSubmission(req.auth.user.id, req.auth.role, req.params.id, req.body)
    res.json({ submission })
  } catch (error) {
    next(error)
  }
}

export async function getVersionDownload(req, res, next) {
  try {
    const url = await createVersionDownloadUrl(req.auth.user.id, req.auth.role, req.params.versionId)
    res.json({ url })
  } catch (error) {
    next(error)
  }
}
