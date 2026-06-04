import { useCallback, useEffect, useState } from 'react'
import {
  acceptPlan,
  generatePlan,
  getGeneratedPlans,
} from '../services/taskGenerationService'

export function useTaskGeneration(projectId, groupId, options = {}) {
  const requiresGroup = Boolean(options.requiresGroup)
  const [error, setError] = useState('')
  const [generations, setGenerations] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loadGenerations = useCallback(async () => {
    if (!projectId) return
    if (requiresGroup && !groupId) return
    setIsLoading(true)
    setError('')

    try {
      setGenerations(await getGeneratedPlans(projectId, groupId))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [groupId, projectId, requiresGroup])

  useEffect(() => {
    loadGenerations()
  }, [loadGenerations])

  const generate = useCallback(async () => {
    setIsGenerating(true)
    setError('')

    try {
      const generation = await generatePlan({ projectId, groupId, mode: 'draft' })
      setGenerations((current) => [generation, ...current])
      return generation
    } catch (generateError) {
      setError(generateError.message)
      throw generateError
    } finally {
      setIsGenerating(false)
    }
  }, [groupId, projectId])

  const accept = useCallback(async (id, mode, tasks) => {
    const generation = await acceptPlan(id, mode, tasks)
    setGenerations((current) => current.map((item) => item.id === id ? generation : item))
    return generation
  }, [])

  return {
    accept,
    error,
    generate,
    generations,
    isGenerating,
    isLoading,
    loadGenerations,
  }
}
