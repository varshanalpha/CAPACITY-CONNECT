import { Link, useNavigate } from 'react-router-dom'
import { ShieldX, LogOut, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getDashboardPath } from '../../services/authService'

export default function AccessDenied({ requiredRole }) {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  const userDashboard = profile?.role ? getDashboardPath(profile.role) : '/login'
  const isStatusIssue = profile?.status && profile.status !== 'approved' && profile.status !== 'pending'

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-900/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-5">
          <ShieldX className="h-9 w-9" />
        </div>

        <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 uppercase tracking-wider">
          Access Denied
        </span>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {isStatusIssue ? 'Account Restricted' : 'Unauthorized Access'}
        </h2>

        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          {isStatusIssue ? (
            <>
              Your account status is currently{' '}
              <strong className="text-rose-600 uppercase">{profile?.status}</strong>. Access to this platform is restricted. Please contact an administrator.
            </>
          ) : requiredRole ? (
            <>
              This area is restricted to users with the{' '}
              <strong className="capitalize">{requiredRole}</strong> role. Your account is registered as{' '}
              <strong className="capitalize">{profile?.role || 'different role'}</strong>.
            </>
          ) : (
            <>You do not have permission to view this resource.</>
          )}
        </p>

        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-left text-xs text-gray-600 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Account User:</span>
            <span className="font-semibold text-gray-900">{profile?.full_name || user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Your Actual Role:</span>
            <span className="font-semibold text-gray-900 capitalize">{profile?.role || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Account Status:</span>
            <span className={`font-semibold uppercase ${profile?.status === 'approved' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {profile?.status || 'Unknown'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {profile?.status === 'approved' && profile?.role && (
            <Link
              to={userDashboard}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to My {profile.role} Dashboard
            </Link>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center space-x-1.5 text-xs text-gray-400">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>If you believe this is a mistake, contact platform support.</span>
        </div>
      </div>
    </div>
  )
}
