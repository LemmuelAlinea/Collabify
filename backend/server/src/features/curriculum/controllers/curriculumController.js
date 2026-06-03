import {
  archiveCurriculum,
  createCurriculum,
  createCurriculumDownloadUrl,
  getCurriculum,
  listProfessorCurricula,
  updateCurriculum,
} from '../services/curriculumService.js'

export async function getCurricula(req, res, next) {
  try {
    const curricula = await listProfessorCurricula(req.auth.user.id)
    res.json({ curricula })
  } catch (error) {
    next(error)
  }
}

export async function getCurriculumDetails(req, res, next) {
  try {
    const curriculum = await getCurriculum(req.auth.user.id, req.params.id)
    res.json({ curriculum })
  } catch (error) {
    next(error)
  }
}

export async function postCurriculum(req, res, next) {
  try {
    const curriculum = await createCurriculum(req.auth.user.id, req.body)
    res.status(201).json({ curriculum })
  } catch (error) {
    next(error)
  }
}

export async function patchCurriculum(req, res, next) {
  try {
    const curriculum = await updateCurriculum(req.auth.user.id, req.params.id, req.body)
    res.json({ curriculum })
  } catch (error) {
    next(error)
  }
}

export async function deleteCurriculum(req, res, next) {
  try {
    const curriculum = await archiveCurriculum(req.auth.user.id, req.params.id)
    res.json({ curriculum })
  } catch (error) {
    next(error)
  }
}

export async function getCurriculumDownload(req, res, next) {
  try {
    const url = await createCurriculumDownloadUrl(req.auth.user.id, req.params.id)
    res.json({ url })
  } catch (error) {
    next(error)
  }
}
