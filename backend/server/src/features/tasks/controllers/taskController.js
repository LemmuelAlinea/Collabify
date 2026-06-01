import {
  addTaskComment,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from '../services/taskService.js'

export async function getTasks(req, res, next) {
  try {
    const tasks = await listTasks(req.auth.user.id, req.auth.role, req.query)
    res.json({ tasks })
  } catch (error) {
    next(error)
  }
}

export async function postTask(req, res, next) {
  try {
    const task = await createTask(req.auth.user.id, req.auth.role, req.body)
    res.status(201).json({ task: Array.isArray(task) ? task[0] : task, tasks: Array.isArray(task) ? task : [task] })
  } catch (error) {
    next(error)
  }
}

export async function patchTask(req, res, next) {
  try {
    const task = await updateTask(req.auth.user.id, req.auth.role, req.params.id, req.body)
    res.json({ task })
  } catch (error) {
    next(error)
  }
}

export async function removeTask(req, res, next) {
  try {
    const result = await deleteTask(req.auth.user.id, req.auth.role, req.params.id)
    res.json({ task: result })
  } catch (error) {
    next(error)
  }
}

export async function postTaskComment(req, res, next) {
  try {
    const task = await addTaskComment(req.auth.user.id, req.auth.role, req.params.id, req.body)
    res.status(201).json({ task })
  } catch (error) {
    next(error)
  }
}
