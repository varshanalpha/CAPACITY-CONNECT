import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileQuestion,
  ArrowLeft,
  RefreshCw,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Search,
  Layers,
  BookOpen,
  Calendar,
  Sparkles,
  Lock,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getTraineeProgrammeAssessments,
  ATTEMPT_STATUS,
} from '../../services/assessmentService'
import { getAvailableTrainingProgrammes } from '../../services/enrollmentService'

export default function TraineeProgrammeAssessments() {
  const { programmeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [programme, setProgramme] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadData = useCallback(
    async (isSilent = false) => {
      if (!programmeId || !user?.id) return

      if (isSilent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      try {
        // 1. Fetch programme details to display title
        const progRes = await getAvailableTrainingProgrammes()
        if (progRes.success && progRes.data) {
          const found = progRes.data.find((p) => p.id === programmeId)
          if (found) setProgramme(found)
        }

        // 2. Fetch published assessments for trainee
        const res = await getTraineeProgrammeAssessments(programmeId, user.id)
        if (res.success) {
          setAssessments(res.data)
        } else {
          setError(res.error || 'Failed to load assessments.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching assessments.')
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

  // Filter assessments
  const filteredAssessments = assessments.filter((a) => {
    const matchesSearch =
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === 'all') return true
    if (statusFilter === 'not_started') return !a.attempt
    if (statusFilter === 'in_progress') return a.attempt?.status === ATTEMPT_STATUS.IN_PROGRESS
    if (statusFilter === 'submitted') return a.attempt?.status === ATTEMPT_STATUS.SUBMITTED

    return true
  })

  // Format deadline and check expiration
  const getDeadlineInfo = (deadlineStr) => {
    if (!deadlineStr) return { isExpired: false, label: 'No deadline', dateStr: 'Open enrollment' }
    const deadline = new Date(deadlineStr)
    const now = new Date()
    const isExpired = deadline < now
    return {
      isExpired,
      label: isExpired ? 'Expired' : 'Deadline',
      dateStr: deadline.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  }

  // Summary counts
  const notStartedCount = assessments.filter((a) => !a.attempt).length
  const inProgressCount = assessments.filter((a) => a.attempt?.status === ATTEMPT_STATUS.IN_PROGRESS).length
  const submittedCount = assessments.filter((a) => a.attempt?.status === ATTEMPT_STATUS.SUBMITTED).length

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            to="/trainee/training-programmes"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Training Programmes
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                <BookOpen className="w-4 h-4" />
                <span>{programme?.title || 'Training Programme'}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <FileQuestion className="w-8 h-8 text-emerald-400" />
                Programme Assessments
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Take assessments, test your knowledge, and complete questionnaires.
              </p>
            </div>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Available to Start</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white mt-2">{notStartedCount}</p>
          </div>

          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">In Progress</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-300 mt-2">{inProgressCount}</p>
          </div>

          <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Submitted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-300 mt-2">{submittedCount}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'not_started', label: 'Not Started' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'submitted', label: 'Submitted' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 bg-slate-800/40 rounded-2xl border border-slate-700/40 animate-pulse flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2.5 w-full md:w-2/3">
                  <div className="h-5 bg-slate-700/60 rounded w-1/3" />
                  <div className="h-4 bg-slate-700/40 rounded w-3/4" />
                  <div className="h-4 bg-slate-700/30 rounded w-1/2" />
                </div>
                <div className="h-10 bg-slate-700/50 rounded-xl w-32" />
              </div>
            ))}
          </div>
        ) : filteredAssessments.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center bg-slate-800/20 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
            <FileQuestion className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No assessments found</h3>
            <p className="text-slate-500 text-sm max-w-sm mt-1">
              {assessments.length === 0
                ? 'Your trainer has not published any assessments for this programme yet.'
                : 'No assessments matched your search or status filter.'}
            </p>
          </div>
        ) : (
          /* Assessments List */
          <div className="space-y-4">
            {filteredAssessments.map((item) => {
              const deadline = getDeadlineInfo(item.deadline)
              const attempt = item.attempt
              const isSubmitted = attempt?.status === ATTEMPT_STATUS.SUBMITTED
              const isInProgress = attempt?.status === ATTEMPT_STATUS.IN_PROGRESS
              const isNotStarted = !attempt

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl border border-slate-700/60 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </h3>

                      {/* Status Badges */}
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Submitted
                        </span>
                      ) : isInProgress ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600/40">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          Available
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-slate-400 text-sm line-clamp-2 max-w-3xl">
                        {item.description}
                      </p>
                    )}

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-slate-500" />
                        <span>{item.question_count} Questions</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-slate-500" />
                        <span>{item.total_marks} Marks</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className={`w-4 h-4 ${deadline.isExpired ? 'text-rose-400' : 'text-slate-500'}`} />
                        <span className={deadline.isExpired ? 'text-rose-400 font-medium' : ''}>
                          {deadline.label}: {deadline.dateStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {isSubmitted ? (
                      <button
                        onClick={() => navigate(`/trainee/assessments/${item.id}/take`)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        View Submission
                      </button>
                    ) : isInProgress ? (
                      <button
                        onClick={() => navigate(`/trainee/assessments/${item.id}/take`)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/20"
                      >
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : deadline.isExpired ? (
                      <button
                        disabled
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4" />
                        Deadline Expired
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/trainee/assessments/${item.id}/take`)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-500/20"
                      >
                        <span>Start Assessment</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
