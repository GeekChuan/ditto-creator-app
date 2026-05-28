import { Navigate, Outlet } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from './AuthProvider'

export default function ProtectedRoute({ requireSuperAdmin = false }: { requireSuperAdmin?: boolean }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spin /></div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (requireSuperAdmin && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

