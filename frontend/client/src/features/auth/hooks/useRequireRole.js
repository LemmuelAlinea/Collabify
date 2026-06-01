import { useAuth } from './useAuth'

export function useRequireRole(role) {
  const auth = useAuth()

  return {
    ...auth,
    hasRequiredRole: auth.role === role,
  }
}
