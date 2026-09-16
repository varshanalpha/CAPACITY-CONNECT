import { supabase } from '../lib/supabaseClient'

/**
 * Maps user roles to their corresponding dashboard routes
 */
export const ROLE_DASHBOARDS = {
  trainee: '/trainee/dashboard',
  trainer: '/trainer/dashboard',
  admin: '/admin/dashboard',
}

/**
 * Returns dashboard URL for a given role
 */
export function getDashboardPath(role) {
  const normalized = (role || '').toLowerCase()
  return ROLE_DASHBOARDS[normalized] || '/login'
}

/**
 * Fetches user profile record from the public.profiles table
 */
export async function fetchUserProfile(userId) {
  if (!userId) return { data: null, error: 'User ID is required' }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  return { data, error }
}

/**
 * Registers a new user with Trainee or Trainer role.
 * Public registration is strictly forbidden for Admin role.
 * Profile creation is handled automatically by the Supabase database trigger on auth.users.
 */
export async function signUpWithRole({ fullName, email, password, role }) {
  try {
    const cleanRole = (role || '').toLowerCase().trim()
    const cleanEmail = (email || '').trim()
    const cleanName = (fullName || '').trim()

    // 1. Security Check: Never allow frontend to register role = admin
    if (cleanRole !== 'trainee' && cleanRole !== 'trainer') {
      return {
        success: false,
        error: 'Public registration is only available for Trainees and Trainers.',
        errorType: 'invalid_role',
      }
    }

    if (!cleanName) {
      return {
        success: false,
        error: 'Full Name is required.',
        errorType: 'validation_error',
      }
    }

    if (!cleanEmail) {
      return {
        success: false,
        error: 'Email is required.',
        errorType: 'validation_error',
      }
    }

    if (!password || password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters.',
        errorType: 'validation_error',
      }
    }

    // 2. Sign up via Supabase Auth with metadata for the DB trigger
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          role: cleanRole,
        },
      },
    })

    if (error) {
      return {
        success: false,
        error: error.message,
        errorType: 'auth_error',
      }
    }

    const user = data?.user
    if (!user) {
      return {
        success: false,
        error: 'Registration failed: No user returned from authentication service.',
        errorType: 'auth_error',
      }
    }

    // If Supabase auto-creates a session upon signup, immediately sign out
    // because pending accounts must NOT have active application access yet.
    if (data.session) {
      await supabase.auth.signOut()
    }

    // Determine whether email verification was triggered
    const requiresEmailConfirmation = !data.session && Boolean(user.confirmation_sent_at || !user.email_confirmed_at)

    return {
      success: true,
      user,
      requiresEmailConfirmation,
      role: cleanRole,
    }
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during signup.',
      errorType: 'unexpected_error',
    }
  }
}

/**
 * Authenticates user with email and password, then verifies profile role & status against database.
 *
 * Enforces security:
 * 1. Authenticates with Supabase Auth
 * 2. Fetches record from public.profiles
 * 3. Compares actual profile.role with selectedRole
 * 4. Ensures profile.status === 'approved'
 * 5. Signs out if unauthorized
 */
export async function signInWithRole({ email, password, selectedRole }) {
  try {
    const cleanEmail = (email || '').trim()
    const targetRole = (selectedRole || '').toLowerCase()

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

    if (authError) {
      return {
        success: false,
        error: authError.message,
        errorType: 'auth_error',
      }
    }

    const user = authData?.user
    if (!user) {
      return {
        success: false,
        error: 'Authentication failed: No user returned.',
        errorType: 'auth_error',
      }
    }

    // 2. Fetch database profile
    const { data: profile, error: profileError } = await fetchUserProfile(
      user.id,
    )

    if (profileError) {
      await supabase.auth.signOut()
      return {
        success: false,
        error: `Error loading profile: ${profileError.message || 'Unable to retrieve user record.'}`,
        errorType: 'profile_error',
      }
    }

    if (!profile) {
      await supabase.auth.signOut()
      return {
        success: false,
        error:
          'No profile record found for this account. Please contact an administrator.',
        errorType: 'profile_not_found',
      }
    }

    const actualRole = (profile.role || '').toLowerCase()
    const profileStatus = (profile.status || '').toLowerCase()

    // 3. Strict Role Verification
    if (actualRole !== targetRole) {
      await supabase.auth.signOut()
      return {
        success: false,
        error: `Access Denied: Your account is registered as "${profile.role || actualRole}", not "${selectedRole}". Please switch to the correct login tab.`,
        errorType: 'role_mismatch',
        actualRole,
      }
    }

    // 4. Strict Status Verification
    if (profileStatus === 'pending') {
      await supabase.auth.signOut()
      return {
        success: false,
        error:
          'Your account is currently pending approval. An administrator will review your account soon.',
        errorType: 'status_pending',
      }
    }

    if (profileStatus === 'rejected') {
      await supabase.auth.signOut()
      return {
        success: false,
        error:
          'Your account registration has been rejected. Please contact administrator support.',
        errorType: 'status_rejected',
      }
    }

    if (profileStatus === 'suspended') {
      await supabase.auth.signOut()
      return {
        success: false,
        error:
          'Your account has been suspended. Please contact platform support.',
        errorType: 'status_suspended',
      }
    }

    if (profileStatus !== 'approved') {
      await supabase.auth.signOut()
      return {
        success: false,
        error: `Account status "${profile.status}" is not permitted to log in.`,
        errorType: 'status_unapproved',
      }
    }

    // 5. Authorized & Approved
    return {
      success: true,
      user,
      profile,
      session: authData.session,
      redirectPath: getDashboardPath(actualRole),
    }
  } catch (err) {
    await supabase.auth.signOut()
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'An unexpected authentication error occurred.',
      errorType: 'unexpected_error',
    }
  }
}

/**
 * Sign out the current user and clear session
 */
export async function signOut() {
  return await supabase.auth.signOut()
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}
