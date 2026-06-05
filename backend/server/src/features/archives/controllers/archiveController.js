import {
  deleteArchiveItem,
  listProfessorArchive,
  restoreArchiveItem,
} from '../services/archiveService.js'

export async function getArchive(req, res, next) {
  try {
    const items = await listProfessorArchive(req.auth.user.id)
    res.json({ items })
  } catch (error) {
    next(error)
  }
}

export async function postArchiveRestore(req, res, next) {
  try {
    const item = await restoreArchiveItem(req.auth.user.id, req.params.type, req.params.id)
    res.json({ item })
  } catch (error) {
    next(error)
  }
}

export async function removeArchiveItem(req, res, next) {
  try {
    const item = await deleteArchiveItem(req.auth.user.id, req.params.type, req.params.id)
    res.json({ item })
  } catch (error) {
    next(error)
  }
}
