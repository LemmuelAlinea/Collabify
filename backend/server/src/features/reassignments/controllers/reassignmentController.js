import {
  analyzeReassignmentRequest,
  archiveReassignmentRequest,
  createReassignmentRequest,
  listReassignmentRequests,
  reviewReassignmentRequest,
} from '../services/reassignmentService.js'

export async function getReassignments(req, res, next) {
  try {
    const reassignments = await listReassignmentRequests(req.auth.user.id, req.auth.role)
    res.json({ reassignments })
  } catch (error) {
    next(error)
  }
}

export async function patchReassignmentArchive(req, res, next) {
  try {
    const reassignment = await archiveReassignmentRequest(req.auth.user.id, req.auth.role, req.params.id)
    res.json({ reassignment })
  } catch (error) {
    next(error)
  }
}

export async function postReassignment(req, res, next) {
  try {
    const reassignment = await createReassignmentRequest(req.auth.user.id, req.auth.role, req.body)
    res.status(201).json({ reassignment })
  } catch (error) {
    next(error)
  }
}

export async function patchReassignmentReview(req, res, next) {
  try {
    const reassignment = await reviewReassignmentRequest(req.auth.user.id, req.params.id, req.body)
    res.json({ reassignment })
  } catch (error) {
    next(error)
  }
}

export async function postReassignmentAnalysis(req, res, next) {
  try {
    const analysis = await analyzeReassignmentRequest(req.auth.user.id, req.params.id)
    res.json({ analysis })
  } catch (error) {
    next(error)
  }
}
