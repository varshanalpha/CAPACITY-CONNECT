import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  LogOut,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  UserCheck,
  UserX,
  Calendar,
  Building,
  Briefcase,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Shield,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  getUsers,
  updateUserStatus,
  updateUserRole,
  calculateUserMetrics,
  USER_STATUSES,
  USER_ROLES,
} from '../../services/adminService'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user: currentAdmin, profile: adminProfile, logout } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  // Notification state
  const [notification, setNotification] = useState(null)

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '', // 'approve', 'reject', 'suspend', 'role_change', 'reinstate'
    targetUser: null,
    targetValue: null,
    title: '',
    description: '',
  })

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification(null)
    }, 4500)
  }

  const loadUsers = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const result = await getUsers({
        search: searchTerm,
        status: statusFilter,
        role: roleFilter,
      })

      if (result.success) {
        setUsers(result.data)
      } else {
        showNotification('error', result.error || 'Failed to load user profiles from database.')
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Error fetching users.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [searchTerm, statusFilter, roleFilter])

  useEffect(() => {
    let ignore = false
    async function fetchData() {
      setLoading(true)
      const result = await getUsers({
        search: searchTerm,
        status: statusFilter,
        role: roleFilter,
      })
      if (!ignore) {
        if (result.success) {
          setUsers(result.data)
        } else {
          showNotification('error', result.error || 'Failed to load user profiles from database.')
        }
        setLoading(false)
      }
    }
    fetchData()
    return () => {
      ignore = true
    }
  }, [searchTerm, statusFilter, roleFilter])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Open confirmation modal for sensitive operations
  const promptAction = (type, targetUser, targetValue = null) => {
    // Admin Self-Protection Check in UI
    if (targetUser.id === currentAdmin?.id) {
      if (type === 'suspend' || type === 'reject' || (type === 'role_change' && targetValue !== USER_ROLES.ADMIN)) {
        showNotification(
          'error',
          'Self-Protection Rule: You cannot modify your own administrative access or approval status.',
        )
        return
      }
    }

    let title = ''
    let description = ''

    if (type === 'approve') {
      title = `Approve ${targetUser.full_name || targetUser.email}?`
      description = `This will grant the user access to the platform as an approved ${targetUser.role || 'user'}.`
    } else if (type === 'reject') {
      title = `Reject Registration for ${targetUser.full_name || targetUser.email}?`
      description = `The user will be denied access to the platform and marked as rejected.`
    } else if (type === 'suspend') {
      title = `Suspend Account: ${targetUser.full_name || targetUser.email}?`
      description = `This will immediately revoke all access for this user until an administrator re-activates it.`
    } else if (type === 'reinstate') {
      title = `Re-Approve Account: ${targetUser.full_name || targetUser.email}?`
      description = `This will restore approved status and re-enable platform access.`
    } else if (type === 'role_change') {
      title = `Change Role to ${targetValue.toUpperCase()}?`
      description = `Are you sure you want to change ${targetUser.full_name || targetUser.email}'s role from ${targetUser.role} to ${targetValue}?`
    }

    setConfirmModal({
      isOpen: true,
      type,
      targetUser,
      targetValue,
      title,
      description,
    })
  }

  const handleConfirmAction = async () => {
    const { type, targetUser, targetValue } = confirmModal
    if (!targetUser) return

    setActionLoading(true)

    try {
      if (type === 'approve' || type === 'reinstate') {
        const res = await updateUserStatus(targetUser.id, USER_STATUSES.APPROVED, currentAdmin?.id)
        if (res.success) {
          showNotification('success', `Successfully approved ${targetUser.full_name || targetUser.email}`)
          await loadUsers(true)
        } else {
          showNotification('error', res.error || 'Failed to approve user.')
        }
      } else if (type === 'reject') {
        const res = await updateUserStatus(targetUser.id, USER_STATUSES.REJECTED, currentAdmin?.id)
        if (res.success) {
          showNotification('success', `Rejected registration for ${targetUser.full_name || targetUser.email}`)
          await loadUsers(true)
        } else {
          showNotification('error', res.error || 'Failed to reject user.')
        }
      } else if (type === 'suspend') {
        const res = await updateUserStatus(targetUser.id, USER_STATUSES.SUSPENDED, currentAdmin?.id)
        if (res.success) {
          showNotification('success', `Suspended account for ${targetUser.full_name || targetUser.email}`)
          await loadUsers(true)
        } else {
          showNotification('error', res.error || 'Failed to suspend user.')
        }
      } else if (type === 'role_change') {
        const res = await updateUserRole(targetUser.id, targetValue, currentAdmin?.id)
        if (res.success) {
          showNotification(
            'success',
            `Changed role for ${targetUser.full_name || targetUser.email} to ${targetValue.toUpperCase()}`,
          )
          await loadUsers(true)
        } else {
          showNotification('error', res.error || 'Failed to update user role.')
        }
      }
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setActionLoading(false)
      setConfirmModal({ isOpen: false, type: '', targetUser: null, targetValue: null, title: '', description: '' })
    }
  }

  const metrics = calculateUserMetrics(users)

  const getRoleBadge = (role) => {
    switch ((role || '').toLowerCase()) {
      case 'admin':
        return (
          <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
            <Shield className="mr-1 h-3 w-3" />
            Admin
          </span>
        )
      case 'trainer':
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <BookOpen className="mr-1 h-3 w-3" />
            Trainer
          </span>
        )
      case 'trainee':
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
            <GraduationCap className="mr-1 h-3 w-3" />
            Trainee
          </span>
        )
    }
  }

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
            Approved
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
            <Clock className="mr-1 h-3 w-3 text-amber-600" />
            Pending
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <XCircle className="mr-1 h-3 w-3 text-rose-600" />
            Rejected
          </span>
        )
      case 'suspended':
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-500/20">
            <Ban className="mr-1 h-3 w-3 text-gray-500" />
            Suspended
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
            {status || 'Unknown'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="rounded-xl bg-slate-900 p-3 text-white shadow-sm">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active Session
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Logged in as <strong>{adminProfile?.full_name || currentAdmin?.email}</strong> (System Administrator)
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => loadUsers(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-60"
            title="Refresh User Data"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign Out
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
                className="text-gray-400 hover:text-gray-600 text-xs font-semibold px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Profiles
            </span>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{metrics.total}</p>
          <div className="mt-2 flex space-x-2 text-xs text-gray-500">
            <span>{metrics.trainees} Trainees</span>
            <span>•</span>
            <span>{metrics.trainers} Trainers</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className="cursor-pointer rounded-xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm transition hover:bg-amber-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Pending Approval
            </span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">{metrics.pending}</p>
          <span className="mt-2 inline-block text-xs font-medium text-amber-700">
            {metrics.pending > 0 ? 'Requires Admin review' : 'All users reviewed'}
          </span>
        </div>

        <div
          onClick={() => setStatusFilter('approved')}
          className="cursor-pointer rounded-xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm transition hover:bg-emerald-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Active / Approved
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{metrics.approved}</p>
          <span className="mt-2 inline-block text-xs font-medium text-emerald-700">
            Full platform access
          </span>
        </div>

        <div
          onClick={() => setStatusFilter('suspended')}
          className="cursor-pointer rounded-xl border border-rose-100 bg-rose-50/40 p-5 shadow-sm transition hover:bg-rose-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Suspended / Rejected
            </span>
            <Ban className="h-5 w-5 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-900">
            {metrics.suspended + metrics.rejected}
          </p>
          <span className="mt-2 inline-block text-xs font-medium text-rose-700">
            {metrics.suspended} Suspended, {metrics.rejected} Rejected
          </span>
        </div>
      </div>

      {/* User Management Container */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Table Header & Search Controls */}
        <div className="border-b border-gray-200 p-5 sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Platform User Management</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Review registrations, approve new members, assign roles, and manage permissions from real database records.
            </p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-500">
              Showing {users.length} {users.length === 1 ? 'user' : 'users'}
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="border-b border-gray-100 bg-gray-50/60 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, department..."
                className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition"
              />
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 capitalize"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Role Filter */}
            <div className="sm:col-span-3">
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-xs font-medium text-gray-700 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 capitalize"
                >
                  <option value="all">All Roles</option>
                  <option value="trainee">Trainees</option>
                  <option value="trainer">Trainers</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50/80 font-semibold text-gray-700">
              <tr>
                <th scope="col" className="py-3.5 pl-5 pr-3">
                  User Details
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Role
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Organization Details
                </th>
                <th scope="col" className="px-3 py-3.5">
                  Joined Date
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-5 text-right">
                  Admin Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                    <span>Loading users from database...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <Filter className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <h4 className="font-semibold text-gray-800">No users found</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      No records match the current filters. Try changing or clearing your search term and filters.
                    </p>
                    {(searchTerm || statusFilter !== 'all' || roleFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchTerm('')
                          setStatusFilter('all')
                          setRoleFilter('all')
                        }}
                        className="mt-3 inline-flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentAdmin?.id
                  const isPending = (u.status || '').toLowerCase() === 'pending'
                  const isApproved = (u.status || '').toLowerCase() === 'approved'
                  const isSuspended = (u.status || '').toLowerCase() === 'suspended'
                  const isRejected = (u.status || '').toLowerCase() === 'rejected'

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors hover:bg-gray-50/70 ${
                        isSelf ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {/* User Column */}
                      <td className="py-4 pl-5 pr-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-700 text-xs uppercase">
                            {(u.full_name || u.email || '?').charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-gray-900">
                                {u.full_name || 'Unnamed User'}
                              </span>
                              {isSelf && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800" title="Your currently logged-in account">
                                  You (Self-Protected)
                                </span>
                              )}
                            </div>
                            <span className="block text-gray-500">{u.email || 'No email registered'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Status Column */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        {getStatusBadge(u.status)}
                      </td>

                      {/* Department / Designation */}
                      <td className="px-3 py-4 whitespace-nowrap text-gray-600">
                        <div>
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3 text-gray-400" />
                            <span>{u.department || '—'}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-[11px] text-gray-400 mt-0.5">
                            <Briefcase className="h-3 w-3 text-gray-400" />
                            <span>{u.designation || '—'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="px-3 py-4 whitespace-nowrap text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 pl-3 pr-5 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-[11px] font-medium text-gray-400 italic">
                            Protected Admin
                          </span>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5">
                            {/* PENDING ACTIONS */}
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => promptAction('approve', u)}
                                  className="inline-flex items-center rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                                  title="Approve User Registration"
                                >
                                  <UserCheck className="mr-1 h-3.5 w-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => promptAction('reject', u)}
                                  className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                                  title="Reject User Registration"
                                >
                                  <UserX className="mr-1 h-3.5 w-3.5" />
                                  Reject
                                </button>
                              </>
                            )}

                            {/* APPROVED ACTIONS */}
                            {isApproved && (
                              <>
                                {/* Role Switch: Trainee <-> Trainer */}
                                {u.role === 'trainee' && (
                                  <button
                                    type="button"
                                    onClick={() => promptAction('role_change', u, 'trainer')}
                                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
                                    title="Promote Trainee to Trainer"
                                  >
                                    <ArrowUpDown className="mr-1 h-3 w-3 text-emerald-600" />
                                    To Trainer
                                  </button>
                                )}

                                {u.role === 'trainer' && (
                                  <button
                                    type="button"
                                    onClick={() => promptAction('role_change', u, 'trainee')}
                                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition"
                                    title="Change Trainer to Trainee"
                                  >
                                    <ArrowUpDown className="mr-1 h-3 w-3 text-indigo-600" />
                                    To Trainee
                                  </button>
                                )}

                                {/* Suspend User */}
                                <button
                                  type="button"
                                  onClick={() => promptAction('suspend', u)}
                                  className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 transition"
                                  title="Suspend User Access"
                                >
                                  <Ban className="mr-1 h-3 w-3 text-amber-700" />
                                  Suspend
                                </button>
                              </>
                            )}

                            {/* REJECTED OR SUSPENDED ACTIONS */}
                            {(isSuspended || isRejected) && (
                              <button
                                type="button"
                                onClick={() => promptAction('reinstate', u)}
                                className="inline-flex items-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                                title="Restore and Approve User"
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Re-Approve
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-900/10"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900">{confirmModal.title}</h3>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed mb-6">
                {confirmModal.description}
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: false, type: '', targetUser: null, targetValue: null, title: '', description: '' })}
                  disabled={actionLoading}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={actionLoading}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    'Confirm Action'
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
