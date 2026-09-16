import { useAuthStore } from '../store/useAuthStore'

/**
 * Custom React hook providing access to authenticated user, database profile,
 * authorization statuses, and authentication actions throughout the application.
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const session = useAuthStore((state) => state.session)
  const loading = useAuthStore((state) => state.loading)
  const logout = useAuthStore((state) => state.logout)
  const refreshProfile = useAuthStore((state) => state.refreshProfile)

  const isAuthenticated = Boolean(user && session)
  const role = (profile?.role || '').toLowerCase()
  const status = (profile?.status || '').toLowerCase()

  const isApproved = status === 'approved'
  const isPending = status === 'pending'
  const isRejected = status === 'rejected'
  const isSuspended = status === 'suspended'

  return {
    user,
    profile,
    session,
    loading,
    isAuthenticated,
    role,
    status,
    isApproved,
    isPending,
    isRejected,
    isSuspended,
    logout,
    refreshProfile,
  }
}

export default useAuth
