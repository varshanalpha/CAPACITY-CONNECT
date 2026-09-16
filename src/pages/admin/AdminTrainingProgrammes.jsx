import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Users,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  UserCheck,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  Filter,
  Layers,
  FileText,
  Building,
  Briefcase,
  Mail,
  Phone,
  UserMinus,
  Check,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getTrainingProgrammes,
  getApprovedTrainers,
  assignTrainer,
  removeTrainer,
  createTrainingProgramme,
  updateTrainingProgramme,
  deleteTrainingProgramme,
  PROGRAMME_STATUSES,
} from '../../services/trainingProgrammeService'

export default function AdminTrainingProgrammes() {
  const navigate = useNavigate()
  const { user: currentAdmin, profile: adminProfile, isApproved } = useAuth()

  // Programme list states
  const [programmes, setProgrammes] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Notification state
  const [notification, setNotification] = useState(null)

  // CRUD Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingProgramme, setEditingProgramme] = useState(null)
  const [viewingProgramme, setViewingProgramme] = useState(null)
  const [deletingProgramme, setDeletingProgramme] = useState(null)

  // Trainer Assignment Modals state
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    programme: null,
    isChanging: false,
  })
  const [approvedTrainers, setApprovedTrainers] = useState([])
  const [loadingTrainers, setLoadingTrainers] = useState(false)
  const [trainerSearch, setTrainerSearch] = useState('')
  const [selectedTrainerId, setSelectedTrainerId] = useState('')
  const [assignSubmitting, setAssignSubmitting] = useState(false)

  // Confirm Change Trainer Modal
  const [changeConfirmModal, setChangeConfirmModal] = useState({
    isOpen: false,
    programme: null,
    targetTrainer: null,
  })

  // Remove Trainer Modal
  const [removeTrainerModal, setRemoveTrainerModal] = useState({
    isOpen: false,
    programme: null,
  })
  const [removeSubmitting, setRemoveSubmitting] = useState(false)

  // Form submission loading
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // Form state
  const initialFormState = {
    title: '',
    description: '',
    objectives: '',
    start_date: '',
    end_date: '',
    enrollment_deadline: '',
    capacity: '',
    status: 'draft',
  }
  const [formData, setFormData] = useState(initialFormState)
  const [formErrors, setFormErrors] = useState({})

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  // Fetch training programmes
  const loadProgrammes = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const result = await getTrainingProgrammes()
      if (result.success) {
        setProgrammes(result.data)
      } else {
        showNotification('error', result.error || 'Failed to load training programmes.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error fetching programmes.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadProgrammes()
  }, [loadProgrammes])

  // Form Validation
  const validateForm = (data) => {
    const errors = {}

    if (!data.title || !data.title.trim()) {
      errors.title = 'Programme Title is required.'
    }

    if (data.capacity !== '' && data.capacity !== null && data.capacity !== undefined) {
      const capNum = parseInt(data.capacity, 10)
      if (isNaN(capNum) || capNum <= 0) {
        errors.capacity = 'Maximum Capacity must be a positive number greater than 0.'
      }
    }

    if (data.start_date && data.end_date) {
      if (new Date(data.end_date) < new Date(data.start_date)) {
        errors.end_date = 'End date must not be earlier than start date.'
      }
    }

    if (data.start_date && data.enrollment_deadline) {
      if (new Date(data.enrollment_deadline) > new Date(data.start_date)) {
        errors.enrollment_deadline = 'Enrollment deadline must not be later than start date.'
      }
    }

    return errors
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData(initialFormState)
    setFormErrors({})
    setEditingProgramme(null)
    setIsCreateModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (programme) => {
    setEditingProgramme(programme)
    setFormData({
      title: programme.title || '',
      description: programme.description || '',
      objectives: programme.objectives || '',
      start_date: programme.start_date ? programme.start_date.split('T')[0] : '',
      end_date: programme.end_date ? programme.end_date.split('T')[0] : '',
      enrollment_deadline: programme.enrollment_deadline ? programme.enrollment_deadline.split('T')[0] : '',
      capacity: programme.capacity !== null && programme.capacity !== undefined ? programme.capacity : '',
      status: programme.status || 'draft',
    })
    setFormErrors({})
    setIsCreateModalOpen(true)
  }

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear specific error on change
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  // Handle Create or Update Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault()

    const errors = validateForm(formData)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      showNotification('error', 'Please resolve the highlighted validation errors.')
      return
    }

    setFormSubmitting(true)

    try {
      if (editingProgramme) {
        // Edit Programme
        const result = await updateTrainingProgramme(editingProgramme.id, formData)
        if (result.success) {
          showNotification('success', 'Training programme updated successfully.')
          setIsCreateModalOpen(false)
          setEditingProgramme(null)
          await loadProgrammes(true)
        } else {
          showNotification('error', result.error || 'Failed to update training programme.')
        }
      } else {
        // Create Programme
        const result = await createTrainingProgramme(formData)
        if (result.success) {
          showNotification('success', 'Training programme created successfully.')
          setIsCreateModalOpen(false)
          setFormData(initialFormState)
          await loadProgrammes(true)
        } else {
          showNotification('error', result.error || 'Failed to create training programme.')
        }
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingProgramme) return

    setDeleteSubmitting(true)
    try {
      const result = await deleteTrainingProgramme(deletingProgramme.id)
      if (result.success) {
        showNotification('success', 'Training programme deleted successfully.')
        setDeletingProgramme(null)
        if (viewingProgramme?.id === deletingProgramme.id) {
          setViewingProgramme(null)
        }
        await loadProgrammes(true)
      } else {
        showNotification('error', result.error || 'Failed to delete training programme.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Deletion failed.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ==========================================
  // TRAINER ASSIGNMENT HANDLERS
  // ==========================================

  // Open Assign / Change Trainer Modal
  const handleOpenAssignTrainer = async (programme, isChanging = false) => {
    setAssignModal({
      isOpen: true,
      programme,
      isChanging,
    })
    setSelectedTrainerId(programme.trainer_id || '')
    setTrainerSearch('')
    setLoadingTrainers(true)

    try {
      const result = await getApprovedTrainers()
      if (result.success) {
        setApprovedTrainers(result.data)
      } else {
        showNotification('error', result.error || 'Failed to load approved trainers.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error fetching trainers.')
    } finally {
      setLoadingTrainers(false)
    }
  }

  // Submit Trainer Selection (or prompt confirmation if changing)
  const handleAssignTrainerSubmit = async () => {
    if (!selectedTrainerId) {
      showNotification('error', 'Please select an approved trainer from the list.')
      return
    }

    const targetTrainer = approvedTrainers.find((t) => t.id === selectedTrainerId)
    if (!targetTrainer) {
      showNotification('error', 'Selected trainer is not valid or no longer approved.')
      return
    }

    // If changing an existing trainer, show confirmation modal
    if (assignModal.isChanging && assignModal.programme.trainer_id && assignModal.programme.trainer_id !== selectedTrainerId) {
      setChangeConfirmModal({
        isOpen: true,
        programme: assignModal.programme,
        targetTrainer,
      })
      return
    }

    // If same trainer selected in change mode
    if (assignModal.isChanging && assignModal.programme.trainer_id === selectedTrainerId) {
      setAssignModal({ isOpen: false, programme: null, isChanging: false })
      return
    }

    // Direct assignment
    await executeAssignTrainer(assignModal.programme.id, targetTrainer.id, false)
  }

  // Execute assignment update in Supabase
  const executeAssignTrainer = async (programmeId, trainerId, isChange = false) => {
    setAssignSubmitting(true)
    try {
      const result = await assignTrainer(programmeId, trainerId)
      if (result.success) {
        showNotification('success', isChange ? 'Trainer changed successfully.' : 'Trainer assigned successfully.')
        setAssignModal({ isOpen: false, programme: null, isChanging: false })
        setChangeConfirmModal({ isOpen: false, programme: null, targetTrainer: null })

        // Update viewing programme if open
        if (viewingProgramme && viewingProgramme.id === programmeId) {
          setViewingProgramme(result.data)
        }

        await loadProgrammes(true)
      } else {
        showNotification('error', result.error || 'Failed to assign trainer.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to assign trainer.')
    } finally {
      setAssignSubmitting(false)
    }
  }

  // Open Remove Trainer Modal
  const handleOpenRemoveTrainer = (programme) => {
    setRemoveTrainerModal({
      isOpen: true,
      programme,
    })
  }

  // Execute Remove Trainer in Supabase
  const handleRemoveTrainerConfirm = async () => {
    if (!removeTrainerModal.programme) return

    setRemoveSubmitting(true)
    const programmeId = removeTrainerModal.programme.id

    try {
      const result = await removeTrainer(programmeId)
      if (result.success) {
        showNotification('success', 'Trainer removed successfully.')
        setRemoveTrainerModal({ isOpen: false, programme: null })

        // Update viewing programme if open
        if (viewingProgramme && viewingProgramme.id === programmeId) {
          setViewingProgramme(result.data)
        }

        await loadProgrammes(true)
      } else {
        showNotification('error', result.error || 'Failed to remove trainer.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to remove trainer.')
    } finally {
      setRemoveSubmitting(false)
    }
  }

  // Filter programmes
  const filteredProgrammes = programmes.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.objectives?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.trainer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || (p.status || '').toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  // Filter approved trainers in assignment modal
  const filteredTrainers = approvedTrainers.filter((t) => {
    if (!trainerSearch.trim()) return true
    const searchLower = trainerSearch.toLowerCase()
    return (
      (t.full_name && t.full_name.toLowerCase().includes(searchLower)) ||
      (t.designation && t.designation.toLowerCase().includes(searchLower)) ||
      (t.department && t.department.toLowerCase().includes(searchLower)) ||
      (t.email && t.email.toLowerCase().includes(searchLower))
    )
  })

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

  // Status Badge UI
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

  return (
    <div className="space-y-6 pb-16">
      {/* Navigation Switcher Tabs */}
      <div className="flex border-b border-gray-200">
        <Link
          to="/admin/dashboard"
          className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition flex items-center space-x-2"
        >
          <Users className="h-4 w-4" />
          <span>User Approvals & Management</span>
        </Link>
        <Link
          to="/admin/training-programmes"
          className="border-b-2 border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-600 flex items-center space-x-2"
        >
          <BookOpen className="h-4 w-4" />
          <span>Training Programmes</span>
        </Link>
      </div>

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
                {programmes.length} Total
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Create and manage organizational training programmes.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadProgrammes(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-60"
            title="Refresh programmes list"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create Training Programme
          </button>
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
            placeholder="Search by title, description, objectives, trainer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
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
            className="rounded-lg border border-gray-300 bg-white py-1.5 px-3 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses ({programmes.length})</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Programme List Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]" />
            <p className="mt-3 text-sm text-gray-500 font-medium">Loading training programmes...</p>
          </div>
        ) : filteredProgrammes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No training programmes found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or status filter.'
                : 'Get started by creating your first organizational training programme.'}
            </p>
            {searchTerm || statusFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create Training Programme
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/75">
                <tr>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-gray-700">
                    Programme
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700">
                    Start Date
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700">
                    End Date
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700">
                    Capacity
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 min-w-[200px]">
                    Trainer
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700">
                    Created Date
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredProgrammes.map((programme) => (
                  <tr key={programme.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span
                          onClick={() => setViewingProgramme(programme)}
                          className="font-semibold text-sm text-gray-900 hover:text-blue-600 cursor-pointer transition line-clamp-1"
                        >
                          {programme.title}
                        </span>
                        {programme.description && (
                          <span className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {programme.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>{formatDate(programme.start_date)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>{formatDate(programme.end_date)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                      <div className="flex items-center space-x-1.5">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        <span>{programme.capacity ? `${programme.capacity} seats` : 'Not specified'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(programme.status)}
                    </td>

                    {/* TRAINER COLUMN WITH ASSIGN / CHANGE / REMOVE ACTIONS */}
                    <td className="px-4 py-4">
                      {programme.trainer ? (
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-xs text-gray-900 truncate max-w-[150px]">
                              {programme.trainer.full_name}
                            </span>
                          </div>
                          {(programme.trainer.designation || programme.trainer.department) && (
                            <span className="text-[11px] text-gray-500 truncate max-w-[160px]">
                              {programme.trainer.designation || programme.trainer.department}
                            </span>
                          )}
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={() => handleOpenAssignTrainer(programme, true)}
                              className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline transition"
                            >
                              Change Trainer
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleOpenRemoveTrainer(programme)}
                              className="text-[11px] font-medium text-rose-600 hover:text-rose-800 hover:underline transition"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-1.5 items-start">
                          <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium ring-1 ring-inset ring-amber-600/20">
                            Trainer not assigned
                          </span>
                          <button
                            onClick={() => handleOpenAssignTrainer(programme, false)}
                            className="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition shadow-xs"
                          >
                            <UserPlus className="mr-1 h-3 w-3" />
                            Assign Trainer
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                      {formatDate(programme.created_at)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setViewingProgramme(programme)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(programme)}
                          className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Programme"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProgramme(programme)}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Programme"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ASSIGN / CHANGE TRAINER MODAL */}
      <AnimatePresence>
        {assignModal.isOpen && assignModal.programme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-gray-100 my-8 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {assignModal.isChanging ? 'Change Trainer' : 'Assign Trainer'}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Select an approved trainer for this training programme.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAssignModal({ isOpen: false, programme: null, isChanging: false })}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Programme Context Banner */}
              <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
                <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                  Training Programme:
                </span>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {assignModal.programme.title}
                </p>
                {assignModal.programme.trainer && (
                  <p className="text-xs text-gray-600 mt-1">
                    Current Assigned Trainer:{' '}
                    <strong className="text-gray-900">{assignModal.programme.trainer.full_name}</strong>
                  </p>
                )}
              </div>

              {/* Search Filter */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Trainer:
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search trainers by name, designation, department..."
                    value={trainerSearch}
                    onChange={(e) => setTrainerSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Trainer List */}
              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-2 space-y-1.5">
                {loadingTrainers ? (
                  <div className="p-8 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-emerald-600 border-r-transparent align-[-0.125em]" />
                    <p className="mt-2 text-xs text-gray-500 font-medium">Loading approved trainers...</p>
                  </div>
                ) : filteredTrainers.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-xs font-semibold text-gray-700">No approved trainers found</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {trainerSearch
                        ? `No trainers match "${trainerSearch}".`
                        : 'There are currently no approved trainer profiles in the system.'}
                    </p>
                  </div>
                ) : (
                  filteredTrainers.map((trainer) => {
                    const isSelected = selectedTrainerId === trainer.id
                    return (
                      <div
                        key={trainer.id}
                        onClick={() => setSelectedTrainerId(trainer.id)}
                        className={`cursor-pointer rounded-lg p-3 transition flex items-center justify-between border ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`rounded-full p-2 text-xs font-bold flex items-center justify-center ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-gray-900">
                                {trainer.full_name || 'Unnamed Trainer'}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                Approved
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-gray-500 mt-0.5">
                              {trainer.designation && (
                                <span className="flex items-center">
                                  <Briefcase className="mr-1 h-3 w-3 text-gray-400" />
                                  {trainer.designation}
                                </span>
                              )}
                              {trainer.department && (
                                <span className="flex items-center">
                                  <Building className="mr-1 h-3 w-3 text-gray-400" />
                                  {trainer.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex-shrink-0 ml-2">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAssignModal({ isOpen: false, programme: null, isChanging: false })}
                  disabled={assignSubmitting}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignTrainerSubmit}
                  disabled={assignSubmitting || !selectedTrainerId || loadingTrainers}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
                >
                  {assignSubmitting && (
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  )}
                  {assignModal.isChanging ? 'Change Trainer' : 'Assign Trainer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM CHANGE TRAINER MODAL */}
      <AnimatePresence>
        {changeConfirmModal.isOpen && changeConfirmModal.targetTrainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100"
            >
              <div className="flex items-start space-x-3">
                <div className="rounded-full bg-amber-50 p-2.5 text-amber-600 flex-shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Confirm Trainer Change</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Change the trainer for this training programme?
                  </p>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
                    <p className="font-medium text-gray-500">
                      Programme: <strong className="text-gray-900">{changeConfirmModal.programme?.title}</strong>
                    </p>
                    <p className="font-medium text-gray-500">
                      New Trainer: <strong className="text-emerald-700">{changeConfirmModal.targetTrainer.full_name}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setChangeConfirmModal({ isOpen: false, programme: null, targetTrainer: null })}
                  disabled={assignSubmitting}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeAssignTrainer(changeConfirmModal.programme.id, changeConfirmModal.targetTrainer.id, true)}
                  disabled={assignSubmitting}
                  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-60"
                >
                  {assignSubmitting && (
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  )}
                  Confirm Change
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM REMOVE TRAINER MODAL */}
      <AnimatePresence>
        {removeTrainerModal.isOpen && removeTrainerModal.programme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100"
            >
              <div className="flex items-start space-x-3">
                <div className="rounded-full bg-rose-50 p-2.5 text-rose-600 flex-shrink-0">
                  <UserMinus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Remove Assigned Trainer</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Are you sure you want to remove the assigned trainer?
                  </p>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
                    <p className="text-gray-500">
                      Programme: <strong className="text-gray-900">{removeTrainerModal.programme.title}</strong>
                    </p>
                    {removeTrainerModal.programme.trainer && (
                      <p className="text-gray-500">
                        Current Trainer: <strong className="text-rose-700">{removeTrainerModal.programme.trainer.full_name}</strong>
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    This will unassign the trainer from this programme. The trainer&apos;s user account and profile will remain unaffected.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setRemoveTrainerModal({ isOpen: false, programme: null })}
                  disabled={removeSubmitting}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemoveTrainerConfirm}
                  disabled={removeSubmitting}
                  className="inline-flex items-center rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm transition disabled:opacity-60"
                >
                  {removeSubmitting && (
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  )}
                  Remove Trainer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE & EDIT MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
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
                    <h2 className="text-lg font-bold text-gray-900">
                      {editingProgramme ? 'Edit Training Programme' : 'Create Training Programme'}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {editingProgramme
                        ? 'Update details for this training programme.'
                        : 'Define the parameters of the new training programme. Initial status is draft.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 pt-4">
                {/* Programme Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Programme Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="e.g. Advanced Weather Radar Interpretation"
                    className={`mt-1 w-full rounded-lg border px-3.5 py-2 text-xs focus:outline-none focus:ring-1 transition ${
                      formErrors.title
                        ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white'
                    }`}
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-xs text-rose-600">{formErrors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Description <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Training programme focused on interpretation and application of weather radar observations."
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>

                {/* Learning Objectives */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Learning Objectives <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    name="objectives"
                    value={formData.objectives}
                    onChange={handleFormChange}
                    placeholder="Improve understanding of radar products and their application in operational meteorology."
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>

                {/* Date Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Start Date <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleFormChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      End Date <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleFormChange}
                      className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 transition ${
                        formErrors.end_date
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white'
                      }`}
                    />
                    {formErrors.end_date && (
                      <p className="mt-1 text-[11px] text-rose-600">{formErrors.end_date}</p>
                    )}
                  </div>

                  {/* Enrollment Deadline */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Enrollment Deadline <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="date"
                      name="enrollment_deadline"
                      value={formData.enrollment_deadline}
                      onChange={handleFormChange}
                      className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 transition ${
                        formErrors.enrollment_deadline
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white'
                      }`}
                    />
                    {formErrors.enrollment_deadline && (
                      <p className="mt-1 text-[11px] text-rose-600">{formErrors.enrollment_deadline}</p>
                    )}
                  </div>
                </div>

                {/* Capacity & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Capacity */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Maximum Capacity <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleFormChange}
                      placeholder="e.g. 30"
                      className={`mt-1 w-full rounded-lg border px-3.5 py-2 text-xs focus:outline-none focus:ring-1 transition ${
                        formErrors.capacity
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white'
                      }`}
                    />
                    {formErrors.capacity && (
                      <p className="mt-1 text-[11px] text-rose-600">{formErrors.capacity}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Status
                    </label>
                    {editingProgramme ? (
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleFormChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize"
                      >
                        <option value={PROGRAMME_STATUSES.DRAFT}>Draft</option>
                        <option value={PROGRAMME_STATUSES.PUBLISHED}>Published</option>
                        <option value={PROGRAMME_STATUSES.ONGOING}>Ongoing</option>
                        <option value={PROGRAMME_STATUSES.COMPLETED}>Completed</option>
                        <option value={PROGRAMME_STATUSES.CANCELLED}>Cancelled</option>
                      </select>
                    ) : (
                      <div className="mt-1 flex items-center h-[38px] px-3.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-500">
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          Draft (Default)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={formSubmitting}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    {formSubmitting && (
                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    )}
                    {editingProgramme ? 'Save Changes' : 'Create Programme'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL VIEW MODAL */}
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
                    <h2 className="text-lg font-bold text-gray-900">Programme Details</h2>
                    <p className="text-xs text-gray-500">Comprehensive overview of training programme.</p>
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
                  <div>{getStatusBadge(viewingProgramme.status)}</div>
                </div>

                {/* Trainer Section Card */}
                <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 flex items-center">
                      <UserCheck className="mr-1.5 h-4 w-4 text-emerald-600" />
                      Assigned Trainer
                    </span>
                    {viewingProgramme.trainer ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const p = viewingProgramme
                            handleOpenAssignTrainer(p, true)
                          }}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Change Trainer
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => {
                            const p = viewingProgramme
                            handleOpenRemoveTrainer(p)
                          }}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                        >
                          Remove Trainer
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const p = viewingProgramme
                          handleOpenAssignTrainer(p, false)
                        }}
                        className="inline-flex items-center rounded bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        Assign Trainer
                      </button>
                    )}
                  </div>

                  {viewingProgramme.trainer ? (
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
                      <div>
                        <span className="text-gray-500 text-[11px]">Email Address:</span>
                        <p className="font-semibold text-gray-800 truncate">{viewingProgramme.trainer.email || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs text-amber-800">
                      Trainer not assigned. Click &quot;Assign Trainer&quot; above to assign an approved trainer to this programme.
                    </div>
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

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] font-medium text-gray-500">Maximum Capacity</span>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">
                      {viewingProgramme.capacity ? `${viewingProgramme.capacity} Seats` : 'Not specified'}
                    </p>
                  </div>

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
                    <span className="text-[11px] font-medium text-gray-500">Created Date</span>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">
                      {formatDate(viewingProgramme.created_at)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] font-medium text-gray-500">Last Updated</span>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">
                      {formatDate(viewingProgramme.updated_at)}
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      const p = viewingProgramme
                      setViewingProgramme(null)
                      handleOpenEdit(p)
                    }}
                    className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                  >
                    <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                    Edit Programme
                  </button>
                  <button
                    onClick={() => setViewingProgramme(null)}
                    className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingProgramme && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100"
            >
              <div className="flex items-start space-x-3">
                <div className="rounded-full bg-rose-50 p-2.5 text-rose-600 flex-shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Delete Training Programme</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Are you sure you want to delete this training programme?
                  </p>
                  <div className="mt-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-semibold text-gray-900 line-clamp-1">
                      {deletingProgramme.title}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    This action will remove the programme record from the system.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setDeletingProgramme(null)}
                  disabled={deleteSubmitting}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteSubmitting}
                  className="inline-flex items-center rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm transition disabled:opacity-60"
                >
                  {deleteSubmitting && (
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  )}
                  Delete Programme
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
