import {
  analyzeProject,
  getValidation,
  listProjectValidations,
  updateValidationDecision,
} from '../services/projectValidationService.js'

export async function postAnalyzeProject(req, res, next) {
  try {
    res.status(201).json({ validation: await analyzeProject(req.auth.user.id, req.params.projectId) })
  } catch (error) {
    next(error)
  }
}

export async function getProjectValidations(req, res, next) {
  try {
    res.json({ validations: await listProjectValidations(req.auth.user.id, req.auth.role, req.params.projectId) })
  } catch (error) {
    next(error)
  }
}

export async function getValidationById(req, res, next) {
  try {
    res.json({ validation: await getValidation(req.auth.user.id, req.auth.role, req.params.id) })
  } catch (error) {
    next(error)
  }
}

export async function patchValidationDecision(req, res, next) {
  try {
    res.json({ validation: await updateValidationDecision(req.auth.user.id, req.params.id, req.body.decision) })
  } catch (error) {
    next(error)
  }
}
