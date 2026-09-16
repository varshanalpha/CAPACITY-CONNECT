import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  BookOpen,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { signUpWithRole } from '../../services/authService'

const SIGNUP_ROLES = [
  {
    id: 'trainee',
    name: 'Trainee',
    icon: GraduationCap,
    tagline: 'Learners & Cohort Participants',
    description: 'Register for learning tracks, access curriculum materials, and complete skill evaluations.',
    accentColor: 'indigo',
    accentClass: 'border-indigo-600 text-indigo-600 bg-indigo-50',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    badgeClass: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: 'trainer',
    name: 'Trainer',
    icon: BookOpen,
    tagline: 'Instructors & Mentors',
    description: 'Register to manage training cohorts, review assignments, and conduct participant assessments.',
    accentColor: 'emerald',
    accentClass: 'border-emerald-600 text-emerald-600 bg-emerald-50',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800',
  },
]

export default function Signup() {
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role') === 'trainer' ? 'trainer' : 'trainee'

  const [selectedRole, setSelectedRole] = useState(initialRole)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successData, setSuccessData] = useState(null)

  const activeRole = SIGNUP_ROLES.find((r) => r.id === selectedRole) || SIGNUP_ROLES[0]

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId)
    setErrorMessage('')
  }

  const validateForm = () => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.')
      return false
    }

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.')
      return false
    }

    if (!password) {
      setErrorMessage('Please enter a password.')
      return false
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      return false
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!validateForm()) return

    setLoading(true)

    try {
      const result = await signUpWithRole({
        fullName,
        email,
        password,
        role: activeRole.id,
      })

      if (!result.success) {
        setErrorMessage(result.error || 'Registration failed. Please try again.')
        setLoading(false)
        return
      }

      setSuccessData(result)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during signup.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Brand / Header */}
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
            Account Registration
          </span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Join Capacity Connect
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Select your role below to create your organization account
          </p>
        </div>

        {/* Success State */}
        {successData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 bg-white py-8 px-6 shadow-xl ring-1 ring-gray-900/5 sm:rounded-2xl sm:px-10 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900">
              Account Created Successfully!
            </h3>

            <div className="mt-4 rounded-xl bg-emerald-50/70 border border-emerald-100 p-4 text-sm text-emerald-900 leading-relaxed text-left">
              <p className="font-semibold text-emerald-950">
                Your account has been created and is awaiting administrator approval.
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                Registered Role: <strong className="capitalize">{activeRole.name}</strong> ({email})
              </p>
              {successData.requiresEmailConfirmation && (
                <p className="mt-2 text-xs text-emerald-800 border-t border-emerald-200/60 pt-2">
                  Please also check your inbox at <strong>{email}</strong> to verify your email address.
                </p>
              )}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Once an administrator reviews and approves your account, you will be able to sign in and access the platform.
            </p>

            <div className="mt-6">
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Sign In
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Role Selection Tabs (Only Trainee & Trainer) */}
            <div className="mt-8">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1.5 shadow-inner">
                {SIGNUP_ROLES.map((role) => {
                  const Icon = role.icon
                  const isSelected = selectedRole === role.id
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleChange(role.id)}
                      className={`relative flex flex-col items-center justify-center rounded-lg py-3 px-3 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
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
                      <span className="text-sm font-medium">{role.name}</span>
                      {isSelected && (
                        <motion.div
                          layoutId="activeSignupRoleIndicator"
                          className="absolute bottom-0 h-0.5 w-16 rounded-full bg-gray-900"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Signup Form Container */}
            <div className="mt-4 bg-white py-8 px-5 shadow-xl ring-1 ring-gray-900/5 sm:rounded-2xl sm:px-10">
              {/* Active Role Info Banner */}
              <div className="mb-6 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <activeRole.icon className={`h-5 w-5 ${activeRole.accentClass.split(' ')[1]}`} />
                    <span className="text-sm font-bold text-gray-900">
                      {activeRole.name} Registration
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

              {/* Error Alert */}
              <AnimatePresence mode="wait">
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
                  >
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mr-2.5 text-rose-600" />
                      <div>
                        <h4 className="font-semibold">Registration Error</h4>
                        <p className="mt-0.5 text-xs leading-normal">{errorMessage}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
                  >
                    Full Name
                  </label>
                  <div className="relative mt-1.5 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
                  >
                    Email Address
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
                      placeholder="e.g. jane@organization.com"
                      className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
                  >
                    Password
                  </label>
                  <div className="relative mt-1.5 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
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

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
                  >
                    Confirm Password
                  </label>
                  <div className="relative mt-1.5 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex w-full items-center justify-center rounded-lg py-2.5 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${activeRole.btnClass}`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <span>Register as {activeRole.name}</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Back to Login Link */}
              <div className="mt-6 border-t border-gray-100 pt-5 text-center text-xs">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-blue-600 hover:text-blue-500 hover:underline"
                  >
                    Sign in to your portal
                  </Link>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
