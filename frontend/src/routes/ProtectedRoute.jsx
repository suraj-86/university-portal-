import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.jsx'

const ProtectedRoute = ({ role, children }) => {
  const { role: currentRole, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (currentRole !== role) {
    return <Navigate to={`/${currentRole}`} replace />
  }

  return children
}

export default ProtectedRoute
