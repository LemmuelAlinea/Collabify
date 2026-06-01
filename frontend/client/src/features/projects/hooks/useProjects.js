import { useCallback, useEffect, useState } from 'react'
import {
  archiveProject,
  createProject,
  getProjects,
  reopenProject,
  rescheduleProjectDeadline,
  updateProject,
} from '../services/projectService'

export function useProjects() {
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadProjects = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setProjects(await getProjects())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const addProject = useCallback(async (payload) => {
    const project = await createProject(payload)
    setProjects((current) => [project, ...current])
    return project
  }, [])

  const saveProject = useCallback(async (id, payload) => {
    const project = await updateProject(id, payload)
    setProjects((current) => current.map((item) => item.id === id ? project : item))
    return project
  }, [])

  const archive = useCallback(async (id) => {
    const project = await archiveProject(id)
    setProjects((current) => current.map((item) => item.id === id ? project : item))
    return project
  }, [])

  const reopen = useCallback(async (id) => {
    const project = await reopenProject(id)
    setProjects((current) => current.map((item) => item.id === id ? project : item))
    return project
  }, [])

  const reschedule = useCallback(async (id, deadlineAt) => {
    const project = await rescheduleProjectDeadline(id, deadlineAt)
    setProjects((current) => current.map((item) => item.id === id ? project : item))
    return project
  }, [])

  return {
    addProject,
    archive,
    error,
    isLoading,
    loadProjects,
    projects,
    reopen,
    reschedule,
    saveProject,
  }
}
