import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  GraduationCap,
  LogOut,
  CheckCircle2,
  Shield,
  UserCircle2,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getMyEnrollments, getAvailableTrainingProgrammes } from '../../services/enrollmentService'

export default function TraineeDashboard() {
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()

  const [myEnrollments, setMyEnrollments] = useState([])
  const [availableCount, setAvailableCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id) return
      setLoading(true)
      try {
        const [myRes, availRes] = await Promise.all([
          getMyEnrollments(user.id),
          getAvailableTrainingProgrammes(),
        ])
        if (myRes.success) setMyEnrollments(myRes.data)
        if (availRes.success) setAvailableCount(availRes.data.length)
      } catch (err) {
        console.error('Error loading dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [user?.id])

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Trainee Dashboard</h1>
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
          <Link
            to="/trainee/profile"
            className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
          >
            <UserCircle2 className="mr-1.5 h-4 w-4" />
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

      {/* Grid: Trainee Profile Card & Training Programmes CTA Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Training Programmes Discovery Card */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                {myEnrollments.length} Enrolled
              </span>
            </div>
            <h2 className="text-lg font-bold">Training Programmes Catalog</h2>
            <p className="text-xs text-blue-100 leading-relaxed">
              Explore available meteorological training courses, workshops, and radar interpretation programmes.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs font-medium text-blue-200">
              {availableCount} Programmes Open
            </span>
            <Link
              to="/trainee/training-programmes"
              className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 shadow-md transition"
            >
              Browse Programmes
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Professional Profile CTA Card */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-800 p-6 text-white shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
                <UserCircle2 className="h-6 w-6 text-white" />
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                Profile Readiness
              </span>
            </div>
            <h2 className="text-lg font-bold">Trainee Professional Profile</h2>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Maintain your educational qualifications, work experience, technical skills, and uploaded certificates.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-end">
            <Link
              to="/trainee/profile"
              className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-50 shadow-md transition"
            >
              View & Edit Profile
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Account Verification Details Card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
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
    </div>
  )
}
