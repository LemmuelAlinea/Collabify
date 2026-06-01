import { useCallback, useEffect, useState } from 'react'
import {
  analyzeProject,
  getProjectValidations,
  updateValidationDecision,
} from '../services/projectValidationService'

export function useProjectValidations(projectId) {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [validations, setValidations] = useState([])

  const loadValidations = useCallback(async () => {
    if (!projectId) return
    setIsLoading(true)
    setError('')

    try {
      setValidations(await getProjectValidations(projectId))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadValidations()
  }, [loadValidations])

  const analyze = useCallback(async () => {
    setIsAnalyzing(true)
    setError('')

    try {
      const validation = await analyzeProject(projectId)
      setValidations((current) => [validation, ...current])
      return validation
    } catch (analyzeError) {
      setError(analyzeError.message)
      throw analyzeError
    } finally {
      setIsAnalyzing(false)
    }
  }, [projectId])

  const decide = useCallback(async (id, decision) => {
    const validation = await updateValidationDecision(id, decision)
    setValidations((current) => (
      decision === 'ignored_suggestions'
        ? current.filter((item) => item.id !== id)
        : current.map((item) => item.id === id ? validation : item)
    ))
    return validation
  }, [])

  return {
    analyze,
    decide,
    error,
    isAnalyzing,
    isLoading,
    loadValidations,
    validations,
  }
}
