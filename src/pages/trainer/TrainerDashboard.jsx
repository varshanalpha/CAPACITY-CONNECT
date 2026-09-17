import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  BookOpen,
  LogOut,
  Users,
  CheckCircle2,
  Shield,
  UserCircle2,
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Target,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  FolderOpen,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getTrainerAssignedProgrammes } from '../../services/trainingProgrammeService'

export default function TrainerDashboard() {
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()

  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const loadAssignedProgrammes = useCallback(async (isSilent = false) => {
    if (!user?.id) return

    if (isSilent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const result = await getTrainerAssignedProgrammes(user.id)
      if (result.success) {
        setProgrammes(result.data)
      } else {
        setError(result.error || 'Failed to load assigned training programmes.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching programmes.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadAssignedProgrammes()
  }, [loadAssignedProgrammes])

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'published':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <CheckCircle2 className="mr-1 h-3 w-3 text-blue-600" />
            Published
          </span>
        )
      case 'ongoing':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <Clock className="mr-1 h-3 w-3 text-emerald-600 animate-pulse" />
            Ongoing
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
            <CheckCircle2 className="mr-1 h-3 w-3 text-purple-600" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            Cancelled
          </span>
        )
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
            <FileText className="mr-1 h-3 w-3 text-amber-600" />
            Draft
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <BookOpen className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Trainer Hub</h1>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active Session
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Welcome back, <strong>{profile?.full_name || user?.email}</strong>
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => loadAssignedProgrammes(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-60"
            title="Refresh programmes"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/trainer/training-programmes"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <BookOpen className="mr-1.5 h-4 w-4" />
            My Training Programmes
          </Link>
          <Link
            to="/trainer/profile"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <UserCircle2 className="mr-1.5 h-4 w-4 text-gray-500" />
            My Profile
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Trainer Professional Profile & Programmes Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile Card */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <UserCircle2 className="h-5 w-5 text-emerald-200" />
              <h2 className="text-lg font-bold">Trainer Professional Profile</h2>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Manage your domain specialization, years of experience, professional summary, and curriculum areas.
            </p>
          </div>
          <Link
            to="/trainer/profile"
            className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 shadow-md transition self-start"
          >
            View & Edit Profile
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Training Programmes Management Card */}
        <div className="rounded-2xl bg-gradient-to-r from-teal-700 to-slate-800 p-6 text-white shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-teal-200" />
              <h2 className="text-lg font-bold">Training Programmes & Trainees</h2>
            </div>
            <p className="text-xs text-teal-100 leading-relaxed">
              View your assigned training programmes, inspect enrolled trainees, and track participation status.
            </p>
          </div>
          <Link
            to="/trainer/training-programmes"
            className="inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-teal-50 shadow-md transition self-start"
          >
            View Training Programmes
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Assigned Training Programmes Section */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">My Assigned Training Programmes</h2>
              <p className="text-xs text-gray-500">Programmes assigned to you as lead faculty/trainer.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {programmes.length} Assigned
            </span>
            <Link
              to="/trainer/training-programmes"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline hidden sm:inline-block"
            >
              View All & Trainees →
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent align-[-0.125em]" />
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading your assigned training programmes...</p>
          </div>
        ) : programmes.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No training programmes assigned yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              You will see training programmes listed here once an Administrator assigns you to an organizational programme.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {programmes.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2">{p.title}</h3>
                    <div className="flex-shrink-0">{getStatusBadge(p.status)}</div>
                  </div>

                  {p.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}

                  {p.objectives && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-900">
                      <span className="font-semibold block text-[11px] uppercase tracking-wider text-emerald-800">
                        Objectives:
                      </span>
                      <p className="line-clamp-2 mt-0.5">{p.objectives}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>Start: {formatDate(p.start_date)}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>End: {formatDate(p.end_date)}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span>Capacity: {p.capacity ? `${p.capacity} seats` : 'Open'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>Deadline: {formatDate(p.enrollment_deadline)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <Link
                        to={`/trainer/training-programmes/${p.id}/resources`}
                        className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs"
                      >
                        <FolderOpen className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                        Resources
                      </Link>
                      <Link
                        to={`/trainer/training-programmes/${p.id}/assessments`}
                        className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs"
                      >
                        <HelpCircle className="mr-1 h-3.5 w-3.5 text-indigo-600" />
                        Assessments
                      </Link>
                    </div>

                    <Link
                      to="/trainer/training-programmes"
                      className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      Trainees
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Verification Details Card */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 mb-4">
          <Shield className="h-4 w-4 text-emerald-600" />
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
            <p className="mt-1 font-semibold text-emerald-700 uppercase">{profile?.role || 'N/A'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-gray-500">Account Status</span>
            <p className="mt-1 font-semibold text-emerald-700 uppercase">{profile?.status || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
