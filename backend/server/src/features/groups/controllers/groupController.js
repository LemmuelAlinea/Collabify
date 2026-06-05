import {
  addGroupMember,
  createGroup,
  finalizeGroupProject,
  getGroupPopQuiz,
  listAvailableStudentGroups,
  getEligibleGroupMembers,
  getGroupDetails,
  previewGroupCreation,
  joinGroup,
  listGroups,
  saveGroupCreation,
  updateStudentFormedGroupsStatus,
  updateGroup,
  updateGroupMember,
  submitGroupPopQuiz,
} from '../services/groupService.js'

export async function getGroups(req, res, next) {
  try {
    const groups = await listGroups(req.auth.user.id, req.auth.role, req.query.projectId)
    res.json({ groups })
  } catch (error) {
    next(error)
  }
}

export async function getAvailableGroups(req, res, next) {
  try {
    const groups = await listAvailableStudentGroups(req.auth.user.id, req.auth.role, {
      projectId: req.query.projectId,
      classId: req.query.classId,
    })
    res.json({ groups })
  } catch (error) {
    next(error)
  }
}

export async function getEligibleMembers(req, res, next) {
  try {
    const members = await getEligibleGroupMembers(req.auth.user.id, req.auth.role, req.params.id)
    res.json({ members })
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

export async function postGroupPreview(req, res, next) {
  try {
    const preview = await previewGroupCreation(req.auth.user.id, req.auth.role, req.body)
    res.json(preview)
  } catch (error) {
    next(error)
  }
}

export async function postGroupGeneration(req, res, next) {
  try {
    const groups = await saveGroupCreation(req.auth.user.id, req.auth.role, req.body)
    res.status(201).json({ groups })
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

export async function postGroupMember(req, res, next) {
  try {
    const group = await addGroupMember(req.auth.user.id, req.auth.role, req.params.id, req.body.userId)
    res.status(201).json({ group })
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

export async function patchStudentFormedGroupsStatus(req, res, next) {
  try {
    const groups = await updateStudentFormedGroupsStatus(req.auth.user.id, req.auth.role, req.body)
    res.json({ groups })
  } catch (error) {
    next(error)
  }
}

export async function postFinalizeGroup(req, res, next) {
  try {
    const result = await finalizeGroupProject(req.auth.user.id, req.auth.role, req.params.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function getPopQuiz(req, res, next) {
  try {
    const quiz = await getGroupPopQuiz(req.auth.user.id, req.auth.role, req.params.id)
    res.json({ quiz })
  } catch (error) {
    next(error)
  }
}

export async function postPopQuiz(req, res, next) {
  try {
    const quiz = await submitGroupPopQuiz(req.auth.user.id, req.auth.role, req.params.id, req.body)
    res.json({ quiz })
  } catch (error) {
    next(error)
  }
}
