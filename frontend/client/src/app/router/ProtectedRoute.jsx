import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROLE_HOME_PATHS } from '../../features/auth/constants/roles'
import { useAuth } from '../../features/auth/hooks/useAuth'

export function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, role } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="route-state">Loading secure workspace...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    const safePath = ROLE_HOME_PATHS[role] ?? '/login'
    return <Navigate to={safePath} replace />
  }

  return <Outlet />
}
