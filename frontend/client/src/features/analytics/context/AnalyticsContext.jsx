import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { USER_ROLES } from '../../auth/constants/roles'
import { getAnalytics } from '../services/analyticsService'

// eslint-disable-next-line react-refresh/only-export-components
export const AnalyticsContext = createContext(null)

export function AnalyticsProvider({ children }) {
  const { role, user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadAnalytics = useCallback(async (filters = {}) => {
    if (!user?.id || role !== USER_ROLES.PROFESSOR) {
      setAnalytics(null)
      setIsLoading(false)
      return null
    }
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
  }, [role, user?.id])

  useEffect(() => {
    let isMounted = true

    if (!user?.id || role !== USER_ROLES.PROFESSOR) {
      Promise.resolve().then(() => {
        if (!isMounted) return
        setAnalytics(null)
        setError('')
        setIsLoading(false)
      })
      return () => {
        isMounted = false
      }
    }

    Promise.resolve().then(() => {
      if (!isMounted) return
      setIsLoading(true)
      setError('')
    })
    getAnalytics()
      .then((data) => {
        if (!isMounted) return
        setAnalytics(data)
      })
      .catch((loadError) => {
        if (!isMounted) return
        setError(loadError.message)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [role, user?.id])

  const value = useMemo(() => ({
    analytics,
    error,
    isLoading,
    loadAnalytics,
  }), [analytics, error, isLoading, loadAnalytics])

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
}
