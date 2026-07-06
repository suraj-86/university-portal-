import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.jsx'

const dashboardPaths = {
  admin: '/admin-dashboard',
  teacher: '/teacher-dashboard',
  student: '/student-dashboard',
  parent: '/parent-dashboard',
}
const ProtectedRoute = ({ role, children }) => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (user.role !== role) {
    return <Navigate to={dashboardPaths[user.role] || '/'} replace />
  }

  return children
}

export default ProtectedRoute