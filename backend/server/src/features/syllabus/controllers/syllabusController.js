import {
  archiveSyllabus,
  createSyllabus,
  createSyllabusDownloadUrl,
  listProfessorSyllabi,
  updateSyllabus,
} from '../services/syllabusService.js'

export async function getSyllabi(req, res, next) {
  try {
    const syllabi = await listProfessorSyllabi(req.auth.user.id)
    res.json({ syllabi })
  } catch (error) {
    next(error)
  }
}

export async function postSyllabus(req, res, next) {
  try {
    const syllabus = await createSyllabus(req.auth.user.id, req.body)
    res.status(201).json({ syllabus })
  } catch (error) {
    next(error)
  }
}

export async function patchSyllabus(req, res, next) {
  try {
    const syllabus = await updateSyllabus(req.auth.user.id, req.params.id, req.body)
    res.json({ syllabus })
  } catch (error) {
    next(error)
  }
}

export async function deleteSyllabus(req, res, next) {
  try {
    const syllabus = await archiveSyllabus(req.auth.user.id, req.params.id)
    res.json({ syllabus })
  } catch (error) {
    next(error)
  }
}

export async function getSyllabusDownload(req, res, next) {
  try {
    const url = await createSyllabusDownloadUrl(req.auth.user.id, req.params.id)
    res.json({ url })
  } catch (error) {
    next(error)
  }
}
