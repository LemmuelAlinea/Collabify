import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { getAnalytics } from '../services/analyticsService'

export const AnalyticsContext = createContext(null)

export function AnalyticsProvider({ children }) {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadAnalytics = useCallback(async (filters = {}) => {
    if (!user?.id) return null
    setIsLoading(true)
    setError('')

    try {
      const data = await getAnalytics(filters)
      setAnalytics(data)
      return data
    } catch (loadError) {
      setError(loadError.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const value = useMemo(() => ({
    analytics,
    error,
    isLoading,
    loadAnalytics,
  }), [analytics, error, isLoading, loadAnalytics])

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
}
