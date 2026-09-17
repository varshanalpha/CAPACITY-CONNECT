import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  FolderOpen,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Video,
  Presentation,
  File,
  Download,
  ExternalLink,
  Trash2,
  Upload,
  ArrowLeft,
  Filter,
  Check,
  HardDrive,
  Info,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { getTrainingProgrammeById } from '../../services/trainingProgrammeService'
import {
  getProgrammeResources,
  uploadProgrammeResource,
  getResourceSignedUrl,
  deleteProgrammeResource,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  ALLOWED_FILE_EXTENSIONS,
} from '../../services/learningResourceService'

export default function TrainerProgrammeResources() {
  const { programmeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Programme and Resources State
  const [programme, setProgramme] = useState(null)
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Notification Toast
  const [notification, setNotification] = useState(null)

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    description: '',
    resource_type: RESOURCE_TYPES.STUDY_MATERIAL,
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  // Delete Modal State
  const [deletingResource, setDeletingResource] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Action Loading State (for signed URLs)
  const [openingResourceId, setOpeningResourceId] = useState(null)
  const [downloadingResourceId, setDownloadingResourceId] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  // Load Programme Details and its Resources
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

        // 3. Fetch Learning Resources
        const resResult = await getProgrammeResources(programmeId)
        if (resResult.success) {
          setResources(resResult.data)
        } else {
          showNotification('error', resResult.error || 'Failed to load learning resources.')
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Error loading programme data.')
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

  // Open Upload Modal
  const handleOpenUpload = () => {
    setUploadFormData({
      title: '',
      description: '',
      resource_type: RESOURCE_TYPES.STUDY_MATERIAL,
    })
    setSelectedFile(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setIsUploadModalOpen(true)
  }

  // Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setUploadError(null)

    // Auto-populate title if empty
    if (!uploadFormData.title.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      setUploadFormData((prev) => ({ ...prev, title: baseName }))
    }
  }

  // Handle Upload Submission
  const handleUploadSubmit = async (e) => {
    e.preventDefault()

    if (!uploadFormData.title.trim()) {
      setUploadError('Resource Title is required.')
      return
    }

    if (!selectedFile) {
      setUploadError('Please choose a file to upload.')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const result = await uploadProgrammeResource(
        programmeId,
        selectedFile,
        uploadFormData,
        user.id
      )

      if (result.success) {
        showNotification('success', `"${result.data.title}" uploaded successfully.`)
        setIsUploadModalOpen(false)
        setSelectedFile(null)
        await loadData(true)
      } else {
        setUploadError(result.error || 'Upload failed. Please try again.')
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error during file upload.')
    } finally {
      setUploading(false)
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
        showNotification('error', result.error || 'Unable to open resource.')
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
        // Trigger browser download
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

  // Delete Resource Execution
  const handleDeleteConfirm = async () => {
    if (!deletingResource) return
    setDeleting(true)

    try {
      const result = await deleteProgrammeResource(deletingResource)
      if (result.success) {
        showNotification('success', `"${deletingResource.title}" deleted successfully.`)
        setDeletingResource(null)
        await loadData(true)
      } else {
        showNotification('error', result.error || 'Failed to delete resource.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error deleting resource.')
    } finally {
      setDeleting(false)
    }
  }

  // Format Helper: File Size
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  // Format Helper: Dates
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

  // Programme Status Badge
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

  // Filter resources
  const filteredResources = resources.filter((res) => {
    const s = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === '' ||
      res.title?.toLowerCase().includes(s) ||
      res.description?.toLowerCase().includes(s) ||
      res.original_file_name?.toLowerCase().includes(s)

    const matchesType = typeFilter === 'all' || res.resource_type === typeFilter

    return matchesSearch && matchesType
  })

  // Render Authorization / Loading Error State
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
                  <FolderOpen className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {programme?.title || 'Learning Resources'}
                    </h1>
                    {programme && getStatusBadge(programme.status)}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage learning materials, lecture recordings, presentations, and documents for this programme.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing || loading}
                  className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-60"
                  title="Refresh resources"
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={handleOpenUpload}
                  className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Upload Resource
                </button>
              </div>
            </div>

            {/* Programme Meta Info Cards */}
            {programme && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                  <span className="text-[11px] text-gray-500 block">Schedule Dates</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block truncate">
                    {formatDate(programme.start_date)} – {formatDate(programme.end_date)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                  <span className="text-[11px] text-gray-500 block">Enrollment Deadline</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block truncate">
                    {formatDate(programme.enrollment_deadline)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                  <span className="text-[11px] text-gray-500 block">Capacity</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">
                    {programme.capacity ? `${programme.capacity} Seats` : 'Open Capacity'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[11px] text-emerald-700 block font-medium">
                    Total Resources
                  </span>
                  <span className="font-bold text-emerald-900 mt-0.5 block">
                    {resources.length} Uploaded
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
            placeholder="Search by resource title, description, filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">Resource Type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white py-1.5 px-3 text-xs font-medium text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Types ({resources.length})</option>
            <option value={RESOURCE_TYPES.STUDY_MATERIAL}>Study Materials</option>
            <option value={RESOURCE_TYPES.PRESENTATION}>Presentations</option>
            <option value={RESOURCE_TYPES.RECORDED_LECTURE}>Recorded Lectures</option>
            <option value={RESOURCE_TYPES.OTHER}>Other</option>
          </select>

          {(searchTerm || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setTypeFilter('all')
              }}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Resources List / Grid */}
      <div>
        {loading ? (
          <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent" />
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading learning resources...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">
              {searchTerm || typeFilter !== 'all'
                ? 'No matching resources found'
                : 'No learning resources uploaded yet'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {searchTerm || typeFilter !== 'all'
                ? 'Try adjusting your search criteria or type filter.'
                : 'Upload lecture recordings, presentations, notes, and study materials for your trainees.'}
            </p>
            {searchTerm || typeFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setTypeFilter('all')
                }}
                className="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={handleOpenUpload}
                className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Upload First Resource
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((res) => {
              const typeDetails = getResourceTypeDetails(res.resource_type)
              const isOpening = openingResourceId === res.id
              const isDownloading = downloadingResourceId === res.id

              return (
                <div
                  key={res.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-200 transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Title & Resource Type Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2 min-w-0">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 mt-0.5">
                          {typeDetails.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">
                            {res.title}
                          </h3>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset mt-1 ${typeDetails.badgeClass}`}
                          >
                            {typeDetails.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {res.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {res.description}
                      </p>
                    )}

                    {/* File Meta Information */}
                    <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 space-y-1.5 text-[11px] text-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 truncate max-w-[120px]">File:</span>
                        <span className="font-medium text-gray-800 truncate max-w-[180px]" title={res.original_file_name}>
                          {res.original_file_name || 'Attached file'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Size:</span>
                        <span className="font-medium text-gray-800">{formatFileSize(res.file_size)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Uploaded:</span>
                        <span className="font-medium text-gray-800">{formatDate(res.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions: View / Download / Delete */}
                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setDeletingResource(res)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                      title="Delete resource"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewResource(res)}
                        disabled={isOpening}
                        className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs disabled:opacity-60"
                        title="View/Open file securely in browser"
                      >
                        {isOpening ? (
                          <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-r-transparent" />
                        ) : (
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                        )}
                        View
                      </button>

                      <button
                        onClick={() => handleDownloadResource(res)}
                        disabled={isDownloading}
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-60"
                        title="Download file"
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
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* UPLOAD RESOURCE MODAL */}
      <AnimatePresence>
        {isUploadModalOpen && (
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
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Upload Learning Resource</h3>
                    <p className="text-xs text-gray-500">Upload files for &ldquo;{programme?.title}&rdquo;</p>
                  </div>
                </div>
                <button
                  onClick={() => !uploading && setIsUploadModalOpen(false)}
                  disabled={uploading}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4">
                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Resource Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Resource Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Week 1 Lecture Slides, Workshop Notes"
                    value={uploadFormData.title}
                    onChange={(e) =>
                      setUploadFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Resource Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Resource Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={uploadFormData.resource_type}
                    onChange={(e) =>
                      setUploadFormData((prev) => ({ ...prev, resource_type: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={RESOURCE_TYPES.STUDY_MATERIAL}>Study Material (PDF, DOCX, Notes)</option>
                    <option value={RESOURCE_TYPES.PRESENTATION}>Presentation (PPT, PPTX, Slides)</option>
                    <option value={RESOURCE_TYPES.RECORDED_LECTURE}>Recorded Lecture (MP4, Video)</option>
                    <option value={RESOURCE_TYPES.OTHER}>Other (Images, Archives, Reference)</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Description <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the material or key topics covered..."
                    value={uploadFormData.description}
                    onChange={(e) =>
                      setUploadFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* File Upload Dropzone */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select File <span className="text-rose-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-emerald-400 bg-gray-50/50 transition">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="resourceFileInput"
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.webm,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="resourceFileInput"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-1"
                    >
                      <HardDrive className="h-8 w-8 text-gray-400" />
                      <span className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                        {selectedFile ? 'Change selected file' : 'Click to browse file'}
                      </span>
                      <p className="text-[11px] text-gray-400">
                        Supported: PDF, PPT, PPTX, DOC, DOCX, MP4, WEBM, JPG, PNG (Max 100MB)
                      </p>
                    </label>

                    {selectedFile && (
                      <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
                        <div className="flex items-center space-x-2 truncate">
                          <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          <span className="font-semibold truncate">{selectedFile.name}</span>
                          <span className="text-emerald-700 flex-shrink-0">
                            ({formatFileSize(selectedFile.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    disabled={uploading}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                  >
                    {uploading && (
                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    )}
                    {uploading ? 'Uploading File...' : 'Upload Resource'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingResource && (
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
                  <h3 className="text-base font-bold text-gray-900">Delete Learning Resource</h3>
                  <p className="text-xs text-gray-500">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-gray-900">&ldquo;{deletingResource.title}&rdquo;</strong>? The file will be removed from secure storage and trainees will no longer have access to it.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-5 mt-5 border-t border-gray-100">
                <button
                  onClick={() => setDeletingResource(null)}
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
