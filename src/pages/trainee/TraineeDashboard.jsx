import { useNavigate } from 'react-router-dom'
import { GraduationCap, LogOut, User, CheckCircle2, Shield } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function TraineeDashboard() {
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Trainee Dashboard</h1>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Welcome back, <strong>{profile?.full_name || user?.email}</strong>
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
            Role: {profile?.role || 'trainee'}
          </span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Account Verification Details Card */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 mb-4">
          <Shield className="h-4 w-4 text-indigo-600" />
          <span>Authenticated Account Details</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500">Full Name</span>
            <p className="mt-1 font-semibold text-gray-900 truncate">{profile?.full_name || 'N/A'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500">Email Address</span>
            <p className="mt-1 font-semibold text-gray-900 truncate">{user?.email || 'N/A'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500">Assigned Role</span>
            <p className="mt-1 font-semibold text-indigo-700 uppercase">{profile?.role || 'N/A'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500">Account Status</span>
            <p className="mt-1 font-semibold text-emerald-700 uppercase">{profile?.status || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Placeholder Content Area */}
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <User className="mx-auto h-12 w-12 text-indigo-300" />
        <h3 className="mt-3 text-base font-semibold text-gray-900">
          Trainee Learning Area Placeholder
        </h3>
        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
          Authorization successful! This workspace will house your enrolled capacity-building modules, materials, and evaluation progress.
        </p>
      </div>
    </div>
  )
}
