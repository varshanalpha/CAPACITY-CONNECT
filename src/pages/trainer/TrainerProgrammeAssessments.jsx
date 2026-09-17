import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Edit2,
  Trash2,
  ArrowLeft,
  Filter,
  Check,
  Award,
  Layers,
  ShieldAlert,
  Send,
  Lock,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getTrainingProgrammeById } from '../../services/trainingProgrammeService'
import {
  getProgrammeAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  publishAssessment,
  closeAssessment,
  ASSESSMENT_STATUS,
} from '../../services/assessmentService'

export default function TrainerProgrammeAssessments() {
  const { programmeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Programme and Assessments State
  const [programme, setProgramme] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Notification Toast
  const [notification, setNotification] = useState(null)

  // Create / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  // Delete Modal State
  const [deletingAssessment, setDeletingAssessment] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Publish / Close Action State
  const [publishingId, setPublishingId] = useState(null)
  const [closingId, setClosingId] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  // Load Programme Details and its Assessments
  const loadData = useCallback(
    async (isSilent = false) => {
      if (!programmeId || !user?.id) return

      if (isSilent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setAuthError(null)

      try {
        // 1. Fetch Programme Details
        const progResult = await getTrainingProgrammeById(programmeId)
        if (!progResult.success || !progResult.data) {
          setAuthError(progResult.error || 'Training programme not found.')
          return
        }

        const prog = progResult.data

        // 2. Verify Trainer Authorization
        if (prog.trainer_id !== user.id) {
          setAuthError('Unauthorized: You are not assigned as the trainer for this programme.')
          return
        }

        setProgramme(prog)

        // 3. Fetch Assessments
        const assessResult = await getProgrammeAssessments(programmeId)
        if (assessResult.success) {
          setAssessments(assessResult.data)
        } else {
          showNotification('error', assessResult.error || 'Failed to load assessments.')
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Error loading assessments.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [programmeId, user?.id]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAssessment(null)
    setFormData({
      title: '',
      description: '',
      deadline: '',
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (assessment) => {
    setEditingAssessment(assessment)
    setFormData({
      title: assessment.title || '',
      description: assessment.description || '',
      deadline: assessment.deadline
        ? new Date(assessment.deadline).toISOString().slice(0, 16)
        : '',
    })
    setFormError(null)
    setIsFormModalOpen(true)
  }

  // Handle Form Submit (Create or Update Assessment)
  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setFormError('Assessment title is required.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      if (editingAssessment) {
        // Update
        const result = await updateAssessment(editingAssessment.id, formData)
        if (result.success) {
          showNotification('success', 'Assessment updated successfully.')
          setIsFormModalOpen(false)
          await loadData(true)
        } else {
          setFormError(result.error || 'Failed to update assessment.')
        }
      } else {
        // Create
        const result = await createAssessment({
          programmeId,
          title: formData.title,
          description: formData.description,
          deadline: formData.deadline,
          userId: user.id,
        })
        if (result.success) {
          showNotification('success', 'Assessment created successfully. Start adding questions.')
          setIsFormModalOpen(false)
          await loadData(true)
          // Automatically navigate to Question Builder
          if (result.data?.id) {
            navigate(`/trainer/assessments/${result.data.id}`)
          }
        } else {
          setFormError(result.error || 'Failed to create assessment.')
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Handle Publish Assessment
  const handlePublishAssessment = async (assessment) => {
    if (!assessment) return
    setPublishingId(assessment.id)

    try {
      const result = await publishAssessment(assessment.id)
      if (result.success) {
        showNotification('success', `"${assessment.title}" is now published and open for trainees.`)
        await loadData(true)
      } else {
        showNotification('error', result.error || 'Failed to publish assessment.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Publish failed.')
    } finally {
      setPublishingId(null)
    }
  }

  // Handle Close Assessment
  const handleCloseAssessment = async (assessment) => {
    if (!assessment) return
    setClosingId(assessment.id)

    try {
      const result = await closeAssessment(assessment.id)
      if (result.success) {
        showNotification('success', `"${assessment.title}" is now closed.`)
        await loadData(true)
      } else {
        showNotification('error', result.error || 'Failed to close assessment.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Close failed.')
    } finally {
      setClosingId(null)
    }
  }

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingAssessment) return
    setDeleting(true)

    try {
      const result = await deleteAssessment(deletingAssessment.id)
      if (result.success) {
        showNotification('success', `"${deletingAssessment.title}" deleted successfully.`)
        setDeletingAssessment(null)
        await loadData(true)
      } else {
        showNotification('error', result.error || 'Failed to delete assessment.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error deleting assessment.')
    } finally {
      setDeleting(false)
    }
  }

  // Format Helpers
  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline set'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  // Status Badge UI
  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'published':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600 animate-pulse" />
            Published
          </span>
        )
      case 'closed':
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-600/20">
            <Lock className="mr-1 h-3 w-3 text-gray-500" />
            Closed
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

  // Filter assessments
  const filteredAssessments = assessments.filter((a) => {
    const s = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === '' ||
      a.title?.toLowerCase().includes(s) ||
      a.description?.toLowerCase().includes(s)

    const matchesStatus = statusFilter === 'all' || (a.status || '').toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Authorization Error State
  if (authError) {
    return (
      <div className="space-y-6 pb-16">
        <Link
          to="/trainer/training-programmes"
          className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to My Training Programmes
        </Link>
        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-3 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Access Denied</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto">{authError}</p>
          <Link
            to="/trainer/training-programmes"
            className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
          >
            Return to My Programmes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/trainer/training-programmes"
          className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to My Training Programmes
        </Link>
      </div>

      {/* Programme Overview Banner */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        {loading && !programme ? (
          <div className="py-6 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent" />
            <p className="mt-2 text-xs text-gray-500">Loading programme overview...</p>
          </div>
        ) : (
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-start sm:items-center space-x-3.5">
                <div className="rounded-xl bg-emerald-600 p-3 text-white shadow-sm flex-shrink-0">
                  <HelpCircle className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {programme?.title || 'Assessments & Questionnaires'}
                    </h1>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Create MCQ quizzes, build questionnaires, set passing marks, and evaluate trainee understanding.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing || loading}
                  className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-60"
                  title="Refresh assessments"
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Assessment
                </button>
              </div>
            </div>

            {/* Meta Info Bar */}
            {programme && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                  <span className="text-[11px] text-gray-500 block">Programme Status</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block capitalize">
                    {programme.status || 'Active'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                  <span className="text-[11px] text-gray-500 block">Total Assessments</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {assessments.length} Created
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[11px] text-emerald-700 block font-medium">Published</span>
                  <span className="font-bold text-emerald-900 mt-0.5 block">
                    {assessments.filter((a) => a.status === 'published').length} Active
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[11px] text-amber-700 block font-medium">Drafts</span>
                  <span className="font-bold text-amber-900 mt-0.5 block">
                    {assessments.filter((a) => a.status === 'draft').length} In Progress
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
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

      {/* Search and Filters Bar */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by assessment title, description..."
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
            <option value="all">All Statuses ({assessments.length})</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
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

      {/* Assessment List / Grid */}
      <div>
        {loading ? (
          <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent" />
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading assessments...</p>
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              {searchTerm || statusFilter !== 'all'
                ? 'No matching assessments found'
                : 'No assessments created yet'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or status filter.'
                : 'Create MCQ questionnaires and quizzes to test trainee knowledge.'}
            </p>
            {searchTerm || statusFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Create First Assessment
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssessments.map((a) => {
              const isDraft = a.status === ASSESSMENT_STATUS.DRAFT
              const isPublished = a.status === ASSESSMENT_STATUS.PUBLISHED
              const isClosed = a.status === ASSESSMENT_STATUS.CLOSED
              const isPublishing = publishingId === a.id
              const isClosing = closingId === a.id

              return (
                <div
                  key={a.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Title & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">
                        {a.title}
                      </h3>
                      <div className="flex-shrink-0">{getStatusBadge(a.status)}</div>
                    </div>

                    {/* Description */}
                    {a.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>
                    )}

                    {/* Assessment Stats */}
                    <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 space-y-1.5 text-[11px] text-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center">
                          <HelpCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                          Questions:
                        </span>
                        <span className="font-bold text-emerald-800">
                          {a.question_count || 0} Questions ({a.total_marks || 0} Marks)
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center">
                          <Clock className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                          Deadline:
                        </span>
                        <span className="font-medium text-gray-800 truncate max-w-[180px]">
                          {formatDate(a.deadline)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <span className="text-gray-400">Created:</span>
                        <span className="font-medium text-gray-600">{formatDate(a.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-4 mt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(a)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
                        title="Edit assessment details"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingAssessment(a)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                        title="Delete assessment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isDraft && (
                        <button
                          onClick={() => handlePublishAssessment(a)}
                          disabled={isPublishing}
                          className="inline-flex items-center rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-xs disabled:opacity-60"
                          title="Publish assessment for trainees"
                        >
                          {isPublishing ? (
                            <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-r-transparent" />
                          ) : (
                            <Send className="mr-1 h-3 w-3" />
                          )}
                          Publish
                        </button>
                      )}

                      {isPublished && (
                        <button
                          onClick={() => handleCloseAssessment(a)}
                          disabled={isClosing}
                          className="inline-flex items-center rounded-xl bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition disabled:opacity-60"
                          title="Close assessment"
                        >
                          {isClosing ? (
                            <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-gray-600 border-r-transparent" />
                          ) : (
                            <Lock className="mr-1 h-3 w-3" />
                          )}
                          Close
                        </button>
                      )}

                      <Link
                        to={`/trainer/assessments/${a.id}`}
                        className="inline-flex items-center rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                      >
                        {isDraft ? 'Question Builder' : 'View Questions'}
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT ASSESSMENT MODAL */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 my-8 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-2.5">
                  <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Programme: &ldquo;{programme?.title}&rdquo;
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !formSubmitting && setIsFormModalOpen(false)}
                  disabled={formSubmitting}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 pt-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assessment Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Mid-Term Meteorological Knowledge Quiz"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description / Instructions <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide guidelines, time limits, or topics covered..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assessment Deadline <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Trainees will be required to submit answers before this deadline.
                  </p>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    disabled={formSubmitting}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                  >
                    {formSubmitting && (
                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    )}
                    {editingAssessment ? 'Save Changes' : 'Create & Open Builder'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-rose-50 p-2.5 text-rose-600">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Delete Assessment</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-gray-900">&ldquo;{deletingAssessment.title}&rdquo;</strong>? All associated questions and trainee submissions will also be deleted.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-5 mt-5 border-t border-gray-100">
                <button
                  onClick={() => setDeletingAssessment(null)}
                  disabled={deleting}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm transition disabled:opacity-50"
                >
                  {deleting && (
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  )}
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
