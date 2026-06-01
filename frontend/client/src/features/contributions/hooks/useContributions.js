import { useCallback, useEffect, useState } from 'react'
import { getContributions } from '../services/contributionService'

export function useContributions() {
  const [contributions, setContributions] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadContributions = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setContributions(await getContributions())
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContributions()
  }, [loadContributions])

  return {
    contributions,
    error,
    isLoading,
    loadContributions,
  }
}
