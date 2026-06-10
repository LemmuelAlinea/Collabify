import { getOwnSkillSet, replaceOwnSkillSet } from '../services/studentSkillService.js'

export async function getOwnSkills(req, res, next) {
  try {
    const skills = await getOwnSkillSet(req.auth.user.id)
    res.json({ skills })
  } catch (error) {
    next(error)
  }
}

export async function replaceOwnSkills(req, res, next) {
  try {
    const skills = await replaceOwnSkillSet(req.auth.user.id, req.body.skills)
    res.json({ skills })
  } catch (error) {
    next(error)
  }
}
