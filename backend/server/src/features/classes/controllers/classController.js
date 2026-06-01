import {
  archiveClass,
  assignClassSyllabus,
  createClass,
  getClassDetails,
  joinClass,
  listJoinedClasses,
  listProfessorClasses,
  updateClass,
} from '../services/classService.js'

export async function getMyClasses(req, res, next) {
  try {
    const classes = req.auth.role === 'professor'
      ? await listProfessorClasses(req.auth.user.id)
      : await listJoinedClasses(req.auth.user.id)
    res.json({ classes })
  } catch (error) {
    next(error)
  }
}

export async function postClass(req, res, next) {
  try {
    const classItem = await createClass(req.auth.user.id, req.body)
    res.status(201).json({ class: classItem })
  } catch (error) {
    next(error)
  }
}

export async function patchClass(req, res, next) {
  try {
    const classItem = await updateClass(req.auth.user.id, req.params.id, req.body)
    res.json({ class: classItem })
  } catch (error) {
    next(error)
  }
}

export async function deleteClass(req, res, next) {
  try {
    const classItem = await archiveClass(req.auth.user.id, req.params.id)
    res.json({ class: classItem })
  } catch (error) {
    next(error)
  }
}

export async function postJoinClass(req, res, next) {
  try {
    const classItem = await joinClass(req.auth.user.id, req.body.classCode)
    res.status(201).json({ class: classItem })
  } catch (error) {
    next(error)
  }
}

export async function getClass(req, res, next) {
  try {
    const details = await getClassDetails(req.auth.user.id, req.auth.role, req.params.id)
    res.json(details)
  } catch (error) {
    next(error)
  }
}

export async function putClassSyllabus(req, res, next) {
  try {
    const details = await assignClassSyllabus(req.auth.user.id, req.params.id, req.body.syllabusId)
    res.json(details)
  } catch (error) {
    next(error)
  }
}
