import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Rol } from '../types/auth'

interface ProtectedRouteProps {
  roles?: Rol[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, usuario } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return null
  }

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/no-autorizado" replace />
  }

  return <Outlet />
}
