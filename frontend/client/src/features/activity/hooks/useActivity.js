import { useCallback, useEffect, useState } from 'react'
import { getActivity } from '../../notifications/services/notificationService'

export function useActivity(filters = {}) {
  const [activity, setActivity] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadActivity = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setActivity(await getActivity(filters))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadActivity()
  }, [loadActivity])

  return {
    activity,
    error,
    isLoading,
    loadActivity,
  }
}
