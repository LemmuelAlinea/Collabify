import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import {
  addTaskComment,
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from '../services/taskService'

function replaceTask(tasks, nextTask) {
  return tasks.map((task) => {
    if (task.id === nextTask.id) return { ...nextTask, children: task.children ?? nextTask.children ?? [] }
    return {
      ...task,
      children: replaceTask(task.children ?? [], nextTask),
    }
  })
}

export function useTasks(filters) {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimerRef = useRef(null)

  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setTasks(await getTasks(filters))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const refreshTasksSilently = useCallback(async () => {
    try {
      setTasks(await getTasks(filters))
    } catch {
      // Ignore realtime refresh errors to avoid interrupting active task work.
    }
  }, [filters])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        refreshTasksSilently()
      }, 150)
    }

    const channel = supabase
      .channel(`tasks-live:${filters.groupId ?? 'all'}:${filters.projectId ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_comments' }, scheduleRefresh)
      .subscribe()

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [filters.groupId, filters.projectId, refreshTasksSilently])

  const add = useCallback(async (payload) => {
    const task = await createTask(payload)
    await loadTasks()
    return task
  }, [loadTasks])

  const save = useCallback(async (id, payload) => {
    const task = await updateTask(id, payload)
    await loadTasks()
    return task
  }, [loadTasks])

  const remove = useCallback(async (id) => {
    const result = await deleteTask(id)
    await loadTasks()
    return result
  }, [loadTasks])

  const comment = useCallback(async (id, payload) => {
    const task = await addTaskComment(id, payload)
    setTasks((current) => replaceTask(current, task))
    return task
  }, [])

  return {
    add,
    comment,
    error,
    isLoading,
    loadTasks,
    remove,
    save,
    tasks,
  }
}
