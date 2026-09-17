import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HelpCircle,
  Plus,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Send,
  Lock,
  Clock,
  Check,
  Award,
  Layers,
  FileText,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  BookOpen,
  Eye,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getAssessmentById,
  getAssessmentQuestions,
  createAssessmentQuestion,
  updateAssessmentQuestion,
  deleteAssessmentQuestion,
  publishAssessment,
  closeAssessment,
  updateAssessment,
  ASSESSMENT_STATUS,
} from '../../services/assessmentService'

export default function TrainerAssessmentBuilder() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Assessment & Questions State
  const [assessment, setAssessment] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Notification Toast
  const [notification, setNotification] = useState(null)

  // Question Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const initialQuestionState = {
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    marks: 1,
  }
  const [questionForm, setQuestionForm] = useState(initialQuestionState)
  const [questionSubmitting, setQuestionSubmitting] = useState(false)
  const [questionError, setQuestionError] = useState(null)

  // Delete Question Modal State
  const [deletingQuestion, setDeletingQuestion] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Edit Assessment Meta Modal
  const [isEditMetaOpen, setIsEditMetaOpen] = useState(false)
  const [metaForm, setMetaForm] = useState({ title: '', description: '', deadline: '' })
  const [metaSubmitting, setMetaSubmitting] = useState(false)

  // Publish / Close Action State
  const [publishing, setPublishing] = useState(false)
  const [closing, setClosing] = useState(false)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  // Load Assessment & Questions
  const loadData = useCallback(
    async (isSilent = false) => {
      if (!assessmentId || !user?.id) return

      if (isSilent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setAuthError(null)

      try {
        // 1. Fetch Assessment Details
        const assessRes = await getAssessmentById(assessmentId)
        if (!assessRes.success || !assessRes.data) {
          setAuthError(assessRes.error || 'Assessment not found.')
          return
        }

        const assess = assessRes.data

        // 2. Authorization Check (Trainer must be creator or assigned trainer)
        if (assess.created_by !== user.id && assess.training_programme?.trainer_id !== user.id) {
          setAuthError('Unauthorized: You do not have permission to manage this assessment.')
          return
        }

        setAssessment(assess)
        setMetaForm({
          title: assess.title || '',
          description: assess.description || '',
          deadline: assess.deadline
            ? new Date(assess.deadline).toISOString().slice(0, 16)
            : '',
        })

        // 3. Fetch Questions
        const qRes = await getAssessmentQuestions(assessmentId)
        if (qRes.success) {
          setQuestions(qRes.data)
        } else {
          showNotification('error', qRes.error || 'Failed to load questions.')
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Error loading assessment.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [assessmentId, user?.id]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open Add Question Modal
  const handleOpenAddQuestion = () => {
    setEditingQuestion(null)
    setQuestionForm(initialQuestionState)
    setQuestionError(null)
    setIsQuestionModalOpen(true)
  }

  // Open Edit Question Modal
  const handleOpenEditQuestion = (q) => {
    setEditingQuestion(q)
    setQuestionForm({
      question_text: q.question_text || '',
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_option: q.correct_option || 'A',
      marks: q.marks || 1,
    })
    setQuestionError(null)
    setIsQuestionModalOpen(true)
  }

  // Handle Question Submit (Create / Update)
  const handleQuestionSubmit = async (e) => {
    e.preventDefault()

    if (!questionForm.question_text.trim()) {
      setQuestionError('Question text is required.')
      return
    }
    if (!questionForm.option_a.trim() || !questionForm.option_b.trim() || !questionForm.option_c.trim() || !questionForm.option_d.trim()) {
      setQuestionError('All 4 options (A, B, C, D) are required.')
      return
    }
    if (!questionForm.marks || Number(questionForm.marks) <= 0) {
      setQuestionError('Marks must be greater than 0.')
      return
    }

    setQuestionSubmitting(true)
    setQuestionError(null)

    try {
      if (editingQuestion) {
        // Update
        const result = await updateAssessmentQuestion(editingQuestion.id, questionForm)
        if (result.success) {
          showNotification('success', 'Question updated successfully.')
          setIsQuestionModalOpen(false)
          await loadData(true)
        } else {
          setQuestionError(result.error || 'Failed to update question.')
        }
      } else {
        // Create
        const result = await createAssessmentQuestion(assessmentId, questionForm)
        if (result.success) {
          showNotification('success', 'Question added successfully.')
          setIsQuestionModalOpen(false)
          await loadData(true)
        } else {
          setQuestionError(result.error || 'Failed to add question.')
        }
      }
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setQuestionSubmitting(false)
    }
  }

  // Handle Delete Question Confirm
  const handleDeleteQuestionConfirm = async () => {
    if (!deletingQuestion) return
    setDeleting(true)

    try {
      const result = await deleteAssessmentQuestion(deletingQuestion.id, assessmentId)
      if (result.success) {
        showNotification('success', 'Question deleted and ordering updated.')
        setDeletingQuestion(null)
        await loadData(true)
      } else {
        showNotification('error', result.error || 'Failed to delete question.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error deleting question.')
    } finally {
      setDeleting(false)
    }
  }

  // Handle Publish Assessment
  const handlePublish = async () => {
    setPublishing(true)
    try {
      const result = await publishAssessment(assessmentId)
      if (result.success) {
        showNotification('success', 'Assessment published successfully! Trainees can now access it.')
        await loadData(true)
      } else {
        showNotification('error', result.error || 'Failed to publish assessment.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Publish failed.')
    } finally {
      setPublishing(false)
    }
  }

  // Handle Close Assessment
  const handleClose = async () => {
    setClosing(true)
    try {
      const result = await closeAssessment(assessmentId)
      if (result.success) {
        showNotification('success', 'Assessment is now closed.')
        await loadData(true)
      } else {
        showNotification('error', result.error || 'Failed to close assessment.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Close failed.')
    } finally {
      setClosing(false)
    }
  }

  // Handle Edit Assessment Meta Details
  const handleMetaSubmit = async (e) => {
    e.preventDefault()
    if (!metaForm.title.trim()) return

    setMetaSubmitting(true)
    try {
      const result = await updateAssessment(assessmentId, metaForm)
      if (result.success) {
        showNotification('success', 'Assessment details updated.')
        setIsEditMetaOpen(false)
        await loadData(true)
      } else {
        showNotification('error', result.error || 'Failed to update details.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Update failed.')
    } finally {
      setMetaSubmitting(false)
    }
  }

  // Format Helper: Dates
  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline'
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

  // Status Badge Helper
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

  // Total Marks Computed
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)

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
          to={
            assessment?.training_programme_id
              ? `/trainer/training-programmes/${assessment.training_programme_id}/assessments`
              : '/trainer/training-programmes'
          }
          className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Programme Assessments
        </Link>
      </div>

      {/* Assessment Header Card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        {loading && !assessment ? (
          <div className="py-6 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent" />
            <p className="mt-2 text-xs text-gray-500">Loading assessment builder...</p>
          </div>
        ) : (
          <div>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-start space-x-3.5">
                <div className="rounded-xl bg-emerald-600 p-3 text-white shadow-sm flex-shrink-0 mt-1">
                  <HelpCircle className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {assessment?.title || 'Assessment Questionnaire'}
                    </h1>
                    {assessment && getStatusBadge(assessment.status)}
                    <button
                      onClick={() => setIsEditMetaOpen(true)}
                      className="text-xs text-gray-400 hover:text-gray-700 transition p-1"
                      title="Edit title & deadline"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {assessment?.description ? (
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-2xl">
                      {assessment.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-1">No instructions provided.</p>
                  )}
                  {assessment?.training_programme?.title && (
                    <p className="text-[11px] text-emerald-700 font-medium mt-1">
                      Programme: {assessment.training_programme.title}
                    </p>
                  )}
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing || loading}
                  className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-60"
                  title="Refresh"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                {assessment?.status === ASSESSMENT_STATUS.DRAFT && (
                  <button
                    onClick={handlePublish}
                    disabled={publishing || questions.length === 0}
                    className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                    title={
                      questions.length === 0
                        ? 'Add at least one question before publishing'
                        : 'Publish assessment'
                    }
                  >
                    {publishing ? (
                      <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    ) : (
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Publish Assessment
                  </button>
                )}

                {assessment?.status === ASSESSMENT_STATUS.PUBLISHED && (
                  <button
                    onClick={handleClose}
                    disabled={closing}
                    className="inline-flex items-center rounded-xl bg-gray-100 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    {closing ? (
                      <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-600 border-r-transparent" />
                    ) : (
                      <Lock className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Close Assessment
                  </button>
                )}

                <button
                  onClick={handleOpenAddQuestion}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Question
                </button>
              </div>
            </div>

            {/* Assessment Meta Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                <span className="text-[11px] text-gray-500 block">Total Questions</span>
                <span className="font-bold text-gray-900 mt-0.5 block text-sm">
                  {questions.length} MCQ Questions
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 block font-medium">Total Marks</span>
                <span className="font-bold text-emerald-900 mt-0.5 block text-sm">
                  {totalMarks} Points
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                <span className="text-[11px] text-gray-500 block">Assessment Deadline</span>
                <span className="font-semibold text-gray-900 mt-0.5 block truncate">
                  {formatDate(assessment?.deadline)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                <span className="text-[11px] text-gray-500 block">Status</span>
                <span className="font-semibold text-gray-900 mt-0.5 block capitalize">
                  {assessment?.status || 'Draft'}
                </span>
              </div>
            </div>
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

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-gray-900">Questionnaire Items</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {questions.length} Questions
            </span>
          </div>

          <button
            onClick={handleOpenAddQuestion}
            className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Another Question
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent" />
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-white border border-dashed border-gray-200 shadow-sm p-6">
            <HelpCircle className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-2 text-base font-semibold text-gray-900">No questions added yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              Start building your questionnaire by adding multiple-choice questions with 4 options and designating the correct answer.
            </p>
            <button
              onClick={handleOpenAddQuestion}
              className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add First Question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const qNumber = q.question_order || idx + 1
              const correct = (q.correct_option || '').toUpperCase()

              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:border-emerald-200 transition space-y-3"
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mt-0.5">
                        {qNumber}
                      </span>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900 leading-snug">
                          {q.question_text}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="rounded-lg bg-gray-50 border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 mr-2">
                        {q.marks || 1} {Number(q.marks) === 1 ? 'Mark' : 'Marks'}
                      </span>
                      <button
                        onClick={() => handleOpenEditQuestion(q)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
                        title="Edit question"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingQuestion(q)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                        title="Delete question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Options Grid (A, B, C, D) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 pl-9 text-xs">
                    {/* Option A */}
                    <div
                      className={`p-3 rounded-xl border flex items-start space-x-2.5 transition ${
                        correct === 'A'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium ring-1 ring-emerald-500'
                          : 'border-gray-200 bg-gray-50/60 text-gray-700'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          correct === 'A'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        A
                      </span>
                      <span className="flex-1 break-words">{q.option_a}</span>
                      {correct === 'A' && (
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </div>

                    {/* Option B */}
                    <div
                      className={`p-3 rounded-xl border flex items-start space-x-2.5 transition ${
                        correct === 'B'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium ring-1 ring-emerald-500'
                          : 'border-gray-200 bg-gray-50/60 text-gray-700'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          correct === 'B'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        B
                      </span>
                      <span className="flex-1 break-words">{q.option_b}</span>
                      {correct === 'B' && (
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </div>

                    {/* Option C */}
                    <div
                      className={`p-3 rounded-xl border flex items-start space-x-2.5 transition ${
                        correct === 'C'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium ring-1 ring-emerald-500'
                          : 'border-gray-200 bg-gray-50/60 text-gray-700'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          correct === 'C'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        C
                      </span>
                      <span className="flex-1 break-words">{q.option_c}</span>
                      {correct === 'C' && (
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </div>

                    {/* Option D */}
                    <div
                      className={`p-3 rounded-xl border flex items-start space-x-2.5 transition ${
                        correct === 'D'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium ring-1 ring-emerald-500'
                          : 'border-gray-200 bg-gray-50/60 text-gray-700'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          correct === 'D'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        D
                      </span>
                      <span className="flex-1 break-words">{q.option_d}</span>
                      {correct === 'D' && (
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT QUESTION MODAL */}
      <AnimatePresence>
        {isQuestionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 my-8 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-2.5">
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {editingQuestion ? 'Edit MCQ Question' : 'Add Multiple-Choice Question'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Provide the question prompt, four options, and select the correct key.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !questionSubmitting && setIsQuestionModalOpen(false)}
                  disabled={questionSubmitting}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleQuestionSubmit} className="space-y-4 pt-4">
                {questionError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>{questionError}</span>
                  </div>
                )}

                {/* Question Text */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Question Text <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g., Which radar band is most suitable for detecting severe storm convective cores?"
                    value={questionForm.question_text}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({ ...prev, question_text: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Options Grid (A, B, C, D) with Correct Option Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700">
                      Options & Answer Key <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-gray-500">
                      Select the radio button next to the correct answer.
                    </span>
                  </div>

                  {/* Option A */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctOption"
                      id="optA_radio"
                      checked={questionForm.correct_option === 'A'}
                      onChange={() => setQuestionForm((prev) => ({ ...prev, correct_option: 'A' }))}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1 flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                      <span className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 border-r border-gray-200">
                        A
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Option A text..."
                        value={questionForm.option_a}
                        onChange={(e) =>
                          setQuestionForm((prev) => ({ ...prev, option_a: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs border-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Option B */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctOption"
                      id="optB_radio"
                      checked={questionForm.correct_option === 'B'}
                      onChange={() => setQuestionForm((prev) => ({ ...prev, correct_option: 'B' }))}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1 flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                      <span className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 border-r border-gray-200">
                        B
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Option B text..."
                        value={questionForm.option_b}
                        onChange={(e) =>
                          setQuestionForm((prev) => ({ ...prev, option_b: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs border-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Option C */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctOption"
                      id="optC_radio"
                      checked={questionForm.correct_option === 'C'}
                      onChange={() => setQuestionForm((prev) => ({ ...prev, correct_option: 'C' }))}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1 flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                      <span className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 border-r border-gray-200">
                        C
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Option C text..."
                        value={questionForm.option_c}
                        onChange={(e) =>
                          setQuestionForm((prev) => ({ ...prev, option_c: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs border-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Option D */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctOption"
                      id="optD_radio"
                      checked={questionForm.correct_option === 'D'}
                      onChange={() => setQuestionForm((prev) => ({ ...prev, correct_option: 'D' }))}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1 flex items-center rounded-xl border border-gray-300 bg-white overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                      <span className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 border-r border-gray-200">
                        D
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Option D text..."
                        value={questionForm.option_d}
                        onChange={(e) =>
                          setQuestionForm((prev) => ({ ...prev, option_d: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs border-0 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Marks */}
                <div className="w-40">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Question Marks <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={questionForm.marks}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({ ...prev, marks: parseInt(e.target.value, 10) || 1 }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsQuestionModalOpen(false)}
                    disabled={questionSubmitting}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={questionSubmitting}
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
                  >
                    {questionSubmitting && (
                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    )}
                    {editingQuestion ? 'Save Changes' : 'Add Question'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE QUESTION CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingQuestion && (
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
                  <h3 className="text-base font-bold text-gray-900">Delete Question</h3>
                  <p className="text-xs text-gray-500">
                    Question #{deletingQuestion.question_order} will be deleted.
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                Are you sure you want to delete this question? Remaining questions will be re-sequenced automatically.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-5 mt-5 border-t border-gray-100">
                <button
                  onClick={() => setDeletingQuestion(null)}
                  disabled={deleting}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteQuestionConfirm}
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

      {/* EDIT ASSESSMENT META MODAL */}
      <AnimatePresence>
        {isEditMetaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 my-8 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">Edit Assessment Details</h3>
                <button
                  onClick={() => !metaSubmitting && setIsEditMetaOpen(false)}
                  disabled={metaSubmitting}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleMetaSubmit} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assessment Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={metaForm.title}
                    onChange={(e) => setMetaForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description / Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={metaForm.description}
                    onChange={(e) =>
                      setMetaForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assessment Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={metaForm.deadline}
                    onChange={(e) => setMetaForm((prev) => ({ ...prev, deadline: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditMetaOpen(false)}
                    disabled={metaSubmitting}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={metaSubmitting}
                    className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                  >
                    {metaSubmitting && (
                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    )}
                    Save Details
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
