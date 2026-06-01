import {
  acceptGeneratedPlan,
  generateProjectPlan,
  listProjectPlans,
} from '../services/taskGenerationService.js'

export async function postGeneratePlan(req, res, next) {
  try {
    res.status(201).json({ generation: await generateProjectPlan(req.auth.user.id, req.auth.role, req.body) })
  } catch (error) {
    next(error)
  }
}

export async function getGeneratedPlans(req, res, next) {
  try {
    res.json({ generations: await listProjectPlans(req.auth.user.id, req.auth.role, req.query.projectId, req.query.groupId) })
  } catch (error) {
    next(error)
  }
}

export async function postAcceptPlan(req, res, next) {
  try {
    res.json({ generation: await acceptGeneratedPlan(req.auth.user.id, req.auth.role, req.params.id, req.body) })
  } catch (error) {
    next(error)
  }
}
