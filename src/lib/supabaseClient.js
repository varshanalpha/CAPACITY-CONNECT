import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Supabase URL or Publishable/Anon Key is missing. Check your .env file.',
  )
}

export const supabase = createClient(supabaseUrl || '', supabasePublishableKey || '')

/**
 * Minimal connection test checking communication with the Supabase backend
 * without requiring any specific application database tables.
 */
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown connection error',
    }
  }
}

export default supabase
