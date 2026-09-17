import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  FolderOpen,
  HelpCircle,
  Users,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Mail,
  Building,
  Briefcase,
  UserCheck,
  GraduationCap,
  Shield,
  Layers,
  ArrowRight,
  Filter,
  Check,
  FileText,
  UserX,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getTrainerAssignedProgrammes,
  getEnrolledTraineesForProgramme,
} from '../../services/trainerTrainingProgrammeService'

export default function TrainerTrainingProgrammes() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  // Programme list state
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Notification state
  const [notification, setNotification] = useState(null)

  // Enrolled Trainees Modal State
  const [activeProgrammeModal, setActiveProgrammeModal] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [enrolledTraineesData, setEnrolledTraineesData] = useState(null)
  const [traineeSearchTerm, setTraineeSearchTerm] = useState('')
  const [traineeStatusFilter, setTraineeStatusFilter] = useState('all')

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  // Load all assigned programmes
  const loadAssignedProgrammes = useCallback(
    async (isSilent = false) => {
      if (!user?.id) return

      if (isSilent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const result = await getTrainerAssignedProgrammes(user.id)
        if (result.success) {
          setProgrammes(result.data)
        } else {
          showNotification('error', result.error || 'Failed to load assigned training programmes.')
        }
      } catch (err) {
        showNotification('error', err instanceof Error ? err.message : 'Error fetching programmes.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [user?.id]
  )

  useEffect(() => {
    loadAssignedProgrammes()
  }, [loadAssignedProgrammes])

  // Open Enrolled Trainees Modal for a specific programme
  const handleViewEnrolledTrainees = async (programme) => {
    if (!programme || !user?.id) return

    setActiveProgrammeModal(programme)
    setModalLoading(true)
    setModalError(null)
    setEnrolledTraineesData(null)
    setTraineeSearchTerm('')
    setTraineeStatusFilter('all')

    try {
      const result = await getEnrolledTraineesForProgramme(programme.id, user.id)
      if (result.success) {
        setEnrolledTraineesData(result.data)
      } else {
        setModalError(result.error || 'Failed to load enrolled trainees.')
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error loading enrolled trainees.')
    } finally {
      setModalLoading(false)
    }
  }

  // Close modal
  const handleCloseModal = () => {
    setActiveProgrammeModal(null)
    setEnrolledTraineesData(null)
    setModalError(null)
    setTraineeSearchTerm('')
  }

  // Format date helper
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

  // Status Badge UI Helper
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
            <X className="mr-1 h-3 w-3 text-rose-600" />
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

  // Enrollment Status Badge for Trainees
  const getEnrollmentBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'enrolled':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <Check className="mr-1 h-3 w-3 text-blue-600" />
            Enrolled
          </span>
        )
      case 'active':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <Clock className="mr-1 h-3 w-3 text-emerald-600 animate-pulse" />
            Active
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
            <CheckCircle2 className="mr-1 h-3 w-3 text-purple-600" />
            Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <X className="mr-1 h-3 w-3 text-rose-600" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {status || 'Unknown'}
          </span>
        )
    }
  }

  // Filter programmes
  const filteredProgrammes = programmes.filter((p) => {
    const s = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === '' ||
      p.title?.toLowerCase().includes(s) ||
      p.description?.toLowerCase().includes(s) ||
      p.objectives?.toLowerCase().includes(s)

    const matchesStatus =
      statusFilter === 'all' || (p.status || '').toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Filter trainees inside modal
  const filteredTrainees = (enrolledTraineesData?.enrolledTrainees || []).filter((item) => {
    const s = traineeSearchTerm.toLowerCase()
    const matchesSearch =
      traineeSearchTerm === '' ||
      item.trainee?.full_name?.toLowerCase().includes(s) ||
      item.trainee?.email?.toLowerCase().includes(s) ||
      item.trainee?.department?.toLowerCase().includes(s) ||
      item.trainee?.designation?.toLowerCase().includes(s)

    const matchesStatus =
      traineeStatusFilter === 'all' ||
      (item.enrollment_status || '').toLowerCase() === traineeStatusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between rounded-2xl bg-white p-6 shadow-sm border border-gray-100 gap-4">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="rounded-xl bg-emerald-600 p-3 text-white shadow-sm flex-shrink-0">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">My Training Programmes</h1>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {programmes.length} Assigned
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Review your assigned programmes, curriculum, and view enrolled trainees.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadAssignedProgrammes(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-60"
            title="Refresh programmes list"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/trainer/dashboard"
            className="inline-flex items-center rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-800 shadow-sm transition"
          >
            <GraduationCap className="mr-1.5 h-4 w-4" />
            Trainer Hub
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

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by programme title, description, objectives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white py-1.5 px-3 text-xs font-medium text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Statuses ({programmes.length})</option>
            <option value="published">Published</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="draft">Draft</option>
          </select>

          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
              }}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Programmes List */}
      <div>
        {loading ? (
          <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent align-[-0.125em]" />
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading assigned training programmes...</p>
          </div>
        ) : filteredProgrammes.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              {searchTerm || statusFilter !== 'all'
                ? 'No matching training programmes'
                : 'No training programmes assigned yet'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or status filter.'
                : 'Programmes assigned to you by administrators will appear here along with trainee enrollments.'}
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProgrammes.map((p) => {
              const enrolledCount = p.enrolled_count || 0
              const capacity = p.capacity
              const isFull = capacity && capacity > 0 && enrolledCount >= capacity

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Title & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">
                        {p.title}
                      </span>
                      <div className="flex-shrink-0">{getStatusBadge(p.status)}</div>
                    </div>

                    {/* Description snippet */}
                    {p.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}

                    {/* Objectives snippet */}
                    {p.objectives && (
                      <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700">
                        <span className="font-semibold block text-[10px] uppercase tracking-wider text-gray-500">
                          Objectives:
                        </span>
                        <p className="line-clamp-2 mt-0.5 text-gray-600">{p.objectives}</p>
                      </div>
                    )}

                    {/* Schedule & Capacity Details */}
                    <div className="space-y-2 text-xs text-gray-600 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 flex items-center">
                          <Calendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                          Dates:
                        </span>
                        <span className="font-medium text-gray-800">
                          {formatDate(p.start_date)} – {formatDate(p.end_date)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 flex items-center">
                          <Clock className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                          Enrollment Deadline:
                        </span>
                        <span className="font-medium text-gray-800">
                          {formatDate(p.enrollment_deadline)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-100">
                        <span className="text-gray-500 flex items-center">
                          <Users className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                          Enrolled Trainees:
                        </span>
                        <span
                          className={`font-bold ${
                            isFull ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {capacity
                            ? `${enrolledCount} / ${capacity} seats`
                            : `${enrolledCount} enrolled (Open)`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 flex items-center">
                          <FolderOpen className="mr-1.5 h-3.5 w-3.5 text-teal-600" />
                          Learning Resources:
                        </span>
                        <span className="font-semibold text-teal-700">
                          {p.resource_count || 0} Files
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 flex items-center">
                          <HelpCircle className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                          Assessments:
                        </span>
                        <span className="font-semibold text-indigo-700">
                          {p.assessment_count || 0} Created
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-4 mt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <Link
                        to={`/trainer/training-programmes/${p.id}/resources`}
                        className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                        title="Manage learning resources, slides, videos"
                      >
                        <FolderOpen className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                        Resources ({p.resource_count || 0})
                      </Link>

                      <Link
                        to={`/trainer/training-programmes/${p.id}/assessments`}
                        className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                        title="Manage MCQ assessments and quizzes"
                      >
                        <HelpCircle className="mr-1 h-3.5 w-3.5 text-indigo-600" />
                        Assessments ({p.assessment_count || 0})
                      </Link>
                    </div>

                    <button
                      onClick={() => handleViewEnrolledTrainees(p)}
                      className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      View Trainees
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ENROLLED TRAINEES DETAILED MODAL */}
      <AnimatePresence>
        {activeProgrammeModal && (
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
                  <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Enrolled Trainees & Details</h2>
                    <p className="text-xs text-gray-500">
                      View all registered trainees and programme overview.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content (Scrollable) */}
              <div className="space-y-5 pt-4 overflow-y-auto pr-1">
                {/* Programme Information Section */}
                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/75 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        Programme Information
                      </span>
                      <h3 className="text-base font-bold text-gray-900 mt-0.5">
                        {activeProgrammeModal.title}
                      </h3>
                    </div>
                    <div>{getStatusBadge(activeProgrammeModal.status)}</div>
                  </div>

                  {activeProgrammeModal.description && (
                    <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                      {activeProgrammeModal.description}
                    </p>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-gray-200/60">
                      <span className="text-[10px] text-gray-500 block">Start Date</span>
                      <span className="font-semibold text-gray-900 mt-0.5 block">
                        {formatDate(activeProgrammeModal.start_date)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-gray-200/60">
                      <span className="text-[10px] text-gray-500 block">End Date</span>
                      <span className="font-semibold text-gray-900 mt-0.5 block">
                        {formatDate(activeProgrammeModal.end_date)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-gray-200/60">
                      <span className="text-[10px] text-gray-500 block">Capacity</span>
                      <span className="font-semibold text-gray-900 mt-0.5 block">
                        {activeProgrammeModal.capacity
                          ? `${activeProgrammeModal.capacity} Seats`
                          : 'Open Capacity'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-gray-200/60">
                      <span className="text-[10px] text-gray-500 block">Active Enrolled</span>
                      <span className="font-bold text-emerald-700 mt-0.5 block">
                        {enrolledTraineesData?.activeCount ?? (activeProgrammeModal.enrolled_count || 0)} Trainees
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {modalError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Enrolled Trainees Section */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-5 w-5 text-emerald-600" />
                      <h4 className="text-sm font-bold text-gray-900">Enrolled Trainees</h4>
                      {enrolledTraineesData && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          {enrolledTraineesData.enrolledTrainees.length} Total
                        </span>
                      )}
                    </div>

                    {/* Filter / Search within modal */}
                    {enrolledTraineesData && enrolledTraineesData.enrolledTrainees.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="relative w-48 sm:w-60">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Filter trainees..."
                            value={traineeSearchTerm}
                            onChange={(e) => setTraineeSearchTerm(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <select
                          value={traineeStatusFilter}
                          onChange={(e) => setTraineeStatusFilter(e.target.value)}
                          className="rounded-lg border border-gray-300 bg-white py-1.5 px-2 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="all">All</option>
                          <option value="enrolled">Enrolled</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {modalLoading ? (
                    <div className="py-12 text-center rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-solid border-emerald-600 border-r-transparent align-[-0.125em]" />
                      <p className="mt-2 text-xs text-gray-500 font-medium">
                        Loading enrolled trainees...
                      </p>
                    </div>
                  ) : !enrolledTraineesData || enrolledTraineesData.enrolledTrainees.length === 0 ? (
                    /* Zero Trainees State */
                    <div className="py-12 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6">
                      <UserX className="mx-auto h-9 w-9 text-gray-300" />
                      <h4 className="mt-2 text-sm font-semibold text-gray-900">
                        No trainees enrolled yet
                      </h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                        There are currently no trainee enrollments for this training programme.
                      </p>
                    </div>
                  ) : filteredTrainees.length === 0 ? (
                    <div className="py-8 text-center rounded-xl border border-gray-200 bg-gray-50/50">
                      <p className="text-xs text-gray-500">
                        No enrolled trainees match &ldquo;{traineeSearchTerm}&rdquo;.
                      </p>
                      <button
                        onClick={() => {
                          setTraineeSearchTerm('')
                          setTraineeStatusFilter('all')
                        }}
                        className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                      >
                        Reset Search
                      </button>
                    </div>
                  ) : (
                    /* Populated Trainees Table */
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-xs">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left font-semibold text-gray-700"
                            >
                              Trainee Name
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left font-semibold text-gray-700"
                            >
                              Email
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left font-semibold text-gray-700"
                            >
                              Department
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left font-semibold text-gray-700"
                            >
                              Designation
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left font-semibold text-gray-700"
                            >
                              Enrollment Status
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left font-semibold text-gray-700"
                            >
                              Enrollment Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {filteredTrainees.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/75 transition">
                              <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                                    {(item.trainee.full_name || 'T')[0]}
                                  </div>
                                  <span>{item.trainee.full_name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3 text-gray-400" />
                                  <span>{item.trainee.email || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  <Building className="h-3 w-3 text-gray-400" />
                                  <span>{item.trainee.department || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                <div className="flex items-center space-x-1">
                                  <Briefcase className="h-3 w-3 text-gray-400" />
                                  <span>{item.trainee.designation || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {getEnrollmentBadge(item.enrollment_status)}
                              </td>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                {formatDate(item.enrolled_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 mt-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={handleCloseModal}
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
