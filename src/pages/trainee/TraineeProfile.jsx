import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  GraduationCap,
  Briefcase,
  Award,
  FileCheck,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  X,
  Loader2,
  ArrowLeft,
  Search,
  UploadCloud,
  FileText,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getTraineeProfile,
  updateTraineeProfile,
  getQualifications,
  createQualification,
  updateQualification,
  deleteQualification,
  getWorkExperience,
  createWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
  getSkills,
  getUserSkills,
  addUserSkill,
  updateUserSkill,
  deleteUserSkill,
  uploadCertificate,
  getCertificates,
  createSignedCertificateUrl,
  deleteCertificate,
  calculateProfileCompleteness,
  PROFICIENCY_LEVELS,
} from '../../services/traineeProfileService'

export default function TraineeProfile() {
  const { user, refreshProfile } = useAuth()
  const userId = user?.id

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview')

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
  const [traineeData, setTraineeData] = useState({
    professional_summary: '',
    current_position: '',
    interests: '',
  })
  const [qualifications, setQualifications] = useState([])
  const [workExperience, setWorkExperience] = useState([])
  const [availableSkills, setAvailableSkills] = useState([])
  const [userSkills, setUserSkills] = useState([])
  const [certificates, setCertificates] = useState([])

  // Edit / Form states
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // Qualification Modal
  const [qualModalOpen, setQualModalOpen] = useState(false)
  const [editingQual, setEditingQual] = useState(null)
  const [qualForm, setQualForm] = useState({
    degree: '',
    institution: '',
    field_of_study: '',
    start_year: '',
    end_year: '',
    grade: '',
  })
  const [savingQual, setSavingQual] = useState(false)

  // Work Experience Modal
  const [expModalOpen, setExpModalOpen] = useState(false)
  const [editingExp, setEditingExp] = useState(null)
  const [expForm, setExpForm] = useState({
    organization: '',
    job_title: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
  })
  const [savingExp, setSavingExp] = useState(false)

  // Skills Modal
  const [skillModalOpen, setSkillModalOpen] = useState(false)
  const [skillSearch, setSkillSearch] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [selectedProficiency, setSelectedProficiency] = useState('intermediate')
  const [savingSkill, setSavingSkill] = useState(false)

  // Certificate Modal
  const [certModalOpen, setCertModalOpen] = useState(false)
  const [certForm, setCertForm] = useState({
    certificateName: '',
    issuingOrganization: '',
    issueDate: '',
    credentialId: '',
    file: null,
  })
  const [certFilePreview, setCertFilePreview] = useState(null)
  const [savingCert, setSavingCert] = useState(false)
  const [viewingCertId, setViewingCertId] = useState(null)

  // Deletion Confirmation Modal
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: null,
    loading: false,
  })

  // Show notification banner helper
  const showToast = useCallback((type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev))
    }, 4500)
  }, [])

  // Load all profile data
  const loadAllData = useCallback(async () => {
    if (!userId) return
    try {
      setInitialLoading(true)

      const [profRes, qualRes, expRes, skillsRes, userSkillsRes, certsRes] =
        await Promise.all([
          getTraineeProfile(userId),
          getQualifications(userId),
          getWorkExperience(userId),
          getSkills(),
          getUserSkills(userId),
          getCertificates(userId),
        ])

      if (profRes.success && profRes.data) {
        setProfileData({
          full_name: profRes.data.profile?.full_name || '',
          email: profRes.data.profile?.email || user?.email || '',
          phone: profRes.data.profile?.phone || '',
          department: profRes.data.profile?.department || '',
          designation: profRes.data.profile?.designation || '',
        })
        const rawInterests = profRes.data.traineeProfile?.interests
        const formattedInterests = Array.isArray(rawInterests)
          ? rawInterests.join(', ')
          : rawInterests || ''

        setTraineeData({
          professional_summary:
            profRes.data.traineeProfile?.professional_summary || '',
          current_position: profRes.data.traineeProfile?.current_position || '',
          interests: formattedInterests,
        })
      }

      if (qualRes.success) setQualifications(qualRes.data)
      if (expRes.success) setWorkExperience(expRes.data)
      if (skillsRes.success) setAvailableSkills(skillsRes.data)
      if (userSkillsRes.success) setUserSkills(userSkillsRes.data)
      if (certsRes.success) setCertificates(certsRes.data)
    } catch (err) {
      showToast('error', 'Failed to load profile details: ' + (err.message || ''))
    } finally {
      setInitialLoading(false)
    }
  }, [userId, user, showToast])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Completeness score
  const completeness = calculateProfileCompleteness({
    profile: profileData,
    traineeProfile: traineeData,
    qualifications,
    workExperience,
    userSkills,
    certificates,
  })

  // ==========================================
  // HANDLERS: PROFILE OVERVIEW
  // ==========================================
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await updateTraineeProfile(userId, {
        profileData: {
          full_name: profileData.full_name,
          phone: profileData.phone,
          department: profileData.department,
          designation: profileData.designation,
        },
        traineeData: {
          professional_summary: traineeData.professional_summary,
          current_position: traineeData.current_position,
          interests: traineeData.interests,
        },
      })

      if (!res.success) throw new Error(res.error)

      setIsEditingProfile(false)
      showToast('success', 'Professional information updated successfully!')
      if (refreshProfile) refreshProfile()
    } catch (err) {
      showToast('error', err.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  // ==========================================
  // HANDLERS: QUALIFICATIONS
  // ==========================================
  const openAddQualModal = () => {
    setEditingQual(null)
    setQualForm({
      degree: '',
      institution: '',
      field_of_study: '',
      start_year: '',
      end_year: '',
      grade: '',
    })
    setQualModalOpen(true)
  }

  const openEditQualModal = (q) => {
    setEditingQual(q)
    setQualForm({
      degree: q.degree || '',
      institution: q.institution || '',
      field_of_study: q.field_of_study || '',
      start_year: q.start_year || '',
      end_year: q.end_year || '',
      grade: q.grade || '',
    })
    setQualModalOpen(true)
  }

  const handleSaveQualification = async (e) => {
    e.preventDefault()
    if (!qualForm.degree.trim() || !qualForm.institution.trim()) {
      showToast('error', 'Degree and Institution are required.')
      return
    }

    setSavingQual(true)
    try {
      if (editingQual) {
        const res = await updateQualification(editingQual.id, userId, qualForm)
        if (!res.success) throw new Error(res.error)
        setQualifications((prev) =>
          prev.map((item) => (item.id === editingQual.id ? res.data : item)),
        )
        showToast('success', 'Qualification updated!')
      } else {
        const res = await createQualification(userId, qualForm)
        if (!res.success) throw new Error(res.error)
        setQualifications((prev) => [res.data, ...prev])
        showToast('success', 'Qualification added!')
      }
      setQualModalOpen(false)
    } catch (err) {
      showToast('error', err.message || 'Failed to save qualification')
    } finally {
      setSavingQual(false)
    }
  }

  const handleDeleteQualification = (id, degree) => {
    setDeleteDialog({
      open: true,
      title: 'Delete Qualification',
      message: `Are you sure you want to remove "${degree}" from your profile? This action cannot be undone.`,
      loading: false,
      onConfirm: async () => {
        setDeleteDialog((prev) => ({ ...prev, loading: true }))
        const res = await deleteQualification(id, userId)
        if (res.success) {
          setQualifications((prev) => prev.filter((item) => item.id !== id))
          showToast('success', 'Qualification removed.')
          setDeleteDialog({ open: false, title: '', message: '', onConfirm: null, loading: false })
        } else {
          showToast('error', res.error || 'Failed to delete qualification.')
          setDeleteDialog((prev) => ({ ...prev, loading: false }))
        }
      },
    })
  }

  // ==========================================
  // HANDLERS: WORK EXPERIENCE
  // ==========================================
  const openAddExpModal = () => {
    setEditingExp(null)
    setExpForm({
      organization: '',
      job_title: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
    })
    setExpModalOpen(true)
  }

  const openEditExpModal = (exp) => {
    setEditingExp(exp)
    setExpForm({
      organization: exp.organization || '',
      job_title: exp.job_title || '',
      start_date: exp.start_date || '',
      end_date: exp.end_date || '',
      is_current: Boolean(exp.is_current),
      description: exp.description || '',
    })
    setExpModalOpen(true)
  }

  const handleSaveExperience = async (e) => {
    e.preventDefault()
    if (!expForm.organization.trim() || !expForm.job_title.trim() || !expForm.start_date) {
      showToast('error', 'Organization, Job Title, and Start Date are required.')
      return
    }

    setSavingExp(true)
    try {
      if (editingExp) {
        const res = await updateWorkExperience(editingExp.id, userId, expForm)
        if (!res.success) throw new Error(res.error)
        setWorkExperience((prev) =>
          prev.map((item) => (item.id === editingExp.id ? res.data : item)),
        )
        showToast('success', 'Work experience updated!')
      } else {
        const res = await createWorkExperience(userId, expForm)
        if (!res.success) throw new Error(res.error)
        setWorkExperience((prev) => [res.data, ...prev])
        showToast('success', 'Work experience added!')
      }
      setExpModalOpen(false)
    } catch (err) {
      showToast('error', err.message || 'Failed to save experience')
    } finally {
      setSavingExp(false)
    }
  }

  const handleDeleteExperience = (id, roleTitle) => {
    setDeleteDialog({
      open: true,
      title: 'Delete Experience',
      message: `Are you sure you want to delete "${roleTitle}"?`,
      loading: false,
      onConfirm: async () => {
        setDeleteDialog((prev) => ({ ...prev, loading: true }))
        const res = await deleteWorkExperience(id, userId)
        if (res.success) {
          setWorkExperience((prev) => prev.filter((item) => item.id !== id))
          showToast('success', 'Work experience removed.')
          setDeleteDialog({ open: false, title: '', message: '', onConfirm: null, loading: false })
        } else {
          showToast('error', res.error || 'Failed to delete experience.')
          setDeleteDialog((prev) => ({ ...prev, loading: false }))
        }
      },
    })
  }

  // ==========================================
  // HANDLERS: SKILLS
  // ==========================================
  const openAddSkillModal = () => {
    setSkillSearch('')
    setSelectedSkillId('')
    setSelectedProficiency('intermediate')
    setSkillModalOpen(true)
  }

  const handleAddSkillSubmit = async (e) => {
    e.preventDefault()

    if (!selectedSkillId) {
      showToast('error', 'Please select a skill from the IMD skills catalog.')
      return
    }

    // Check if trainee already has this skill
    if (userSkills.some((us) => us.skill_id === selectedSkillId)) {
      showToast('error', 'This skill has already been added to your profile.')
      return
    }

    setSavingSkill(true)
    try {
      console.log('[handleAddSkillSubmit] Adding skill to user_skills:', {
        userId,
        skillId: selectedSkillId,
        proficiency: selectedProficiency,
      })

      const res = await addUserSkill(userId, selectedSkillId, selectedProficiency)
      if (!res.success) {
        throw new Error(res.error || 'Failed to add skill to your profile.')
      }

      setUserSkills((prev) => [...prev, res.data])
      showToast('success', 'Skill added to your profile!')
      setSkillModalOpen(false)
    } catch (err) {
      console.error('[handleAddSkillSubmit] Error:', err)
      showToast('error', err.message || 'Failed to add skill to your profile.')
    } finally {
      setSavingSkill(false)
    }
  }

  const handleUpdateSkillProficiency = async (skillId, newProficiency) => {
    try {
      console.log('[handleUpdateSkillProficiency] Updating proficiency for skillId:', skillId, 'to:', newProficiency)
      const res = await updateUserSkill(userId, skillId, newProficiency)
      if (!res.success) {
        throw new Error(res.error || 'Failed to update proficiency.')
      }
      setUserSkills((prev) =>
        prev.map((item) =>
          item.skill_id === skillId ? { ...item, proficiency: newProficiency } : item,
        ),
      )
      showToast('success', 'Proficiency level updated.')
    } catch (err) {
      console.error('[handleUpdateSkillProficiency] Error:', err)
      showToast('error', err.message || 'Failed to update proficiency.')
    }
  }

  const handleDeleteSkill = (skillId, skillName) => {
    setDeleteDialog({
      open: true,
      title: 'Remove Skill',
      message: `Are you sure you want to remove "${skillName}" from your profile? This will not remove the skill from the shared IMD catalog.`,
      loading: false,
      onConfirm: async () => {
        setDeleteDialog((prev) => ({ ...prev, loading: true }))
        console.log('[handleDeleteSkill] Removing from user_skills:', { userId, skillId })
        const res = await deleteUserSkill(userId, skillId)
        if (res.success) {
          setUserSkills((prev) => prev.filter((item) => item.skill_id !== skillId))
          showToast('success', 'Skill removed from profile.')
          setDeleteDialog({ open: false, title: '', message: '', onConfirm: null, loading: false })
        } else {
          showToast('error', res.error || 'Failed to remove skill.')
          setDeleteDialog((prev) => ({ ...prev, loading: false }))
        }
      },
    })
  }

  // ==========================================
  // HANDLERS: CERTIFICATES & STORAGE
  // ==========================================
  const openAddCertModal = () => {
    setCertForm({
      certificateName: '',
      issuingOrganization: '',
      issueDate: '',
      credentialId: '',
      file: null,
    })
    setCertFilePreview(null)
    setCertModalOpen(true)
  }

  const handleCertFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'File size exceeds 10MB limit.')
      return
    }

    setCertForm((prev) => ({ ...prev, file }))
    setCertFilePreview({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: file.type,
    })
  }

  const handleUploadCertificate = async (e) => {
    e.preventDefault()
    if (!certForm.certificateName.trim()) {
      showToast('error', 'Certificate name is required.')
      return
    }
    if (!certForm.issuingOrganization.trim()) {
      showToast('error', 'Issuing organization is required.')
      return
    }
    if (!certForm.issueDate) {
      showToast('error', 'Issue date is required.')
      return
    }
    if (!certForm.file) {
      showToast('error', 'Please select a certificate file (PDF or image).')
      return
    }

    setSavingCert(true)
    try {
      const res = await uploadCertificate(userId, {
        file: certForm.file,
        certificateName: certForm.certificateName,
        issuingOrganization: certForm.issuingOrganization,
        issueDate: certForm.issueDate,
        credentialId: certForm.credentialId,
      })

      if (!res.success) throw new Error(res.error)

      setCertificates((prev) => [res.data, ...prev])
      showToast('success', 'Certificate uploaded and verified!')
      setCertModalOpen(false)
    } catch (err) {
      showToast('error', err.message || 'Failed to upload certificate')
    } finally {
      setSavingCert(false)
    }
  }

  const handleViewCertificate = async (cert) => {
    try {
      setViewingCertId(cert.id)
      const res = await createSignedCertificateUrl(cert.storage_path, 300)
      if (!res.success || !res.signedUrl) {
        throw new Error(res.error || 'Unable to generate access URL')
      }
      // Open in a new tab
      window.open(res.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      showToast('error', err.message || 'Failed to view certificate')
    } finally {
      setViewingCertId(null)
    }
  }

  const handleDeleteCertificate = (cert) => {
    setDeleteDialog({
      open: true,
      title: 'Delete Certificate',
      message: `Are you sure you want to permanently delete "${cert.certificate_name}" and its associated storage file?`,
      loading: false,
      onConfirm: async () => {
        setDeleteDialog((prev) => ({ ...prev, loading: true }))
        const res = await deleteCertificate(cert.id, userId, cert.storage_path)
        if (res.success) {
          setCertificates((prev) => prev.filter((item) => item.id !== cert.id))
          showToast('success', 'Certificate and file permanently deleted.')
          setDeleteDialog({ open: false, title: '', message: '', onConfirm: null, loading: false })
        } else {
          showToast('error', res.error || 'Failed to delete certificate.')
          setDeleteDialog((prev) => ({ ...prev, loading: false }))
        }
      },
    })
  }

  // Filter skills for modal search
  const filteredCatalogSkills = availableSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
      !userSkills.some((us) => us.skill_id === s.id),
  )

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

  if (initialLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Loading professional profile...</p>
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

      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/trainee/dashboard"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 transition shadow-sm"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Trainee Professional Profile
            </h1>
            <p className="text-xs text-gray-500">
              Manage your organizational identity, academic credentials, experience, skills, and certifications.
            </p>
          </div>
        </div>

        {/* Profile Completeness Pill */}
        <div className="flex items-center space-x-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col">
            <div className="flex items-center justify-between space-x-4 mb-1">
              <span className="text-xs font-semibold text-gray-700 flex items-center">
                <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                Profile Strength
              </span>
              <span className="text-xs font-bold text-blue-600">{completeness}%</span>
            </div>
            <div className="w-40 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completeness >= 80
                    ? 'bg-emerald-500'
                    : completeness >= 50
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-2xl font-black text-white shadow-inner">
              {getInitials(profileData.full_name)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold">{profileData.full_name || 'Anonymous Trainee'}</h2>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                  Trainee
                </span>
              </div>
              <p className="text-sm text-indigo-100 font-medium">
                {profileData.designation || traineeData.current_position || 'No designation specified'}
                {profileData.department ? ` • ${profileData.department}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-indigo-200">
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
              onClick={() => {
                setActiveTab('overview')
                setIsEditingProfile(true)
              }}
              className="inline-flex items-center rounded-xl bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md border border-white/20 hover:bg-white/25 transition shadow-sm"
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Edit Profile Info
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-xl px-4 py-2 shadow-sm flex items-center space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'overview'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <User className="mr-2 h-4 w-4" />
          Overview & Info
        </button>
        <button
          onClick={() => setActiveTab('qualifications')}
          className={`inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'qualifications'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <GraduationCap className="mr-2 h-4 w-4" />
          Qualifications ({qualifications.length})
        </button>
        <button
          onClick={() => setActiveTab('experience')}
          className={`inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'experience'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Briefcase className="mr-2 h-4 w-4" />
          Work Experience ({workExperience.length})
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'skills'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Award className="mr-2 h-4 w-4" />
          Skills ({userSkills.length})
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === 'certificates'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <FileCheck className="mr-2 h-4 w-4" />
          Certificates ({certificates.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & PROFESSIONAL INFO */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* View Mode vs Edit Mode */}
          {!isEditingProfile ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Summary & Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Professional Summary */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center">
                      <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                      Professional Summary
                    </h3>
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                  {traineeData.professional_summary ? (
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                      {traineeData.professional_summary}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No professional summary provided. Click "Edit Profile Info" above to introduce your background and training aspirations.
                    </p>
                  )}
                </div>

                {/* Professional Interests */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center border-b border-gray-100 pb-3">
                    <Sparkles className="h-4 w-4 mr-2 text-indigo-600" />
                    Specialized Interests & Focus Areas
                  </h3>
                  {(() => {
                    const list = Array.isArray(traineeData.interests)
                      ? traineeData.interests
                      : typeof traineeData.interests === 'string'
                      ? traineeData.interests.split(',').map((i) => i.trim()).filter(Boolean)
                      : []
                    return list.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {list.map((interest, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-100"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        No specialized interests listed yet.
                      </p>
                    )
                  })()}
                </div>
              </div>

              {/* Right Column: Key Details */}
              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                    Organizational Details
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
                      <span className="text-gray-500 font-medium">Designation / Role Title</span>
                      <p className="font-semibold text-gray-900 mt-0.5">
                        {profileData.designation || traineeData.current_position || 'Not assigned'}
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
          ) : (
            /* Edit Mode Form */
            <form
              onSubmit={handleSaveProfile}
              className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Edit Professional Profile Information
                  </h3>
                  <p className="text-xs text-gray-500">
                    Update your organizational details and trainee profile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
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
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Johnathan Doe"
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
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. +1 555-0199"
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
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Technology & Engineering"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Designation / Role Title
                  </label>
                  <input
                    type="text"
                    value={profileData.designation}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, designation: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Associate Software Engineer"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Current Position
                  </label>
                  <input
                    type="text"
                    value={traineeData.current_position}
                    onChange={(e) =>
                      setTraineeData((prev) => ({ ...prev, current_position: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Trainee Level 2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">
                    Professional Summary
                  </label>
                  <textarea
                    rows={4}
                    value={traineeData.professional_summary}
                    onChange={(e) =>
                      setTraineeData((prev) => ({
                        ...prev,
                        professional_summary: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 p-3 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="Write a brief overview of your professional background, strengths, and goals..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">
                    Specialized Interests (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={traineeData.interests}
                    onChange={(e) =>
                      setTraineeData((prev) => ({ ...prev, interests: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Cloud Computing, Artificial Intelligence, Data Engineering"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingProfile && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Save Profile
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUALIFICATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'qualifications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Academic Qualifications & Degrees
              </h3>
              <p className="text-xs text-gray-500">
                List your university degrees, diplomas, and certifications.
              </p>
            </div>
            <button
              onClick={openAddQualModal}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Qualification
            </button>
          </div>

          {qualifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
              <h4 className="mt-2 text-sm font-semibold text-gray-900">
                No qualifications listed
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                Add your educational background to complete your professional profile.
              </p>
              <button
                onClick={openAddQualModal}
                className="mt-4 inline-flex items-center rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Qualification
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qualifications.map((q) => (
                <div
                  key={q.id}
                  className="group relative rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{q.degree}</h4>
                        <p className="text-xs font-medium text-gray-600">{q.institution}</p>
                        {q.field_of_study && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Major: {q.field_of_study}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditQualModal(q)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQualification(q.id, q.degree)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-2 text-[11px] text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {q.start_year || 'N/A'} – {q.end_year || 'Present'}
                    </span>
                    {q.grade && (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                        Grade: {q.grade}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WORK EXPERIENCE */}
      {/* ========================================================================= */}
      {activeTab === 'experience' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Work Experience & Employment History
              </h3>
              <p className="text-xs text-gray-500">
                Document past and current organizational roles and internships.
              </p>
            </div>
            <button
              onClick={openAddExpModal}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Experience
            </button>
          </div>

          {workExperience.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
              <h4 className="mt-2 text-sm font-semibold text-gray-900">
                No work experience recorded
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                Add previous jobs, internships, or internal assignments.
              </p>
              <button
                onClick={openAddExpModal}
                className="mt-4 inline-flex items-center rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Experience
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {workExperience.map((exp) => (
                <div
                  key={exp.id}
                  className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:border-blue-200 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-gray-900">{exp.job_title}</h4>
                          {exp.is_current && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              Current Role
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-600">{exp.organization}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {exp.start_date} – {exp.is_current ? 'Present' : exp.end_date || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditExpModal(exp)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExperience(exp.id, exp.job_title)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {exp.description && (
                    <p className="text-xs text-gray-600 border-t border-gray-50 pt-2 whitespace-pre-line leading-relaxed">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SKILLS */}
      {/* ========================================================================= */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Skills & Technical Competencies
              </h3>
              <p className="text-xs text-gray-500">
                Highlight your capabilities and proficiency levels.
              </p>
            </div>
            <button
              onClick={openAddSkillModal}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Skill
            </button>
          </div>

          {userSkills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <Award className="mx-auto h-12 w-12 text-gray-300" />
              <h4 className="mt-2 text-sm font-semibold text-gray-900">
                No skills added yet
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                Search and add skills to demonstrate your capabilities.
              </p>
              <button
                onClick={openAddSkillModal}
                className="mt-4 inline-flex items-center rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Skill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userSkills.map((us) => {
                const skillName = us.skills?.name || 'Skill'
                const currentLevel =
                  PROFICIENCY_LEVELS.find((p) => p.value === us.proficiency) ||
                  PROFICIENCY_LEVELS[1]

                return (
                  <div
                    key={us.skill_id}
                    className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-blue-200 transition space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{skillName}</h4>
                        <span
                          className={`mt-1 inline-block rounded-lg border px-2 py-0.5 text-[10px] font-bold capitalize ${currentLevel.color}`}
                        >
                          {us.proficiency}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSkill(us.skill_id, skillName)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Remove Skill"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="border-t border-gray-50 pt-2">
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                        Proficiency Level
                      </label>
                      <select
                        value={us.proficiency}
                        onChange={(e) =>
                          handleUpdateSkillProficiency(us.skill_id, e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        {PROFICIENCY_LEVELS.map((lvl) => (
                          <option key={lvl.value} value={lvl.value}>
                            {lvl.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CERTIFICATES & STORAGE */}
      {/* ========================================================================= */}
      {activeTab === 'certificates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Verified Certificates & Credentials
              </h3>
              <p className="text-xs text-gray-500">
                Securely upload and view your course certifications, awards, and licenses.
              </p>
            </div>
            <button
              onClick={openAddCertModal}
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Upload Certificate
            </button>
          </div>

          {certificates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <FileCheck className="mx-auto h-12 w-12 text-gray-300" />
              <h4 className="mt-2 text-sm font-semibold text-gray-900">
                No certificates uploaded
              </h4>
              <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                Upload your credential documents (PDF, JPG, PNG). Files are kept private in your personal encrypted folder.
              </p>
              <button
                onClick={openAddCertModal}
                className="mt-4 inline-flex items-center rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
              >
                <UploadCloud className="mr-1 h-3.5 w-3.5" />
                Upload Certificate
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:border-blue-200 transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <button
                        onClick={() => handleDeleteCertificate(cert)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete Certificate"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                        {cert.certificate_name}
                      </h4>
                      <p className="text-xs font-medium text-gray-600">
                        {cert.issuing_organization}
                      </p>
                    </div>

                    <div className="space-y-1 text-[11px] text-gray-500 pt-1">
                      <p className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        Issued: {cert.issue_date}
                      </p>
                      {cert.credential_id && (
                        <p className="font-mono text-gray-600 truncate">
                          ID: {cert.credential_id}
                        </p>
                      )}
                      {cert.file_size && (
                        <p className="text-gray-400 text-[10px]">
                          {(cert.file_size / (1024 * 1024)).toFixed(2)} MB • {cert.file_type?.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-50 pt-3">
                    <button
                      onClick={() => handleViewCertificate(cert)}
                      disabled={viewingCertId === cert.id}
                      className="w-full inline-flex items-center justify-center rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                    >
                      {viewingCertId === cert.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-blue-600" />
                      ) : (
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      View / Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT QUALIFICATION */}
      {/* ========================================================================= */}
      {qualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingQual ? 'Edit Academic Qualification' : 'Add Academic Qualification'}
              </h3>
              <button
                onClick={() => setQualModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQualification} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Degree / Certificate *
                </label>
                <input
                  type="text"
                  required
                  value={qualForm.degree}
                  onChange={(e) =>
                    setQualForm((prev) => ({ ...prev, degree: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Bachelor of Science"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Institution / University *
                </label>
                <input
                  type="text"
                  required
                  value={qualForm.institution}
                  onChange={(e) =>
                    setQualForm((prev) => ({ ...prev, institution: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. National Institute of Technology"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Field of Study / Major
                </label>
                <input
                  type="text"
                  value={qualForm.field_of_study}
                  onChange={(e) =>
                    setQualForm((prev) => ({ ...prev, field_of_study: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Computer Science & Engineering"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Start Year
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2099"
                    value={qualForm.start_year}
                    onChange={(e) =>
                      setQualForm((prev) => ({ ...prev, start_year: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 2018"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    End Year (or Expected)
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2099"
                    value={qualForm.end_year}
                    onChange={(e) =>
                      setQualForm((prev) => ({ ...prev, end_year: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 2022"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Grade / GPA / Honors
                </label>
                <input
                  type="text"
                  value={qualForm.grade}
                  onChange={(e) =>
                    setQualForm((prev) => ({ ...prev, grade: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. First Class with Distinction (3.8 / 4.0)"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setQualModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQual}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingQual && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingQual ? 'Update' : 'Add'} Qualification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT WORK EXPERIENCE */}
      {/* ========================================================================= */}
      {expModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingExp ? 'Edit Work Experience' : 'Add Work Experience'}
              </h3>
              <button
                onClick={() => setExpModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExperience} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Organization / Company *
                </label>
                <input
                  type="text"
                  required
                  value={expForm.organization}
                  onChange={(e) =>
                    setExpForm((prev) => ({ ...prev, organization: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Apex Global Solutions"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={expForm.job_title}
                  onChange={(e) =>
                    setExpForm((prev) => ({ ...prev, job_title: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Junior Backend Developer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expForm.start_date}
                    onChange={(e) =>
                      setExpForm((prev) => ({ ...prev, start_date: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    disabled={expForm.is_current}
                    value={expForm.is_current ? '' : expForm.end_date}
                    onChange={(e) =>
                      setExpForm((prev) => ({ ...prev, end_date: e.target.value }))
                    }
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${
                      expForm.is_current
                        ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="is_current"
                  checked={expForm.is_current}
                  onChange={(e) =>
                    setExpForm((prev) => ({
                      ...prev,
                      is_current: e.target.checked,
                      end_date: e.target.checked ? '' : prev.end_date,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_current" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  I currently work in this role
                </label>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Role Description & Key Accomplishments
                </label>
                <textarea
                  rows={3}
                  value={expForm.description}
                  onChange={(e) =>
                    setExpForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 p-3 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Describe your responsibilities, technologies used, and outcomes..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setExpModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExp}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingExp && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {editingExp ? 'Update' : 'Add'} Experience
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD SKILL (IMD SKILLS CATALOG SELECTION) */}
      {/* ========================================================================= */}
      {skillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Skill</h3>
                <p className="text-[11px] text-gray-500">
                  Select a skill from the IMD organization catalog and set your proficiency level.
                </p>
              </div>
              <button
                onClick={() => setSkillModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSkillSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Skill <span className="text-rose-500">*</span>
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search IMD skills..."
                    className="w-full rounded-xl border border-gray-200 pl-8 pr-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-1.5 space-y-1">
                  {filteredCatalogSkills.length === 0 ? (
                    <p className="p-4 text-center text-gray-400 text-[11px]">
                      {skillSearch.trim()
                        ? `No matching skills found for "${skillSearch}".`
                        : 'All catalog skills have been added to your profile.'}
                    </p>
                  ) : (
                    filteredCatalogSkills.map((s) => {
                      const isSelected = selectedSkillId === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSkillId(s.id)}
                          className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'hover:bg-gray-200/70 text-gray-700'
                          }`}
                        >
                          <span>{s.name}</span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>

                {selectedSkillId && (
                  <div className="mt-2 flex items-center rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 border border-blue-100">
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                    <span>
                      Selected:{' '}
                      {availableSkills.find((s) => s.id === selectedSkillId)?.name || 'Selected'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Proficiency Level <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROFICIENCY_LEVELS.map((lvl) => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setSelectedProficiency(lvl.value)}
                      className={`rounded-xl border p-2.5 text-center text-xs font-semibold capitalize transition ${
                        selectedProficiency === lvl.value
                          ? `${lvl.color} ring-2 ring-blue-500 shadow-xs`
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setSkillModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSkill || !selectedSkillId}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingSkill && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Add Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPLOAD CERTIFICATE */}
      {/* ========================================================================= */}
      {certModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                Upload Certificate & Credential
              </h3>
              <button
                onClick={() => setCertModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadCertificate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Certificate Name *
                </label>
                <input
                  type="text"
                  required
                  value={certForm.certificateName}
                  onChange={(e) =>
                    setCertForm((prev) => ({ ...prev, certificateName: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. AWS Certified Solutions Architect"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Issuing Organization *
                </label>
                <input
                  type="text"
                  required
                  value={certForm.issuingOrganization}
                  onChange={(e) =>
                    setCertForm((prev) => ({
                      ...prev,
                      issuingOrganization: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Amazon Web Services / Coursera"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={certForm.issueDate}
                    onChange={(e) =>
                      setCertForm((prev) => ({ ...prev, issueDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Credential ID / Number
                  </label>
                  <input
                    type="text"
                    value={certForm.credentialId}
                    onChange={(e) =>
                      setCertForm((prev) => ({ ...prev, credentialId: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="e.g. AWS-PSA-108239"
                  />
                </div>
              </div>

              {/* File Upload Zone */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Certificate File (PDF or Image, max 10MB) *
                </label>
                <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 hover:border-blue-500 hover:bg-blue-50/20 transition">
                  <UploadCloud className="h-8 w-8 text-gray-400" />
                  <span className="mt-2 text-xs font-semibold text-gray-700">
                    Click to select certificate file
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    Supports PDF, PNG, JPG, JPEG
                  </span>
                  <input
                    type="file"
                    required
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={handleCertFileChange}
                    className="hidden"
                  />
                </label>

                {certFilePreview && (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200">
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="font-semibold truncate">{certFilePreview.name}</span>
                      <span className="text-[10px] text-blue-700">({certFilePreview.size})</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setCertModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCert || !certForm.file}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingCert && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Upload & Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {deleteDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="rounded-xl bg-rose-100 p-2">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{deleteDialog.title}</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {deleteDialog.message}
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={deleteDialog.loading}
                onClick={() =>
                  setDeleteDialog({ open: false, title: '', message: '', onConfirm: null, loading: false })
                }
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteDialog.loading}
                onClick={deleteDialog.onConfirm}
                className="inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {deleteDialog.loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
