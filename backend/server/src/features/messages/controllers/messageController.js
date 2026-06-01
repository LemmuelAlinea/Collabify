import {
  createMessage,
  deleteMessage,
  listMessages,
  setPinnedMessage,
} from '../services/messageService.js'

export async function getMessages(req, res, next) {
  try {
    const messages = await listMessages(req.auth.user.id, req.auth.role, req.query)
    res.json({ messages })
  } catch (error) {
    next(error)
  }
}

export async function postMessage(req, res, next) {
  try {
    const message = await createMessage(req.auth.user.id, req.auth.role, req.body)
    res.status(201).json({ message })
  } catch (error) {
    next(error)
  }
}

export async function deleteMessageController(req, res, next) {
  try {
    const message = await deleteMessage(req.auth.user.id, req.auth.role, req.params.id, req.body)
    res.json({ message })
  } catch (error) {
    next(error)
  }
}

export async function putPinnedMessage(req, res, next) {
  try {
    const message = await setPinnedMessage(req.auth.user.id, req.auth.role, req.params.id, req.body)
    res.json({ message })
  } catch (error) {
    next(error)
  }
}
