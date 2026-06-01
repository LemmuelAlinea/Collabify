import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCurrentSession,
  getCurrentUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  sendPasswordReset,
  establishRecoverySessionFromUrl,
  updatePassword,
} from '../services/authService'
import { supabase } from '../../../lib/supabase/client'

export const AuthContext = createContext(null)

function normalizeProfile(profile) {
  if (!profile) return null

  return {
    ...profile,
    appUser: profile.users,
    bio: profile.bio,
    department: profile.department,
    role: profile.users?.role,
    email: profile.users?.email,
    subjectSpecialization: profile.subject_specialization,
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  const loadProfile = useCallback(async (activeSession) => {
    if (!activeSession?.user?.id) {
      setProfile(null)
      return null
    }

    const nextProfile = normalizeProfile(
      await getCurrentUserProfile(activeSession.user.id),
    )
    setProfile(nextProfile)
    return nextProfile
  }, [])

  const refreshAuth = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      const nextSession = await getCurrentSession()
      setSession(nextSession)
      await loadProfile(nextSession)
      setStatus('ready')
      return nextSession
    } catch (authError) {
      setError(authError)
      setSession(null)
      setProfile(null)
      setStatus('ready')
      return null
    }
  }, [loadProfile])

  useEffect(() => {
    let isMounted = true

    getCurrentSession()
      .then(async (initialSession) => {
        if (!isMounted) return
        setSession(initialSession)
        await loadProfile(initialSession)
      })
      .catch((authError) => {
        if (!isMounted) return
        setError(authError)
        setSession(null)
        setProfile(null)
      })
      .finally(() => {
        if (isMounted) setStatus('ready')
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)

      try {
        await loadProfile(nextSession)
      } catch (authError) {
        setError(authError)
        setProfile(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (credentials) => {
    setError(null)
    const data = await loginUser(credentials)
    setSession(data.session)
    await loadProfile(data.session)
    return data
  }, [loadProfile])

  const signUp = useCallback(async (payload) => {
    setError(null)
    return registerUser(payload)
  }, [])

  const signOut = useCallback(async () => {
    await logoutUser()
    setSession(null)
    setProfile(null)
  }, [])

  const forgotPassword = useCallback((email) => sendPasswordReset(email), [])
  const resetPassword = useCallback((password) => updatePassword(password), [])
  const initPasswordRecovery = useCallback(() => establishRecoverySessionFromUrl(), [])

  const value = useMemo(() => ({
    error,
    forgotPassword,
    isAuthenticated: Boolean(session?.user),
    isLoading: status === 'loading',
    profile,
    refreshAuth,
    resetPassword,
    initPasswordRecovery,
    role: profile?.role ?? null,
    session,
    signIn,
    signOut,
    signUp,
    user: session?.user ?? null,
  }), [
    error,
    forgotPassword,
    profile,
    refreshAuth,
    resetPassword,
    initPasswordRecovery,
    session,
    signIn,
    signOut,
    signUp,
    status,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
