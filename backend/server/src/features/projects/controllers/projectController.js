import {
  archiveProject,
  createProject,
  getProject,
  listClassProjects,
  listProjects,
  reopenProject,
  rescheduleDeadline,
  updateProject,
} from '../services/projectService.js'

export async function getProjects(req, res, next) {
  try {
    const projects = await listProjects(req.auth.user.id, req.auth.role)
    res.json({ projects })
  } catch (error) {
    next(error)
  }
}

export async function getProjectsByClass(req, res, next) {
  try {
    const projects = await listClassProjects(req.auth.user.id, req.auth.role, req.params.classId)
    res.json({ projects })
  } catch (error) {
    next(error)
  }
}

export async function getProjectById(req, res, next) {
  try {
    const project = await getProject(req.auth.user.id, req.auth.role, req.params.id)
    res.json({ project })
  } catch (error) {
    next(error)
  }
}

export async function postProject(req, res, next) {
  try {
    const project = await createProject(req.auth.user.id, req.body)
    res.status(201).json({ project })
  } catch (error) {
    next(error)
  }
}

export async function patchProject(req, res, next) {
  try {
    const project = await updateProject(req.auth.user.id, req.params.id, req.body)
    res.json({ project })
  } catch (error) {
    next(error)
  }
}

export async function deleteProject(req, res, next) {
  try {
    const project = await archiveProject(req.auth.user.id, req.params.id)
    res.json({ project })
  } catch (error) {
    next(error)
  }
}

export async function postReopenProject(req, res, next) {
  try {
    const project = await reopenProject(req.auth.user.id, req.params.id)
    res.json({ project })
  } catch (error) {
    next(error)
  }
}

export async function patchDeadline(req, res, next) {
  try {
    const project = await rescheduleDeadline(req.auth.user.id, req.params.id, req.body.deadlineAt)
    res.json({ project })
  } catch (error) {
    next(error)
  }
}
