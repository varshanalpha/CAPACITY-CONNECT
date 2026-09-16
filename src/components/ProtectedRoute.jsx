import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import PendingApproval from '../pages/auth/PendingApproval'
import AccessDenied from '../pages/auth/AccessDenied'

/**
 * Route guard component that enforces authentication, role verification, and approval status.
 *
 * @param {Object} props
 * @param {string[]} [props.allowedRoles] - Array of allowed roles (e.g. ['trainee'], ['trainer'], ['admin'])
 * @param {React.ReactNode} [props.children] - Child components to render (defaults to <Outlet />)
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading, isAuthenticated, role, status } = useAuth()
  const location = useLocation()

  // 1. Session & Profile Loading State
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-medium text-gray-700">Verifying session & permissions...</p>
        <p className="text-xs text-gray-400 mt-1">Please wait a moment</p>
      </div>
    )
  }

  // 2. Unauthenticated -> Redirect to Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Status Guard: Pending Approval
  if (status === 'pending') {
    return <PendingApproval />
  }

  // 4. Status Guard: Rejected, Suspended, or Non-Approved
  if (status !== 'approved') {
    return <AccessDenied reason="status" />
  }

  // 5. Role Guard: Check if role is authorized for this route
  if (allowedRoles && allowedRoles.length > 0) {
    const isRoleAllowed = allowedRoles.map((r) => r.toLowerCase()).includes(role)
    if (!isRoleAllowed) {
      return <AccessDenied reason="role_mismatch" requiredRole={allowedRoles.join(' / ')} />
    }
  }

  // 6. Authorized and Approved
  return children ? children : <Outlet />
}
