import { Navigate } from 'react-router-dom'
import { ROLE_HOME_PATHS } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'

export function RoleRedirectPage() {
  const { isAuthenticated, isLoading, role } = useAuth()

  if (isLoading) return <div className="route-state">Loading...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Navigate to={ROLE_HOME_PATHS[role] ?? '/login'} replace />
}
