import { supabase } from '../lib/supabaseClient'

/**
 * Valid user statuses
 */
export const USER_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
}

/**
 * Valid user roles
 */
export const USER_ROLES = {
  TRAINEE: 'trainee',
  TRAINER: 'trainer',
  ADMIN: 'admin',
}

/**
 * Fetches all user profiles from public.profiles with optional filtering and search
 *
 * @param {Object} [filters]
 * @param {string} [filters.search] - Search term for full_name or email
 * @param {string} [filters.status] - Filter by status ('all', 'pending', 'approved', 'rejected', 'suspended')
 * @param {string} [filters.role] - Filter by role ('all', 'trainee', 'trainer', 'admin')
 */
export async function getUsers(filters = {}) {
  try {
    const { search, status, role } = filters

    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status.toLowerCase().trim())
    }

    if (role && role !== 'all') {
      query = query.eq('role', role.toLowerCase().trim())
    }

    if (search && search.trim()) {
      const term = search.trim()
      // Supabase PostgREST ilike search across full_name and email
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,department.ilike.%${term}%,designation.ilike.%${term}%`)
    }

    const { data, error } = await query

    if (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      }
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to retrieve users',
      data: [],
    }
  }
}

/**
 * Updates user profile status (e.g. approved, rejected, suspended, pending)
 *
 * @param {string} userId - ID of the target user profile
 * @param {string} newStatus - Target status ('approved', 'rejected', 'suspended', 'pending')
 * @param {string} currentAdminId - ID of currently authenticated Admin (for self-protection)
 */
export async function updateUserStatus(userId, newStatus, currentAdminId) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required.' }
    }

    const cleanStatus = (newStatus || '').toLowerCase().trim()
    const validStatuses = Object.values(USER_STATUSES)

    if (!validStatuses.includes(cleanStatus)) {
      return {
        success: false,
        error: `Invalid status "${newStatus}". Must be one of: ${validStatuses.join(', ')}`,
      }
    }

    // Admin Self-Protection: Prevent admin from removing their own approval
    if (currentAdminId && userId === currentAdminId && cleanStatus !== USER_STATUSES.APPROVED) {
      return {
        success: false,
        error: 'Self-Protection Rule: Administrators cannot suspend, reject, or un-approve their own account.',
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        status: cleanStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update user status.',
    }
  }
}

/**
 * Updates user profile role (trainee <-> trainer)
 *
 * @param {string} userId - ID of the target user profile
 * @param {string} newRole - Target role ('trainee', 'trainer', 'admin')
 * @param {string} currentAdminId - ID of currently authenticated Admin (for self-protection)
 */
export async function updateUserRole(userId, newRole, currentAdminId) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required.' }
    }

    const cleanRole = (newRole || '').toLowerCase().trim()
    const validRoles = Object.values(USER_ROLES)

    if (!validRoles.includes(cleanRole)) {
      return {
        success: false,
        error: `Invalid role "${newRole}". Must be one of: ${validRoles.join(', ')}`,
      }
    }

    // Admin Self-Protection: Prevent admin from demoting themselves from admin
    if (currentAdminId && userId === currentAdminId && cleanRole !== USER_ROLES.ADMIN) {
      return {
        success: false,
        error: 'Self-Protection Rule: Administrators cannot demote their own account from the Admin role.',
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        role: cleanRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data,
      error: null,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update user role.',
    }
  }
}

/**
 * Calculates summary metrics for the Admin Dashboard overview cards
 */
export function calculateUserMetrics(users = []) {
  return {
    total: users.length,
    pending: users.filter((u) => u.status === USER_STATUSES.PENDING).length,
    approved: users.filter((u) => u.status === USER_STATUSES.APPROVED).length,
    rejected: users.filter((u) => u.status === USER_STATUSES.REJECTED).length,
    suspended: users.filter((u) => u.status === USER_STATUSES.SUSPENDED).length,
    trainees: users.filter((u) => u.role === USER_ROLES.TRAINEE).length,
    trainers: users.filter((u) => u.role === USER_ROLES.TRAINER).length,
    admins: users.filter((u) => u.role === USER_ROLES.ADMIN).length,
  }
}
