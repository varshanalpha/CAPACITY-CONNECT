import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import { fetchUserProfile } from '../services/authService'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session, user: session?.user || null }),

  setAuthData: ({ user, profile, session }) =>
    set({
      user,
      profile,
      session,
      loading: false,
    }),

  clearAuth: () =>
    set({
      user: null,
      profile: null,
      session: null,
      loading: false,
    }),

  refreshProfile: async () => {
    const currentUser = get().user
    if (!currentUser) return null
    try {
      const { data: profile } = await fetchUserProfile(currentUser.id)
      if (profile) {
        set({ profile })
      }
      return profile
    } catch (err) {
      console.error('Error refreshing profile:', err)
      return null
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error during signOut:', err)
    } finally {
      get().clearAuth()
    }
  },

  initAuth: async () => {
    set({ loading: true })
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: profile } = await fetchUserProfile(session.user.id)
        set({
          session,
          user: session.user,
          profile: profile || null,
          loading: false,
        })
      } else {
        set({
          session: null,
          user: null,
          profile: null,
          loading: false,
        })
      }
    } catch (err) {
      console.error('Auth initialization error:', err)
      set({
        session: null,
        user: null,
        profile: null,
        loading: false,
      })
    }

    // Set up auth state change listener to maintain persistent session across refreshes and tab switches
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        get().clearAuth()
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const currentUser = session.user
        const { data: profile } = await fetchUserProfile(currentUser.id)
        set({
          session,
          user: currentUser,
          profile: profile || null,
          loading: false,
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  },
}))

export default useAuthStore
