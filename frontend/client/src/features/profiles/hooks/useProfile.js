import { useCallback, useEffect, useState } from 'react'
import { getOwnProfile, updateOwnProfile } from '../services/profileService'
import { useAuth } from '../../auth/hooks/useAuth'

export function useProfile() {
  const { refreshAuth } = useAuth()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const nextProfile = await getOwnProfile()
      setProfile(nextProfile)
      return nextProfile
    } catch (profileError) {
      setError(profileError.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const saveProfile = useCallback(async (payload) => {
    setError('')
    const nextProfile = await updateOwnProfile(payload)
    setProfile(nextProfile)
    await refreshAuth()
    return nextProfile
  }, [refreshAuth])

  return {
    error,
    isLoading,
    loadProfile,
    profile,
    saveProfile,
  }
}
