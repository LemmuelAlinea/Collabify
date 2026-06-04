import { useCallback, useEffect, useState } from 'react'
import { getProgressTimeline } from '../services/progressService'

export function useProgressTimeline() {
  const [timeline, setTimeline] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadTimeline = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setTimeline(await getProgressTimeline())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTimeline()
  }, [loadTimeline])

  return {
    error,
    isLoading,
    loadTimeline,
    timeline,
  }
}
