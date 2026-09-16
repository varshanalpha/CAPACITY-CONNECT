import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Award,
  Sparkles,
  Mail,
  Phone,
  X,
  Loader2,
  ArrowLeft,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getTrainerProfile,
  updateTrainerProfile,
} from '../../services/trainerProfileService'

export default function TrainerProfile() {
  const { user, refreshProfile } = useAuth()
  const userId = user?.id

  // Overall loading & error/success notifications
  const [initialLoading, setInitialLoading] = useState(true)
  const [notification, setNotification] = useState(null) // { type: 'success' | 'error', message: string }

  // Data states
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
  })
  const [trainerData, setTrainerData] = useState({
    professional_summary: '',
    current_position: '',
    specialization: '',
    years_of_experience: '',
    interests: '',
  })

  // Edit / Form states
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Show notification banner helper
  const showToast = useCallback((type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev))
    }, 4500)
  }, [])

  // Load all profile and trainer data
  const loadData = useCallback(async () => {
    if (!userId) return
    try {
      setInitialLoading(true)
      const res = await getTrainerProfile(userId)

      if (res.success && res.data) {
        setProfileData({
          full_name: res.data.profile?.full_name || '',
          email: res.data.profile?.email || user?.email || '',
          phone: res.data.profile?.phone || '',
          department: res.data.profile?.department || '',
          designation: res.data.profile?.designation || '',
        })

        const rawInterests = res.data.trainerProfile?.interests
        const formattedInterests = Array.isArray(rawInterests)
          ? rawInterests.join(', ')
          : rawInterests || ''

        setTrainerData({
          professional_summary:
            res.data.trainerProfile?.professional_summary || '',
          current_position: res.data.trainerProfile?.current_position || '',
          specialization: res.data.trainerProfile?.specialization || '',
          years_of_experience:
            res.data.trainerProfile?.years_of_experience !== null &&
            res.data.trainerProfile?.years_of_experience !== undefined
              ? String(res.data.trainerProfile.years_of_experience)
              : '',
          interests: formattedInterests,
        })
      } else {
        showToast('error', res.error || 'Failed to load trainer profile details.')
      }
    } catch (err) {
      console.error('[TrainerProfile] Load error:', err)
      showToast('error', 'Failed to load trainer profile: ' + (err.message || ''))
    } finally {
      setInitialLoading(false)
    }
  }, [userId, user, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save handler
  const handleSaveProfile = async (e) => {
    e.preventDefault()

    // Validation
    if (trainerData.years_of_experience !== '') {
      const expNum = parseInt(trainerData.years_of_experience, 10)
      if (isNaN(expNum) || expNum < 0) {
        showToast('error', 'Years of Experience must be a positive number (0 or greater).')
        return
      }
    }

    setSaving(true)
    try {
      const res = await updateTrainerProfile(userId, {
        profileData: {
          full_name: profileData.full_name,
          phone: profileData.phone,
          department: profileData.department,
          designation: profileData.designation,
        },
        trainerData: {
          professional_summary: trainerData.professional_summary,
          current_position: trainerData.current_position,
          specialization: trainerData.specialization,
          years_of_experience: trainerData.years_of_experience,
          interests: trainerData.interests,
        },
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to update trainer profile.')
      }

      setIsEditing(false)
      showToast('success', 'Trainer profile updated successfully.')
      if (refreshProfile) refreshProfile()
    } catch (err) {
      console.error('[TrainerProfile] Save error:', err)
      showToast('error', err.message || 'Failed to update trainer profile.')
    } finally {
      setSaving(false)
    }
  }

  // Initials for avatar
  const getInitials = (name) => {
    if (!name) return 'TR'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Parse interests array for tag rendering
  const interestsList = Array.isArray(trainerData.interests)
    ? trainerData.interests
    : typeof trainerData.interests === 'string'
    ? trainerData.interests.split(',').map((i) => i.trim()).filter(Boolean)
    : []

  const isProfileEmpty =
    !trainerData.professional_summary &&
    !trainerData.current_position &&
    !trainerData.specialization &&
    !trainerData.years_of_experience &&
    interestsList.length === 0

  if (initialLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-gray-500">Loading trainer profile...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 rounded-xl px-4 py-3 shadow-lg border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-xs font-semibold">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/trainer/dashboard"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 transition shadow-sm"
            title="Back to Trainer Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Trainer Professional Profile
            </h1>
            <p className="text-xs text-gray-500">
              Manage your domain specialization, years of experience, professional summary, and curriculum areas.
            </p>
          </div>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-teal-900 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-2xl font-black text-white shadow-inner">
              {getInitials(profileData.full_name)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold">{profileData.full_name || 'Anonymous Trainer'}</h2>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                  Trainer
                </span>
              </div>
              <p className="text-sm text-teal-100 font-medium">
                {profileData.designation || trainerData.current_position || 'Faculty / Instructor'}
                {profileData.department ? ` • ${profileData.department}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-teal-200">
                <span className="flex items-center">
                  <Mail className="mr-1 h-3.5 w-3.5" />
                  {profileData.email}
                </span>
                {profileData.phone && (
                  <span className="flex items-center">
                    <Phone className="mr-1 h-3.5 w-3.5" />
                    {profileData.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center rounded-xl bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md border border-white/20 hover:bg-white/25 transition shadow-sm"
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Edit Profile Info
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: View Mode vs Edit Mode */}
      {!isEditing ? (
        <div className="space-y-6">
          {/* Empty Profile Prompt */}
          {isProfileEmpty && (
            <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center space-y-3">
              <BookOpen className="mx-auto h-10 w-10 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Complete your trainer profile
                </h3>
                <p className="text-xs text-gray-600 max-w-md mx-auto mt-0.5">
                  Add your specialization, years of teaching or operational experience, and focus areas to showcase your expertise.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Fill Trainer Profile
              </button>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2 Cols): Summary & Interests */}
            <div className="lg:col-span-2 space-y-6">
              {/* Professional Summary */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-emerald-600" />
                    Professional Summary
                  </h3>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Edit
                  </button>
                </div>
                {trainerData.professional_summary ? (
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {trainerData.professional_summary}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    No professional summary provided. Click "Edit Profile Info" above to summarize your professional and pedagogical background.
                  </p>
                )}
              </div>

              {/* Specialization & Experience Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-600">
                    <Award className="h-5 w-5" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Domain Specialization
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {trainerData.specialization || 'Not specified'}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-2">
                  <div className="flex items-center space-x-2 text-teal-600">
                    <Clock className="h-5 w-5" />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Experience
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {trainerData.years_of_experience !== '' ? (
                      <span className="inline-flex items-center text-emerald-700 font-bold">
                        {trainerData.years_of_experience} {trainerData.years_of_experience === '1' ? 'Year' : 'Years'} of Experience
                      </span>
                    ) : (
                      'Not specified'
                    )}
                  </p>
                </div>
              </div>

              {/* Professional Interests */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center border-b border-gray-100 pb-3">
                  <Sparkles className="h-4 w-4 mr-2 text-teal-600" />
                  Curriculum & Research Interests
                </h3>
                {interestsList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {interestsList.map((interest, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    No specialized curriculum interests listed yet.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column (1 Col): Organizational Details */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Faculty & Department Details
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-gray-500 font-medium">Full Name</span>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {profileData.full_name || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Registered Email</span>
                    <p className="font-semibold text-gray-900 mt-0.5 flex items-center">
                      {profileData.email}
                      <span className="ml-2 text-[10px] text-gray-400 font-normal">(Primary Auth)</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Department</span>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {profileData.department || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Designation / Faculty Title</span>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {profileData.designation || trainerData.current_position || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Current Position</span>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {trainerData.current_position || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Contact Phone</span>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {profileData.phone || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode Form */
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Edit Trainer Profile Information
              </h3>
              <p className="text-xs text-gray-500">
                Update your faculty details, specialization, and professional summary.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={profileData.full_name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, full_name: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Dr. Arun Kumar"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Email Address <span className="text-gray-400 font-normal">(Read-only)</span>
              </label>
              <input
                type="email"
                disabled
                value={profileData.email}
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-xs text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={profileData.department}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, department: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Weather Forecasting / Numerical Modelling"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Designation / Faculty Title
              </label>
              <input
                type="text"
                value={profileData.designation}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, designation: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Senior Meteorologist & Lead Instructor"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Current Position
              </label>
              <input
                type="text"
                value={trainerData.current_position}
                onChange={(e) =>
                  setTrainerData((prev) => ({ ...prev, current_position: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Division Head / Senior Faculty"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Specialization / Domain Area
              </label>
              <input
                type="text"
                value={trainerData.specialization}
                onChange={(e) =>
                  setTrainerData((prev) => ({ ...prev, specialization: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Doppler Radar & Satellite Meteorology"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Years of Experience (0 or greater)
              </label>
              <input
                type="number"
                min="0"
                value={trainerData.years_of_experience}
                onChange={(e) =>
                  setTrainerData((prev) => ({ ...prev, years_of_experience: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="e.g. 12"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Professional Summary
              </label>
              <textarea
                rows={4}
                value={trainerData.professional_summary}
                onChange={(e) =>
                  setTrainerData((prev) => ({
                    ...prev,
                    professional_summary: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-300 p-3 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="Write a brief overview of your academic background, operational meteorological experience, and training achievements..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Curriculum & Research Interests (Comma-separated)
              </label>
              <input
                type="text"
                value={trainerData.interests}
                onChange={(e) =>
                  setTrainerData((prev) => ({ ...prev, interests: e.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="e.g. Severe Weather Warning, Monsoon Forecasting, Climatology"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Profile
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
