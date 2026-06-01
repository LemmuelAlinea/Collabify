import { useCallback, useEffect, useState } from 'react'
import { getProject } from '../services/projectService'

export function useProjectDetails(projectId) {
  const [project, setProject] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadProject = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setProject(await getProject(projectId))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  return { error, isLoading, loadProject, project, setProject }
}
