import {
  createGroup,
  getGroupDetails,
  joinGroup,
  listGroups,
  updateGroup,
  updateGroupMember,
} from '../services/groupService.js'

export async function getGroups(req, res, next) {
  try {
    const groups = await listGroups(req.auth.user.id, req.auth.role, req.query.projectId)
    res.json({ groups })
  } catch (error) {
    next(error)
  }
}

export async function getGroup(req, res, next) {
  try {
    const group = await getGroupDetails(req.auth.user.id, req.auth.role, req.params.id)
    res.json({ group })
  } catch (error) {
    next(error)
  }
}

export async function postGroup(req, res, next) {
  try {
    const group = await createGroup(req.auth.user.id, req.auth.role, req.body)
    res.status(201).json({ group })
  } catch (error) {
    next(error)
  }
}

export async function postJoinGroup(req, res, next) {
  try {
    const group = await joinGroup(req.auth.user.id, req.params.id)
    res.json({ group })
  } catch (error) {
    next(error)
  }
}

export async function patchGroup(req, res, next) {
  try {
    const group = await updateGroup(req.auth.user.id, req.auth.role, req.params.id, req.body)
    res.json({ group })
  } catch (error) {
    next(error)
  }
}

export async function patchGroupMember(req, res, next) {
  try {
    const group = await updateGroupMember(
      req.auth.user.id,
      req.auth.role,
      req.params.id,
      req.params.userId,
      req.body,
    )
    res.json({ group })
  } catch (error) {
    next(error)
  }
}
