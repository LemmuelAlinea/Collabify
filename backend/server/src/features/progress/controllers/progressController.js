import { getProgressDashboard } from '../services/progressService.js'

export async function getProgress(req, res, next) {
  try {
    const progress = await getProgressDashboard(req.auth.user.id, req.auth.role)
    res.json({ progress })
  } catch (error) {
    next(error)
  }
}
