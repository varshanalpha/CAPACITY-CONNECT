import { supabase } from '../lib/supabaseClient'

/**
 * Fetches basic profile (public.profiles) and trainer profile (public.trainer_profiles)
 *
 * @param {string} userId
 */
export async function getTrainerProfile(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    console.log('[getTrainerProfile] Loading trainer profile for userId:', userId)

    // 1. Fetch public.profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('[getTrainerProfile] Error fetching public.profiles:', {
        table: 'profiles',
        operation: 'SELECT',
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      })
      throw profileError
    }

    // 2. Fetch public.trainer_profiles
    const { data: trainerData, error: trainerError } = await supabase
      .from('trainer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (trainerError) {
      console.error('[getTrainerProfile] Error fetching public.trainer_profiles:', {
        table: 'trainer_profiles',
        operation: 'SELECT',
        code: trainerError.code,
        message: trainerError.message,
        details: trainerError.details,
        hint: trainerError.hint,
      })
      throw trainerError
    }

    console.log('[getTrainerProfile] Successfully loaded trainer profile data')
    return {
      success: true,
      data: {
        profile: profileData || null,
        trainerProfile: trainerData || null,
      },
    }
  } catch (err) {
    console.error('[getTrainerProfile] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch trainer profile',
      data: null,
    }
  }
}

/**
 * Updates basic profile and trainer-specific profile information
 *
 * @param {string} userId
 * @param {Object} payload
 * @param {Object} payload.profileData - Fields for public.profiles (full_name, phone, department, designation)
 * @param {Object} payload.trainerData - Fields for public.trainer_profiles (professional_summary, current_position, specialization, years_of_experience, interests)
 */
export async function updateTrainerProfile(userId, { profileData = {}, trainerData = {} }) {
  try {
    if (!userId) throw new Error('User ID is required')

    console.log('[updateTrainerProfile] Initiating update for trainer userId:', userId)

    // 1. Update public.profiles (strictly only permitted fields: full_name, phone, department, designation)
    // NEVER send role, status, id, or email
    const profileUpdates = {
      full_name: profileData.full_name?.trim() || null,
      phone: profileData.phone?.trim() || null,
      department: profileData.department?.trim() || null,
      designation: profileData.designation?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    console.log('[updateTrainerProfile] Step 1: Updating public.profiles:', profileUpdates)

    const { data: updatedProfile, error: pError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (pError) {
      console.error('[updateTrainerProfile] public.profiles UPDATE error:', {
        table: 'profiles',
        operation: 'UPDATE',
        code: pError.code,
        message: pError.message,
        details: pError.details,
        hint: pError.hint,
        payload: profileUpdates,
      })
      throw new Error(`[profiles UPDATE] ${pError.message} (Code: ${pError.code})`)
    }

    console.log('[updateTrainerProfile] Step 1 SUCCESS: public.profiles updated')

    // 2. Format trainer-specific fields
    // Parse interests into a clean TEXT[] array
    let parsedInterests = null
    if (Array.isArray(trainerData.interests)) {
      parsedInterests = trainerData.interests.map((i) => String(i).trim()).filter(Boolean)
    } else if (typeof trainerData.interests === 'string' && trainerData.interests.trim()) {
      parsedInterests = trainerData.interests
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean)
    }

    // Validate years of experience (must be non-negative)
    let experienceYears = null
    if (trainerData.years_of_experience !== undefined && trainerData.years_of_experience !== null && trainerData.years_of_experience !== '') {
      const parsedNum = parseInt(trainerData.years_of_experience, 10)
      if (isNaN(parsedNum) || parsedNum < 0) {
        throw new Error('Years of Experience must be a non-negative number (0 or greater).')
      }
      experienceYears = parsedNum
    }

    const trainerPayload = {
      user_id: userId,
      professional_summary: trainerData.professional_summary?.trim() || null,
      current_position: trainerData.current_position?.trim() || null,
      specialization: trainerData.specialization?.trim() || null,
      years_of_experience: experienceYears,
      interests: parsedInterests,
      updated_at: new Date().toISOString(),
    }

    console.log('[updateTrainerProfile] Step 2: Processing public.trainer_profiles payload:', trainerPayload)

    // Check if trainer_profiles record exists
    const { data: existingTrainer, error: checkErr } = await supabase
      .from('trainer_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (checkErr) {
      console.warn('[updateTrainerProfile] Warning checking existing trainer profile:', checkErr)
    }

    let updatedTrainer = null

    if (existingTrainer) {
      console.log('[updateTrainerProfile] Existing record found. Performing UPDATE on public.trainer_profiles.')
      const { data: updateData, error: tUpdateErr } = await supabase
        .from('trainer_profiles')
        .update({
          professional_summary: trainerPayload.professional_summary,
          current_position: trainerPayload.current_position,
          specialization: trainerPayload.specialization,
          years_of_experience: trainerPayload.years_of_experience,
          interests: trainerPayload.interests,
          updated_at: trainerPayload.updated_at,
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (tUpdateErr) {
        console.error('[updateTrainerProfile] public.trainer_profiles UPDATE error:', {
          table: 'trainer_profiles',
          operation: 'UPDATE',
          code: tUpdateErr.code,
          message: tUpdateErr.message,
          details: tUpdateErr.details,
          hint: tUpdateErr.hint,
          payload: trainerPayload,
        })
        throw new Error(`[trainer_profiles UPDATE] ${tUpdateErr.message} (Code: ${tUpdateErr.code})`)
      }
      updatedTrainer = updateData
    } else {
      console.log('[updateTrainerProfile] No existing record found. Performing INSERT into public.trainer_profiles.')
      const { data: insertData, error: tInsertErr } = await supabase
        .from('trainer_profiles')
        .insert(trainerPayload)
        .select()
        .single()

      if (tInsertErr) {
        console.error('[updateTrainerProfile] public.trainer_profiles INSERT error:', {
          table: 'trainer_profiles',
          operation: 'INSERT',
          code: tInsertErr.code,
          message: tInsertErr.message,
          details: tInsertErr.details,
          hint: tInsertErr.hint,
          payload: trainerPayload,
        })
        throw new Error(`[trainer_profiles INSERT] ${tInsertErr.message} (Code: ${tInsertErr.code})`)
      }
      updatedTrainer = insertData
    }

    console.log('[updateTrainerProfile] Step 2 SUCCESS: public.trainer_profiles updated')

    return {
      success: true,
      data: {
        profile: updatedProfile,
        trainerProfile: updatedTrainer,
      },
    }
  } catch (err) {
    console.error('[updateTrainerProfile] Error saving trainer profile:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update trainer profile.',
    }
  }
}
