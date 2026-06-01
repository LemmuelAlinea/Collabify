import { getContributionDashboard } from '../services/contributionService.js'

export async function getContributions(req, res, next) {
  try {
    const contributions = await getContributionDashboard(req.auth.user.id, req.auth.role)
    res.json({ contributions })
  } catch (error) {
    next(error)
  }
}
