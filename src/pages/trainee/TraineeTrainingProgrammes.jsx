import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Search,
  RefreshCw,
  Calendar,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  UserCheck,
  Building,
  Briefcase,
  Layers,
  ArrowRight,
  Filter,
  Check,
  Lock,
  GraduationCap,
  CalendarDays,
  Target,
  Sparkles,
  FolderOpen,
  Download,
  ExternalLink,
  Video,
  Presentation,
  FileText,
  File,
  HardDrive,
  FileQuestion,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getAvailableTrainingProgrammes,
  getMyEnrollments,
  enrollInProgramme,
} from '../../services/enrollmentService'
import {
  getProgrammeResources,
  getResourceSignedUrl,
  RESOURCE_TYPES,
} from '../../services/learningResourceService'

export default function TraineeTrainingProgrammes() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  // Tab state: 'available' | 'my_programmes'
  const [activeTab, setActiveTab] = useState('available')

  // Programmes state
  const [availableProgrammes, setAvailableProgrammes] = useState([])
  const [myEnrollments, setMyEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Enrollment in-progress tracking (by programme ID)
  const [enrollingId, setEnrollingId] = useState(null)

  // Modals
  const [viewingProgramme, setViewingProgramme] = useState(null)

  // Learning Resources Modal State
  const [viewingResourcesProgramme, setViewingResourcesProgramme] = useState(null)
  const [resourcesList, setResourcesList] = useState([])
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [resourcesError, setResourcesError] = useState(null)
  const [resourceSearchTerm, setResourceSearchTerm] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all')
  const [openingResourceId, setOpeningResourceId] = useState(null)
  const [downloadingResourceId, setDownloadingResourceId] = useState(null)

  // Notification state
  const [notification, setNotification] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  // Open Learning Resources Modal
  const handleOpenResources = async (programme) => {
    if (!programme) return
    setViewingResourcesProgramme(programme)
    setResourcesLoading(true)
    setResourcesError(null)
    setResourceSearchTerm('')
    setResourceTypeFilter('all')
    setResourcesList([])

    try {
      const result = await getProgrammeResources(programme.id)
      if (result.success) {
        setResourcesList(result.data)
      } else {
        setResourcesError(result.error || 'Failed to load learning resources.')
      }
    } catch (err) {
      setResourcesError(err instanceof Error ? err.message : 'Error fetching learning resources.')
    } finally {
      setResourcesLoading(false)
    }
  }

  // View / Open Resource via Signed URL
  const handleViewResource = async (resource) => {
    if (!resource?.storage_path) return
    setOpeningResourceId(resource.id)

    try {
      const result = await getResourceSignedUrl(resource.storage_path, 300)
      if (result.success && result.signedUrl) {
        window.open(result.signedUrl, '_blank', 'noopener,noreferrer')
      } else {
        showNotification('error', result.error || 'Unable to open learning resource.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to generate view link.')
    } finally {
      setOpeningResourceId(null)
    }
  }

  // Download Resource via Signed URL
  const handleDownloadResource = async (resource) => {
    if (!resource?.storage_path) return
    setDownloadingResourceId(resource.id)

    try {
      const result = await getResourceSignedUrl(
        resource.storage_path,
        300,
        resource.original_file_name || resource.title
      )
      if (result.success && result.signedUrl) {
        const a = document.createElement('a')
        a.href = result.signedUrl
        a.download = resource.original_file_name || 'download'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        showNotification('error', result.error || 'Unable to download resource.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Download link generation failed.')
    } finally {
      setDownloadingResourceId(null)
    }
  }

  // Format Helper: File Size
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // Resource Type Icon & Color Helper
  const getResourceTypeDetails = (type) => {
    switch (type) {
      case RESOURCE_TYPES.RECORDED_LECTURE:
        return {
          icon: <Video className="h-4 w-4 text-purple-600" />,
          label: 'Recorded Lecture',
          badgeClass: 'bg-purple-50 text-purple-700 ring-purple-600/20',
        }
      case RESOURCE_TYPES.PRESENTATION:
        return {
          icon: <Presentation className="h-4 w-4 text-blue-600" />,
          label: 'Presentation',
          badgeClass: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        }
      case RESOURCE_TYPES.STUDY_MATERIAL:
        return {
          icon: <FileText className="h-4 w-4 text-emerald-600" />,
          label: 'Study Material',
          badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        }
      case RESOURCE_TYPES.OTHER:
      default:
        return {
          icon: <File className="h-4 w-4 text-gray-600" />,
          label: 'Other',
          badgeClass: 'bg-gray-50 text-gray-700 ring-gray-600/20',
        }
    }
  }

  // Load all data
  const loadData = useCallback(async (isSilent = false) => {
    if (!user?.id) return

    if (isSilent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      // Fetch available programmes and my enrollments in parallel
      const [availableRes, myEnrollmentsRes] = await Promise.all([
        getAvailableTrainingProgrammes(),
        getMyEnrollments(user.id),
      ])

      if (availableRes.success) {
        setAvailableProgrammes(availableRes.data)
      } else {
        showNotification('error', availableRes.error || 'Unable to load training programmes.')
      }

      if (myEnrollmentsRes.success) {
        setMyEnrollments(myEnrollmentsRes.data)
      } else {
        showNotification('error', myEnrollmentsRes.error || 'Unable to load your enrollments.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error fetching programmes.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Set of programme IDs the user is currently enrolled in
  const enrolledProgrammeIds = new Set(
    myEnrollments.map((enr) => enr.training_programme_id || enr.training_programme?.id)
  )

  // Handle Enrollment Action
  const handleEnroll = async (programme) => {
    if (!user?.id || !programme?.id) return

    // Pre-check duplicate in UI
    if (enrolledProgrammeIds.has(programme.id)) {
      showNotification('error', 'You are already enrolled in this programme.')
      return
    }

    setEnrollingId(programme.id)

    try {
      const result = await enrollInProgramme(user.id, programme.id)
      if (result.success) {
        showNotification('success', 'Successfully enrolled in the training programme.')
        await loadData(true)
        if (viewingProgramme && viewingProgramme.id === programme.id) {
          setViewingProgramme(null)
        }
      } else {
        showNotification('error', result.error || 'Unable to enroll in this programme.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Unable to enroll in this programme.')
    } finally {
      setEnrollingId(null)
    }
  }

  // Format Dates
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

  // Check if deadline passed
  const isDeadlinePassed = (deadlineString) => {
    if (!deadlineString) return false
    try {
      const deadline = new Date(deadlineString)
      deadline.setHours(23, 59, 59, 999)
      return new Date() > deadline
    } catch {
      return false
    }
  }

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'published':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <CheckCircle2 className="mr-1 h-3 w-3 text-blue-600" />
            Published
          </span>
        )
      case 'ongoing':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <Clock className="mr-1 h-3 w-3 text-emerald-600 animate-pulse" />
            Ongoing
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
            {status || 'Draft'}
          </span>
        )
    }
  }

  // Filter available programmes
  const filteredAvailable = availableProgrammes.filter((p) => {
    if (!searchTerm.trim()) return true
    const s = searchTerm.toLowerCase()
    return (
      p.title?.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s) ||
      p.objectives?.toLowerCase().includes(s) ||
      p.trainer?.full_name?.toLowerCase().includes(s) ||
      p.trainer?.department?.toLowerCase().includes(s) ||
      p.trainer?.designation?.toLowerCase().includes(s)
    )
  })

  // Filter my enrolled programmes
  const filteredMyEnrollments = myEnrollments.filter((enr) => {
    const p = enr.training_programme
    if (!p) return false
    if (!searchTerm.trim()) return true
    const s = searchTerm.toLowerCase()
    return (
      p.title?.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s) ||
      p.trainer?.full_name?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between rounded-2xl bg-white p-6 shadow-sm border border-gray-100 gap-4">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="rounded-xl bg-blue-600 p-3 text-white shadow-sm flex-shrink-0">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Training Programmes</h1>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {myEnrollments.length} Enrolled
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Explore and enroll in capacity development programmes.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-60"
            title="Refresh programmes"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/trainee/dashboard"
            className="inline-flex items-center rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-800 shadow-sm transition"
          >
            <GraduationCap className="mr-1.5 h-4 w-4" />
            My Dashboard
          </Link>
        </div>
      </div>

      {/* Notifications Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-xl border p-4 text-sm shadow-sm ${
              notification.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                )}
                <span className="font-medium">{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        {/* Switcher Tabs */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`inline-flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'available'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Available Training Programmes</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === 'available' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {availableProgrammes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my_programmes')}
            className={`inline-flex items-center space-x-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'my_programmes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>My Training Programmes</span>
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === 'my_programmes' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {myEnrollments.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search programmes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>
      </div>

      {/* TAB 1: AVAILABLE TRAINING PROGRAMMES */}
      {activeTab === 'available' && (
        <div>
          {loading ? (
            <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]" />
              <p className="mt-3 text-xs text-gray-500 font-medium">Loading available training programmes...</p>
            </div>
          ) : filteredAvailable.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No training programmes found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                {searchTerm
                  ? `No published programmes match "${searchTerm}".`
                  : 'There are currently no active or published training programmes open for enrollment.'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAvailable.map((programme) => {
                const isEnrolled = enrolledProgrammeIds.has(programme.id)
                const currentCount = programme.enrollments ? programme.enrollments.length : 0
                const isFull = programme.capacity && programme.capacity > 0 && currentCount >= programme.capacity
                const isClosed = isDeadlinePassed(programme.enrollment_deadline)
                const isEnrolling = enrollingId === programme.id

                return (
                  <div
                    key={programme.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-200 transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Status & Deadline Header */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">
                          {programme.title}
                        </span>
                        <div className="flex-shrink-0">{getStatusBadge(programme.status)}</div>
                      </div>

                      {/* Trainer info */}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                          Trainer:
                        </span>
                        {!programme.trainer_id ? (
                          <span className="text-xs italic text-amber-700">Trainer not assigned</span>
                        ) : programme.trainer?.full_name ? (
                          <div className="mt-0.5">
                            <p className="text-xs font-bold text-gray-900">{programme.trainer.full_name}</p>
                            {(programme.trainer.designation || programme.trainer.department) && (
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                {programme.trainer.designation || programme.trainer.department}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-500">Trainer information unavailable</span>
                        )}
                      </div>

                      {/* Description snippet */}
                      {programme.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {programme.description}
                        </p>
                      )}

                      {/* Dates & Capacity Details */}
                      <div className="space-y-1.5 text-xs text-gray-600 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 flex items-center">
                            <Calendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                            Dates:
                          </span>
                          <span className="font-medium text-gray-800">
                            {formatDate(programme.start_date)} – {formatDate(programme.end_date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 flex items-center">
                            <Clock className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                            Enrollment Deadline:
                          </span>
                          <span
                            className={`font-medium ${
                              isClosed ? 'text-rose-600 font-semibold' : 'text-gray-800'
                            }`}
                          >
                            {formatDate(programme.enrollment_deadline)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 flex items-center">
                            <Users className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                            Seats:
                          </span>
                          <span
                            className={`font-semibold ${
                              isFull ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {programme.capacity
                              ? `${currentCount} / ${programme.capacity} seats filled`
                              : `${currentCount} enrolled (Open Capacity)`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setViewingProgramme(programme)}
                        className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                        Details
                      </button>

                      {isEnrolled ? (
                        <span className="inline-flex items-center rounded-lg bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Enrolled
                        </span>
                      ) : isClosed ? (
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-500 cursor-not-allowed">
                          <Lock className="mr-1.5 h-3 w-3" />
                          Enrollment Closed
                        </span>
                      ) : isFull ? (
                        <span className="inline-flex items-center rounded-lg bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                          Full
                        </span>
                      ) : (
                        <button
                          onClick={() => handleEnroll(programme)}
                          disabled={isEnrolling}
                          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-60"
                        >
                          {isEnrolling && (
                            <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                          )}
                          Enroll
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY TRAINING PROGRAMMES */}
      {activeTab === 'my_programmes' && (
        <div>
          {loading ? (
            <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]" />
              <p className="mt-3 text-xs text-gray-500 font-medium">Loading your enrolled programmes...</p>
            </div>
          ) : filteredMyEnrollments.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No enrollments yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                You have not enrolled in any training programmes. Browse the available programmes catalog to get started.
              </p>
              <button
                onClick={() => setActiveTab('available')}
                className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
              >
                Browse Available Programmes
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMyEnrollments.map((enr) => {
                const programme = enr.training_programme
                if (!programme) return null

                return (
                  <div
                    key={enr.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Title & Enrolled Status Header */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">
                          {programme.title}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 flex-shrink-0">
                          <Check className="mr-1 h-3 w-3" />
                          Enrolled
                        </span>
                      </div>

                      {/* Trainer Card */}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                          Trainer:
                        </span>
                        {!programme.trainer_id ? (
                          <span className="text-xs italic text-amber-700">Trainer not assigned</span>
                        ) : programme.trainer?.full_name ? (
                          <div className="mt-0.5">
                            <p className="text-xs font-bold text-gray-900">{programme.trainer.full_name}</p>
                            {(programme.trainer.designation || programme.trainer.department) && (
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                {programme.trainer.designation || programme.trainer.department}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-500">Trainer information unavailable</span>
                        )}
                      </div>

                      {/* Dates and Programme Status */}
                      <div className="space-y-1.5 text-xs text-gray-600 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 flex items-center">
                            <Calendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                            Dates:
                          </span>
                          <span className="font-medium text-gray-800">
                            {formatDate(programme.start_date)} – {formatDate(programme.end_date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500 flex items-center">
                            <Clock className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                            Enrolled On:
                          </span>
                          <span className="font-medium text-gray-800">
                            {formatDate(enr.enrolled_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">Programme Status:</span>
                          <div>{getStatusBadge(programme.status)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 mt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenResources(programme)}
                          className="inline-flex items-center rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                        >
                          <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                          Resources
                        </button>

                        <button
                          onClick={() => navigate(`/trainee/training-programmes/${programme.id}/assessments`)}
                          className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          <FileQuestion className="mr-1.5 h-3.5 w-3.5" />
                          Assessments
                        </button>
                      </div>

                      <button
                        onClick={() => setViewingProgramme(programme)}
                        className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                        Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* DETAILED PROGRAMME VIEW MODAL */}
      <AnimatePresence>
        {viewingProgramme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-gray-100 my-8 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Programme Overview</h2>
                    <p className="text-xs text-gray-500">Complete curriculum and schedule details.</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingProgramme(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 pt-4">
                {/* Title and Status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Programme Title
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mt-0.5">{viewingProgramme.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {enrolledProgrammeIds.has(viewingProgramme.id) && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <Check className="mr-1 h-3 w-3" />
                        Enrolled
                      </span>
                    )}
                    {getStatusBadge(viewingProgramme.status)}
                  </div>
                </div>

                {/* Trainer Section Card */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs">
                  <span className="text-xs font-bold text-gray-800 flex items-center mb-2">
                    <UserCheck className="mr-1.5 h-4 w-4 text-blue-600" />
                    Assigned Trainer
                  </span>
                  {!viewingProgramme.trainer_id ? (
                    <p className="text-xs text-amber-700 italic">Trainer not assigned</p>
                  ) : viewingProgramme.trainer?.full_name ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-gray-500 text-[11px]">Full Name:</span>
                        <p className="font-bold text-gray-900">{viewingProgramme.trainer.full_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px]">Designation:</span>
                        <p className="font-semibold text-gray-800">{viewingProgramme.trainer.designation || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px]">Department:</span>
                        <p className="font-semibold text-gray-800">{viewingProgramme.trainer.department || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Trainer information unavailable</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700">Description</h4>
                  <p className="text-xs text-gray-600 mt-1 bg-white p-3 rounded-lg border border-gray-200 whitespace-pre-line leading-relaxed">
                    {viewingProgramme.description || 'No description provided.'}
                  </p>
                </div>

                {/* Objectives */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700">Learning Objectives</h4>
                  <p className="text-xs text-gray-600 mt-1 bg-white p-3 rounded-lg border border-gray-200 whitespace-pre-line leading-relaxed">
                    {viewingProgramme.objectives || 'No learning objectives specified.'}
                  </p>
                </div>

                {/* Schedule & Capacity Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] font-medium text-gray-500">Start Date</span>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">
                      {formatDate(viewingProgramme.start_date)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] font-medium text-gray-500">End Date</span>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">
                      {formatDate(viewingProgramme.end_date)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] font-medium text-gray-500">Enrollment Deadline</span>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">
                      {formatDate(viewingProgramme.enrollment_deadline)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] font-medium text-gray-500">Capacity</span>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">
                      {viewingProgramme.capacity ? `${viewingProgramme.capacity} Seats` : 'Open Capacity'}
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setViewingProgramme(null)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Close
                  </button>

                  {enrolledProgrammeIds.has(viewingProgramme.id) && (
                    <>
                      <button
                        onClick={() => {
                          const prog = viewingProgramme
                          setViewingProgramme(null)
                          handleOpenResources(prog)
                        }}
                        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
                      >
                        <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                        Learning Resources
                      </button>

                      <button
                        onClick={() => {
                          const progId = viewingProgramme.id
                          setViewingProgramme(null)
                          navigate(`/trainee/training-programmes/${progId}/assessments`)
                        }}
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
                      >
                        <FileQuestion className="mr-1.5 h-3.5 w-3.5" />
                        Assessments
                      </button>
                    </>
                  )}

                  {!enrolledProgrammeIds.has(viewingProgramme.id) && (
                    <button
                      onClick={() => handleEnroll(viewingProgramme)}
                      disabled={
                        enrollingId === viewingProgramme.id ||
                        isDeadlinePassed(viewingProgramme.enrollment_deadline) ||
                        (viewingProgramme.capacity &&
                          viewingProgramme.enrollments &&
                          viewingProgramme.enrollments.length >= viewingProgramme.capacity)
                      }
                      className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-60"
                    >
                      {enrollingId === viewingProgramme.id && (
                        <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                      )}
                      Enroll in Programme
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TRAINEE LEARNING RESOURCES MODAL */}
      <AnimatePresence>
        {viewingResourcesProgramme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 my-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Learning Resources Library</h2>
                    <p className="text-xs text-gray-500">
                      Study materials, presentations, and recorded lectures for &ldquo;{viewingResourcesProgramme.title}&rdquo;
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingResourcesProgramme(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content (Scrollable) */}
              <div className="space-y-4 pt-4 overflow-y-auto pr-1">
                {/* Programme Meta Banner */}
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                      Enrolled Programme
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm mt-0.5">{viewingResourcesProgramme.title}</h3>
                    {viewingResourcesProgramme.trainer?.full_name && (
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        Trainer: <strong className="text-gray-800">{viewingResourcesProgramme.trainer.full_name}</strong>
                        {viewingResourcesProgramme.trainer.department && ` (${viewingResourcesProgramme.trainer.department})`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      <FolderOpen className="mr-1 h-3.5 w-3.5 text-blue-600" />
                      {resourcesList.length} Resources Available
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {resourcesError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>{resourcesError}</span>
                  </div>
                )}

                {/* Filter and Search Bar */}
                <div className="rounded-xl bg-white p-3 border border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search learning resources by title, description, filename..."
                      value={resourceSearchTerm}
                      onChange={(e) => setResourceSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Filter className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                    <select
                      value={resourceTypeFilter}
                      onChange={(e) => setResourceTypeFilter(e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white py-1.5 px-2.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">All Resource Types ({resourcesList.length})</option>
                      <option value={RESOURCE_TYPES.STUDY_MATERIAL}>Study Materials</option>
                      <option value={RESOURCE_TYPES.PRESENTATION}>Presentations</option>
                      <option value={RESOURCE_TYPES.RECORDED_LECTURE}>Recorded Lectures</option>
                      <option value={RESOURCE_TYPES.OTHER}>Other</option>
                    </select>

                    {(resourceSearchTerm || resourceTypeFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setResourceSearchTerm('')
                          setResourceTypeFilter('all')
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap transition"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Resources Grid / States */}
                {resourcesLoading ? (
                  <div className="py-16 text-center rounded-xl border border-gray-100 bg-gray-50/50">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
                    <p className="mt-3 text-xs text-gray-500 font-medium">Loading learning resources...</p>
                  </div>
                ) : resourcesList.length === 0 ? (
                  /* Empty State: Zero resources uploaded */
                  <div className="py-16 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6">
                    <FolderOpen className="mx-auto h-10 w-10 text-gray-300" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">
                      No learning resources available yet.
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                      Your trainer has not uploaded any study materials or lecture recordings for this programme yet. Please check back later.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const filteredTraineeResources = resourcesList.filter((res) => {
                      const s = resourceSearchTerm.toLowerCase()
                      const matchesSearch =
                        resourceSearchTerm === '' ||
                        res.title?.toLowerCase().includes(s) ||
                        res.description?.toLowerCase().includes(s) ||
                        res.original_file_name?.toLowerCase().includes(s)

                      const matchesType =
                        resourceTypeFilter === 'all' || res.resource_type === resourceTypeFilter

                      return matchesSearch && matchesType
                    })

                    if (filteredTraineeResources.length === 0) {
                      return (
                        <div className="py-12 text-center rounded-xl border border-gray-200 bg-gray-50/50 p-6">
                          <p className="text-xs text-gray-500">
                            No learning resources match &ldquo;{resourceSearchTerm}&rdquo;.
                          </p>
                          <button
                            onClick={() => {
                              setResourceSearchTerm('')
                              setResourceTypeFilter('all')
                            }}
                            className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Reset Filters
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTraineeResources.map((res) => {
                          const typeDetails = getResourceTypeDetails(res.resource_type)
                          const isOpening = openingResourceId === res.id
                          const isDownloading = downloadingResourceId === res.id

                          return (
                            <div
                              key={res.id}
                              className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs hover:shadow-md hover:border-blue-200 transition flex flex-col justify-between"
                            >
                              <div className="space-y-2.5">
                                {/* Header: Icon, Title & Type */}
                                <div className="flex items-start space-x-2.5">
                                  <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 mt-0.5">
                                    {typeDetails.icon}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-snug">
                                      {res.title}
                                    </h4>
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset mt-1 ${typeDetails.badgeClass}`}
                                    >
                                      {typeDetails.label}
                                    </span>
                                  </div>
                                </div>

                                {/* Description */}
                                {res.description && (
                                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                    {res.description}
                                  </p>
                                )}

                                {/* File Details */}
                                <div className="p-2.5 rounded-lg bg-gray-50/80 border border-gray-100 space-y-1 text-[11px] text-gray-600">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">File:</span>
                                    <span
                                      className="font-medium text-gray-800 truncate max-w-[180px]"
                                      title={res.original_file_name}
                                    >
                                      {res.original_file_name || 'Document'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Size:</span>
                                    <span className="font-medium text-gray-800">
                                      {formatFileSize(res.file_size)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Uploaded:</span>
                                    <span className="font-medium text-gray-800">
                                      {formatDate(res.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card Actions: View & Download */}
                              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleViewResource(res)}
                                  disabled={isOpening}
                                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs disabled:opacity-60"
                                  title="View or play resource securely in browser"
                                >
                                  {isOpening ? (
                                    <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
                                  ) : (
                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                                  )}
                                  View
                                </button>

                                <button
                                  onClick={() => handleDownloadResource(res)}
                                  disabled={isDownloading}
                                  className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs disabled:opacity-60"
                                  title="Download resource to device"
                                >
                                  {isDownloading ? (
                                    <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                                  ) : (
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  Download
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 mt-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setViewingResourcesProgramme(null)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
