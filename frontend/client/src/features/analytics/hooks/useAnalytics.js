  import { useContext } from 'react'
  import { AnalyticsContext } from '../context/AnalyticsContext'

  export function useAnalytics() {
    const context = useContext(AnalyticsContext)
    if (!context) throw new Error('useAnalytics must be used inside AnalyticsProvider')
    return context
  }
