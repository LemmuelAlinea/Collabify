import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import {
  evaluateProjectHealth,
  getProjectHealth,
} from '../services/projectHealthService'

export function useProjectHealth(filters = {}) {
  const [error, setError] = useState('')
  const [health, setHealth] = useState([])
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadHealth = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setHealth(await getProjectHealth(filters))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  useEffect(() => {
    const channel = supabase
      .channel('project-health-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_health' }, loadHealth)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_alerts' }, loadHealth)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadHealth])

  const evaluate = useCallback(async () => {
    setIsEvaluating(true)
    setError('')

    try {
      const next = await evaluateProjectHealth(filters)
      setHealth(next)
      return next
    } catch (evaluateError) {
      setError(evaluateError.message)
      throw evaluateError
    } finally {
      setIsEvaluating(false)
    }
  }, [filters])

  return {
    error,
    evaluate,
    health,
    isEvaluating,
    isLoading,
    loadHealth,
  }
}
