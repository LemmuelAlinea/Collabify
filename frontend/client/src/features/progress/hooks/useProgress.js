import { useCallback, useEffect, useState } from 'react'
import { getProgressDashboard } from '../services/progressService'

export function useProgress() {
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadProgress = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setProgress(await getProgressDashboard())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  return {
    error,
    isLoading,
    loadProgress,
    progress,
  }
}
