import {
  evaluateProjectHealth,
  listProjectHealth,
} from '../services/projectHealthService.js'

export async function getProjectHealth(req, res, next) {
  try {
    res.json({ health: await listProjectHealth(req.auth.user.id, req.auth.role, req.query) })
  } catch (error) {
    next(error)
  }
}

export async function postEvaluateProjectHealth(req, res, next) {
  try {
    res.status(201).json({ health: await evaluateProjectHealth(req.auth.user.id, req.auth.role, req.query) })
  } catch (error) {
    next(error)
  }
}
