import { useCallback, useEffect, useState } from 'react'
import { getClassDetails } from '../services/classService'

export function useClassDetails(classId) {
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadDetails = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      setDetails(await getClassDetails(classId))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [classId])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  return {
    details,
    error,
    isLoading,
    loadDetails,
  }
}
