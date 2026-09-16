import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  BookOpen,
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react'
import { signInWithRole } from '../services/authService'
import { useAuthStore } from '../store/useAuthStore'

const ROLES = [
  {
    id: 'trainee',
    name: 'Trainee',
    icon: GraduationCap,
    tagline: 'Learners & Participants',
    description: 'Access your assigned training modules, course materials, and track your learning progress.',
    color: 'indigo',
    accentClass: 'border-indigo-600 text-indigo-600 bg-indigo-50',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    signupAvailable: true,
  },
  {
    id: 'trainer',
    name: 'Trainer',
    icon: BookOpen,
    tagline: 'Instructors & Mentors',
    description: 'Manage cohort sessions, review submissions, conduct assessments, and upload resources.',
    color: 'emerald',
    accentClass: 'border-emerald-600 text-emerald-600 bg-emerald-50',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    signupAvailable: true,
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: Shield,
    tagline: 'System Administrators',
    description: 'System-wide governance, user approval workflows, organizational metrics, and security audit.',
    color: 'slate',
    accentClass: 'border-slate-800 text-slate-900 bg-slate-100',
    btnClass: 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-700',
    badgeClass: 'bg-slate-200 text-slate-900',
    signupAvailable: false,
  },
]

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('trainee')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [errorType, setErrorType] = useState('')

  const navigate = useNavigate()
  const setAuthData = useAuthStore((state) => state.setAuthData)

  const activeRole = ROLES.find((r) => r.id === selectedRole) || ROLES[0]

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId)
    setErrorMessage('')
    setErrorType('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setErrorType('')

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your password.')
      return
    }

    setLoading(true)

    try {
      const result = await signInWithRole({
        email,
        password,
        selectedRole: activeRole.id,
      })

      if (!result.success) {
        setErrorMessage(result.error || 'Authentication failed.')
        setErrorType(result.errorType || 'unknown')
        setLoading(false)
        return
      }

      // Update global Zustand store
      setAuthData({
        user: result.user,
        profile: result.profile,
        session: result.session,
      })

      // Navigate to respective dashboard
      navigate(result.redirectPath, { replace: true })
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      )
      setErrorType('unexpected')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Brand / Title Header */}
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
            Enterprise Portal
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Capacity Connect
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your role-specific learning and management portal
          </p>
        </div>

        {/* Role Selection Tabs / Cards */}
        <div className="mt-8">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1.5 shadow-inner">
            {ROLES.map((role) => {
              const Icon = role.icon
              const isSelected = selectedRole === role.id
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleChange(role.id)}
                  className={`relative flex flex-col items-center justify-center rounded-lg py-3 px-2 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'bg-white font-semibold text-gray-900 shadow-md ring-1 ring-black/5'
                      : 'text-gray-600 hover:bg-gray-200/60 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mb-1.5 transition-colors ${
                      isSelected ? role.accentClass.split(' ')[1] : 'text-gray-500'
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-medium">{role.name}</span>
                  {isSelected && (
                    <motion.div
                      layoutId="activeRoleIndicator"
                      className="absolute bottom-0 h-0.5 w-12 rounded-full bg-gray-900"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Login Form Box */}
        <div className="mt-4 bg-white py-8 px-5 shadow-xl ring-1 ring-gray-900/5 sm:rounded-2xl sm:px-10">
          {/* Active Role Banner */}
          <div className="mb-6 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <activeRole.icon className={`h-5 w-5 ${activeRole.accentClass.split(' ')[1]}`} />
                <span className="text-sm font-bold text-gray-900">
                  {activeRole.name} Sign In
                </span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${activeRole.badgeClass}`}>
                {activeRole.tagline}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              {activeRole.description}
            </p>
          </div>

          {/* Error Message Alert */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mb-6 rounded-lg p-4 text-sm ${
                  errorType === 'role_mismatch'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : errorType === 'status_pending'
                    ? 'border-blue-200 bg-blue-50 text-blue-900'
                    : 'border-rose-200 bg-rose-50 text-rose-800'
                } border`}
              >
                <div className="flex items-start">
                  <AlertCircle
                    className={`h-5 w-5 flex-shrink-0 mr-2.5 ${
                      errorType === 'role_mismatch'
                        ? 'text-amber-600'
                        : errorType === 'status_pending'
                        ? 'text-blue-600'
                        : 'text-rose-600'
                    }`}
                  />
                  <div>
                    <h4 className="font-semibold">
                      {errorType === 'role_mismatch'
                        ? 'Role Mismatch Detected'
                        : errorType === 'status_pending'
                        ? 'Approval Pending'
                        : 'Access Denied'}
                    </h4>
                    <p className="mt-0.5 text-xs leading-normal">{errorMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                {activeRole.name} Email Address
              </label>
              <div className="relative mt-1.5 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name@organization.com`}
                  className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
                >
                  Password
                </label>
              </div>
              <div className="relative mt-1.5 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`flex w-full items-center justify-center rounded-lg py-2.5 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${activeRole.btnClass}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating & Verifying...
                  </>
                ) : (
                  <>
                    <span>Sign in as {activeRole.name}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Navigation & Role-Specific Rules */}
          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-xs">
            {activeRole.signupAvailable ? (
              <p className="text-gray-600">
                Don&apos;t have a {activeRole.name.toLowerCase()} account yet?{' '}
                <Link
                  to={`/signup?role=${activeRole.id}`}
                  className="font-semibold text-blue-600 hover:text-blue-500 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            ) : (
              <div className="flex items-center justify-center space-x-1.5 text-gray-500">
                <Info className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <span>
                  Admin accounts are provisioned internally by organization managers.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
