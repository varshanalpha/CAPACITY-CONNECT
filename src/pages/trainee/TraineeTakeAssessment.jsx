import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  Send,
  Lock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Save,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getTraineeAssessmentDetails,
  getTraineeAssessmentQuestions,
  startTraineeAssessment,
  getAttemptAnswers,
  saveAssessmentAnswer,
  submitTraineeAssessment,
  ATTEMPT_STATUS,
} from '../../services/assessmentService'

export default function TraineeTakeAssessment() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Main Data States
  const [assessment, setAssessment] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [questions, setQuestions] = useState([])
  const [selectedAnswers, setSelectedAnswers] = useState({})

  // UI Flow States
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [savingStatus, setSavingStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  // Initial Load
  const loadData = useCallback(async () => {
    if (!assessmentId || !user?.id) return

    setLoading(true)
    setError(null)

    try {
      // 1. Fetch Assessment Details & Attempt Record
      const assessRes = await getTraineeAssessmentDetails(assessmentId, user.id)
      if (!assessRes.success || !assessRes.data) {
        setError(assessRes.error || 'Failed to load assessment details.')
        return
      }

      const assessData = assessRes.data
      setAssessment(assessData)
      if (assessData.questions && assessData.questions.length > 0) {
        setQuestions(assessData.questions)
      }

      const existingAttempt = assessData.attempt
      setAttempt(existingAttempt)

      // 2. If attempt exists, load saved answers
      if (existingAttempt) {
        // If questions weren't in details, fetch them via secure RPC
        if (!assessData.questions || assessData.questions.length === 0) {
          const qRes = await getTraineeAssessmentQuestions(assessmentId)
          if (qRes.success) {
            setQuestions(qRes.data || [])
          } else {
            setError(qRes.error || 'Failed to load assessment questions.')
          }
        }

        // Fetch Saved Answers
        const ansRes = await getAttemptAnswers(existingAttempt.id)
        if (ansRes.success) {
          setSelectedAnswers(ansRes.answersMap || {})
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading assessment.')
    } finally {
      setLoading(false)
    }
  }, [assessmentId, user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Start Assessment Action
  const handleStartAssessment = async () => {
    if (!assessment || !user?.id) return

    // Check if deadline passed
    if (assessment.deadline && new Date(assessment.deadline) < new Date()) {
      showNotification('error', 'The deadline for this assessment has passed.')
      return
    }

    setStarting(true)
    setError(null)

    try {
      // 1. Start or resume attempt in Supabase
      const startRes = await startTraineeAssessment({
        assessmentId: assessment.id,
        traineeId: user.id,
        totalMarks: assessment.total_marks || 0,
      })

      if (!startRes.success || !startRes.data) {
        setError(startRes.error || 'Could not start assessment.')
        return
      }

      setAttempt(startRes.data)

      // 2. Fetch Questions (strictly omitting correct_option)
      const qRes = await getTraineeAssessmentQuestions(assessment.id)
      if (qRes.success) {
        setQuestions(qRes.data || [])
      } else {
        setError(qRes.error || 'Failed to load questions.')
      }

      // 3. Fetch existing answers if resumed
      if (startRes.resumed) {
        const ansRes = await getAttemptAnswers(startRes.data.id)
        if (ansRes.success) {
          setSelectedAnswers(ansRes.answersMap || {})
        }
      }

      setCurrentQuestionIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start assessment.')
    } finally {
      setStarting(false)
    }
  }

  // Select Option and Autosave
  const handleSelectOption = async (questionId, optionKey) => {
    if (!attempt || attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) return

    // Optimistic UI update
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }))

    setSavingStatus('saving')

    try {
      const saveRes = await saveAssessmentAnswer({
        attemptId: attempt.id,
        questionId,
        selectedOption: optionKey,
      })

      if (saveRes.success) {
        setSavingStatus('saved')
        setTimeout(() => setSavingStatus('idle'), 2000)
      } else {
        setSavingStatus('error')
        showNotification('error', 'Failed to save answer. Please retry.')
      }
    } catch (err) {
      setSavingStatus('error')
      console.error('Error saving answer:', err)
    }
  }

  // Handle Submission
  const handleConfirmSubmit = async () => {
    if (!attempt || attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) return

    setSubmitting(true)

    try {
      const res = await submitTraineeAssessment(attempt.id)
      if (res.success && res.data) {
        setAttempt(res.data)
        setIsSubmitModalOpen(false)
        showNotification('success', 'Assessment submitted successfully!')
      } else {
        showNotification('error', res.error || 'Failed to submit assessment.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error submitting assessment.')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculations
  const totalQuestions = questions.length
  const answeredCount = useMemo(() => {
    return Object.keys(selectedAnswers).filter((qId) =>
      questions.some((q) => q.id === qId && selectedAnswers[qId])
    ).length
  }, [selectedAnswers, questions])

  const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
  const currentQuestion = questions[currentQuestionIndex] || null

  const isDeadlinePassed = assessment?.deadline && new Date(assessment.deadline) < new Date()

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading assessment details...</p>
        </div>
      </div>
    )
  }

  // 2. Fatal Error State
  if (error && !assessment) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full p-8 bg-slate-800/80 rounded-3xl border border-slate-700/80 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Assessment Error</h2>
          <p className="text-slate-400 text-sm">{error}</p>
          <button
            onClick={() => navigate('/trainee/training-programmes')}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Programmes
          </button>
        </div>
      </div>
    )
  }

  // 3. Post-Submission Screen (Attempt is submitted)
  if (attempt?.status === ATTEMPT_STATUS.SUBMITTED) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full p-8 bg-slate-800/80 rounded-3xl border border-emerald-500/30 text-center space-y-6 shadow-2xl backdrop-blur-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Completed
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Assessment Submitted</h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Your assessment has been submitted successfully. Your trainer will review your submission.
            </p>
          </div>

          <div className="p-5 bg-slate-900/60 rounded-2xl border border-slate-700/60 text-left space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Assessment:</span>
              <span className="text-white font-medium">{assessment?.title}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Programme:</span>
              <span className="text-slate-300">{assessment?.training_programme?.title || 'Training Programme'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Submitted At:</span>
              <span className="text-emerald-400 font-medium">{formatDate(attempt.submitted_at)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Questions Answered:</span>
              <span className="text-white font-medium">
                {answeredCount} of {totalQuestions}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/trainee/training-programmes/${assessment?.training_programme_id}/assessments`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Programme Assessments
            </Link>
            <Link
              to="/trainee/training-programmes"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              All Programmes
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // 4. Pre-Start Screen (Attempt not created yet)
  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full p-8 md:p-10 bg-slate-800/70 rounded-3xl border border-slate-700/80 shadow-2xl backdrop-blur-md space-y-6"
        >
          {/* Top navigation */}
          <Link
            to={`/trainee/training-programmes/${assessment?.training_programme_id}/assessments`}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Assessments
          </Link>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <BookOpen className="w-4 h-4" />
              <span>{assessment?.training_programme?.title || 'Training Programme'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{assessment?.title}</h1>
            {assessment?.description && (
              <p className="text-slate-300 text-sm leading-relaxed">{assessment.description}</p>
            )}
          </div>

          {/* Assessment Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Questions</p>
                <p className="text-base font-bold text-white">{assessment?.question_count} MCQs</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Marks</p>
                <p className="text-base font-bold text-white">{assessment?.total_marks} Marks</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Deadline</p>
                <p className="text-xs font-semibold text-white">
                  {assessment?.deadline ? formatDate(assessment.deadline) : 'No Deadline'}
                </p>
              </div>
            </div>
          </div>

          {/* Important Rules / Instructions */}
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-2.5 text-xs text-slate-300">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Important Instructions
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-400">
              <li>You can only attempt this assessment <strong className="text-slate-200">once</strong>.</li>
              <li>Your answers will automatically be saved as you choose them.</li>
              <li>You can navigate between questions freely and change your answers before final submission.</li>
              <li>Once you click <strong className="text-emerald-400">Submit Assessment</strong>, you cannot modify your answers.</li>
            </ul>
          </div>

          {/* Deadline Warning if passed */}
          {isDeadlinePassed ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-sm">
              <Lock className="w-5 h-5 flex-shrink-0" />
              <span>The deadline for this assessment has passed. New attempts are closed.</span>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={handleStartAssessment}
                disabled={starting}
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-base transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Preparing Assessment...</span>
                  </>
                ) : (
                  <>
                    <span>Start Assessment</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  // 5. In-Progress Assessment Taking Interface
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5 shadow-2xl border ${
              notification.type === 'success'
                ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/50'
                : 'bg-rose-900/90 text-rose-200 border-rose-500/50'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm('Your answers are saved. Are you sure you want to exit? You can continue later before the deadline.')) {
                  navigate(`/trainee/training-programmes/${assessment?.training_programme_id}/assessments`)
                }
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Exit Assessment"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-bold text-white line-clamp-1">{assessment?.title}</h2>
              <p className="text-xs text-slate-400 line-clamp-1">{assessment?.training_programme?.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Autosave status indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {savingStatus === 'saving' && (
                <span className="text-amber-400 flex items-center gap-1 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </span>
              )}
              {savingStatus === 'saved' && (
                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
              {savingStatus === 'idle' && (
                <span className="text-slate-500 flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" />
                  Autosaved
                </span>
              )}
            </div>

            {/* Answered Counter */}
            <div className="px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 text-xs font-semibold text-emerald-400">
              {answeredCount} / {totalQuestions} Answered
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-5xl mx-auto mt-2.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Main Assessment Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col justify-between space-y-6">
        {/* Question Navigator Number Pills */}
        <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Question Navigator
            </span>
            <span className="text-xs text-slate-500">Click a number to jump</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(selectedAnswers[q.id])
              const isCurrent = idx === currentQuestionIndex

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                    isCurrent
                      ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 shadow-md shadow-emerald-500/20'
                      : isAnswered
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/60 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>

        {/* Current Question Card */}
        {currentQuestion ? (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="p-6 md:p-8 bg-slate-900/80 rounded-3xl border border-slate-800 shadow-xl space-y-6"
          >
            {/* Question Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                {currentQuestion.marks || 1} {Number(currentQuestion.marks) === 1 ? 'Mark' : 'Marks'}
              </span>
            </div>

            {/* Question Text */}
            <p className="text-base md:text-lg font-medium text-slate-100 leading-relaxed">
              {currentQuestion.question_text}
            </p>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {[
                { key: 'A', text: currentQuestion.option_a },
                { key: 'B', text: currentQuestion.option_b },
                { key: 'C', text: currentQuestion.option_c },
                { key: 'D', text: currentQuestion.option_d },
              ].map(({ key, text }) => {
                const isSelected = selectedAnswers[currentQuestion.id] === key

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, key)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600'
                    }`}
                  >
                    {/* Option Letter Indicator */}
                    <div
                      className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                      }`}
                    >
                      {key}
                    </div>

                    {/* Option Text */}
                    <span className="text-sm md:text-base font-normal flex-1">{text}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        ) : (
          <div className="p-8 text-center text-slate-400">No questions available.</div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 pt-4">
          <button
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                <span>Review & Submit</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Submission Confirmation Modal */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full p-6 md:p-8 bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 mb-3">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Submit Assessment?</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Are you sure you want to submit your assessment? Once submitted, your answers cannot be modified.
                </p>
              </div>

              {/* Summary Stats */}
              <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-2 text-sm">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Total Questions:</span>
                  <span className="font-bold text-white">{totalQuestions}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Answered:</span>
                  <span className="font-bold text-emerald-400">{answeredCount}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Unanswered:</span>
                  <span className={`font-bold ${totalQuestions - answeredCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {totalQuestions - answeredCount}
                  </span>
                </div>
              </div>

              {/* Warning if unanswered questions exist */}
              {totalQuestions - answeredCount > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    You have {totalQuestions - answeredCount} unanswered {totalQuestions - answeredCount === 1 ? 'question' : 'questions'}.
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Yes, Submit</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
