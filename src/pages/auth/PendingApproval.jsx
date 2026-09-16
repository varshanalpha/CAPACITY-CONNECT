import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, RefreshCw, LogOut, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getDashboardPath } from '../../services/authService'

export default function PendingApproval() {
  const { user, profile, logout, refreshProfile } = useAuth()
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleRefresh = async () => {
    setChecking(true)
    setMessage('')
    const updated = await refreshProfile()
    setChecking(false)

    if (updated?.status === 'approved') {
      navigate(getDashboardPath(updated.role), { replace: true })
    } else {
      setMessage('Status check: Your account is still awaiting approval.')
    }
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-900/5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-5">
          <Clock className="h-9 w-9" />
        </div>

        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 uppercase tracking-wider">
          Approval Pending
        </span>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Account Under Review
        </h2>

        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          Hello <strong>{profile?.full_name || user?.email}</strong>. Your registration as a{' '}
          <strong className="capitalize">{profile?.role || 'user'}</strong> has been received and is currently waiting for administrator approval.
        </p>

        <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-left text-xs text-gray-600 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500">Registered Email:</span>
            <span className="font-semibold text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Requested Role:</span>
            <span className="font-semibold text-gray-900 capitalize">{profile?.role || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Current Status:</span>
            <span className="font-semibold text-amber-700 uppercase">{profile?.status || 'pending'}</span>
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-2.5 text-xs text-blue-800">
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={checking}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking Status...' : 'Check Approval Status'}
          </button>

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
          <ShieldAlert className="h-4 w-4" />
          <span>Need urgent access? Contact your organization administrator.</span>
        </div>
      </div>
    </div>
  )
}
