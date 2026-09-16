import { supabase } from '../lib/supabaseClient'

/**
 * Allowed status values for training programmes
 */
export const PROGRAMME_STATUSES = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

/**
 * Fetches all training programmes from public.training_programmes
 * Joined with trainer profile from public.profiles
 * Ordered by created_at descending
 */
export async function getTrainingProgrammes() {
  try {
    console.log('[getTrainingProgrammes] Fetching all training programmes with trainer details...')

    const { data, error } = await supabase
      .from('training_programmes')
      .select(`
        *,
        trainer:profiles!training_programmes_trainer_id_fkey (
          id,
          full_name,
          email,
          phone,
          department,
          designation,
          role,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getTrainingProgrammes] Supabase error:', {
        table: 'training_programmes',
        operation: 'SELECT',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    console.log(`[getTrainingProgrammes] Successfully fetched ${data?.length || 0} training programmes`)
    return {
      success: true,
      data: data || [],
    }
  } catch (err) {
    console.error('[getTrainingProgrammes] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch training programmes',
      data: [],
    }
  }
}

/**
 * Fetches a single training programme by its UUID
 * Joined with trainer profile from public.profiles
 *
 * @param {string} id
 */
export async function getTrainingProgrammeById(id) {
  try {
    if (!id) throw new Error('Programme ID is required')

    console.log(`[getTrainingProgrammeById] Fetching programme with ID: ${id}`)

    const { data, error } = await supabase
      .from('training_programmes')
      .select(`
        *,
        trainer:profiles!training_programmes_trainer_id_fkey (
          id,
          full_name,
          email,
          phone,
          department,
          designation,
          role,
          status
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[getTrainingProgrammeById] Supabase error:', {
        table: 'training_programmes',
        operation: 'SELECT',
        id,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    return {
      success: true,
      data: data || null,
    }
  } catch (err) {
    console.error('[getTrainingProgrammeById] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch training programme details',
      data: null,
    }
  }
}

/**
 * Fetches all approved trainers from public.profiles
 * Requirements:
 * - role = 'trainer'
 * - status = 'approved'
 */
export async function getApprovedTrainers() {
  try {
    console.log('[getApprovedTrainers] Fetching all approved trainers from public.profiles...')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, department, designation, role, status')
      .eq('role', 'trainer')
      .eq('status', 'approved')
      .order('full_name', { ascending: true })

    if (error) {
      console.error('[getApprovedTrainers] Supabase error:', {
        table: 'profiles',
        operation: 'SELECT',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    console.log(`[getApprovedTrainers] Successfully fetched ${data?.length || 0} approved trainers`)
    return {
      success: true,
      data: data || [],
    }
  } catch (err) {
    console.error('[getApprovedTrainers] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch approved trainers',
      data: [],
    }
  }
}

/**
 * Manually assigns a trainer to a training programme
 *
 * @param {string} programmeId
 * @param {string} trainerId
 */
export async function assignTrainer(programmeId, trainerId) {
  try {
    if (!programmeId) throw new Error('Training Programme ID is required.')
    if (!trainerId) throw new Error('Trainer ID is required.')

    console.log(`[assignTrainer] Assigning trainer ${trainerId} to programme ${programmeId}...`)

    // Verify target trainer is valid, approved, and has role = 'trainer'
    const { data: trainerProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, role, status, full_name')
      .eq('id', trainerId)
      .maybeSingle()

    if (profileErr) {
      console.error('[assignTrainer] Error verifying trainer profile:', profileErr)
      throw profileErr
    }

    if (!trainerProfile) {
      throw new Error('Selected trainer profile was not found.')
    }

    if (trainerProfile.role !== 'trainer') {
      throw new Error(`Cannot assign user with role '${trainerProfile.role}'. Only trainers can be assigned.`)
    }

    if (trainerProfile.status !== 'approved') {
      throw new Error(`Cannot assign trainer with status '${trainerProfile.status}'. Only approved trainers can be assigned.`)
    }

    const { data, error } = await supabase
      .from('training_programmes')
      .update({
        trainer_id: trainerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programmeId)
      .select(`
        *,
        trainer:profiles!training_programmes_trainer_id_fkey (
          id,
          full_name,
          email,
          phone,
          department,
          designation,
          role,
          status
        )
      `)
      .single()

    if (error) {
      console.error('[assignTrainer] Supabase update error:', {
        table: 'training_programmes',
        operation: 'UPDATE',
        programmeId,
        trainerId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    console.log(`[assignTrainer] Successfully assigned trainer ${trainerProfile.full_name} to programme ${programmeId}`)
    return {
      success: true,
      data,
    }
  } catch (err) {
    console.error('[assignTrainer] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to assign trainer.',
    }
  }
}

/**
 * Removes the assigned trainer from a training programme (sets trainer_id = null)
 *
 * @param {string} programmeId
 */
export async function removeTrainer(programmeId) {
  try {
    if (!programmeId) throw new Error('Training Programme ID is required.')

    console.log(`[removeTrainer] Removing trainer from programme ${programmeId}...`)

    const { data, error } = await supabase
      .from('training_programmes')
      .update({
        trainer_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programmeId)
      .select(`
        *,
        trainer:profiles!training_programmes_trainer_id_fkey (
          id,
          full_name,
          email,
          phone,
          department,
          designation,
          role,
          status
        )
      `)
      .single()

    if (error) {
      console.error('[removeTrainer] Supabase update error:', {
        table: 'training_programmes',
        operation: 'UPDATE',
        programmeId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    console.log(`[removeTrainer] Successfully unassigned trainer from programme ${programmeId}`)
    return {
      success: true,
      data,
    }
  } catch (err) {
    console.error('[removeTrainer] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove trainer.',
    }
  }
}

/**
 * Fetches training programmes assigned to the logged-in trainer
 * (Leverages Supabase RLS trainer_id = auth.uid())
 *
 * @param {string} trainerUserId
 */
export async function getTrainerAssignedProgrammes(trainerUserId) {
  try {
    if (!trainerUserId) throw new Error('Trainer User ID is required.')

    console.log(`[getTrainerAssignedProgrammes] Fetching assigned programmes for trainer ${trainerUserId}...`)

    const { data, error } = await supabase
      .from('training_programmes')
      .select('*')
      .eq('trainer_id', trainerUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getTrainerAssignedProgrammes] Supabase error:', {
        table: 'training_programmes',
        operation: 'SELECT',
        trainerUserId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (err) {
    console.error('[getTrainerAssignedProgrammes] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch assigned programmes',
      data: [],
    }
  }
}

/**
 * Creates a new training programme in public.training_programmes
 *
 * Requirements:
 * - created_by = authenticated user's ID
 * - status = 'draft'
 * - trainer_id = null
 *
 * @param {Object} data
 * @param {string} data.title (Required)
 * @param {string} [data.description]
 * @param {string} [data.objectives]
 * @param {string} [data.start_date]
 * @param {string} [data.end_date]
 * @param {string} [data.enrollment_deadline]
 * @param {number|string} [data.capacity]
 */
export async function createTrainingProgramme(data) {
  try {
    console.log('[createTrainingProgramme] Preparing to create training programme with input:', data)

    // 1. Get authenticated user ID from Supabase session
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) {
      console.error('[createTrainingProgramme] Authentication error:', authError)
      throw new Error('Authentication required: Unable to identify current user.')
    }

    const userId = authData.user.id

    // 2. Validate inputs
    const title = data.title?.trim()
    if (!title) {
      throw new Error('Programme title is required.')
    }

    let parsedCapacity = null
    if (data.capacity !== undefined && data.capacity !== null && data.capacity !== '') {
      parsedCapacity = parseInt(data.capacity, 10)
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        throw new Error('Maximum Capacity must be a positive number greater than 0.')
      }
    }

    const startDate = data.start_date ? data.start_date : null
    const endDate = data.end_date ? data.end_date : null
    const enrollmentDeadline = data.enrollment_deadline ? data.enrollment_deadline : null

    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        throw new Error('End date must not be earlier than start date.')
      }
    }

    if (startDate && enrollmentDeadline) {
      if (new Date(enrollmentDeadline) > new Date(startDate)) {
        throw new Error('Enrollment deadline must not be later than start date.')
      }
    }

    // 3. Build insert payload
    const payload = {
      title,
      description: data.description?.trim() || null,
      objectives: data.objectives?.trim() || null,
      start_date: startDate,
      end_date: endDate,
      enrollment_deadline: enrollmentDeadline,
      capacity: parsedCapacity,
      status: PROGRAMME_STATUSES.DRAFT,
      created_by: userId,
      trainer_id: null,
    }

    console.log('[createTrainingProgramme] Inserting payload into public.training_programmes:', payload)

    const { data: insertedData, error: insertError } = await supabase
      .from('training_programmes')
      .insert(payload)
      .select(`
        *,
        trainer:profiles!training_programmes_trainer_id_fkey (
          id,
          full_name,
          email,
          phone,
          department,
          designation,
          role,
          status
        )
      `)
      .single()

    if (insertError) {
      console.error('[createTrainingProgramme] Supabase insert error:', {
        table: 'training_programmes',
        operation: 'INSERT',
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        payload,
      })
      throw insertError
    }

    console.log('[createTrainingProgramme] Successfully created training programme:', insertedData)
    return {
      success: true,
      data: insertedData,
    }
  } catch (err) {
    console.error('[createTrainingProgramme] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create training programme',
    }
  }
}

/**
 * Updates an existing training programme in public.training_programmes
 *
 * Note: id, created_by, created_at, and trainer_id are NOT modified here.
 *
 * @param {string} id
 * @param {Object} data
 */
export async function updateTrainingProgramme(id, data) {
  try {
    if (!id) throw new Error('Programme ID is required for update.')

    console.log(`[updateTrainingProgramme] Updating programme ${id} with:`, data)

    // Validate inputs
    const title = data.title?.trim()
    if (!title) {
      throw new Error('Programme title is required.')
    }

    let parsedCapacity = null
    if (data.capacity !== undefined && data.capacity !== null && data.capacity !== '') {
      parsedCapacity = parseInt(data.capacity, 10)
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        throw new Error('Maximum Capacity must be a positive number greater than 0.')
      }
    }

    const startDate = data.start_date ? data.start_date : null
    const endDate = data.end_date ? data.end_date : null
    const enrollmentDeadline = data.enrollment_deadline ? data.enrollment_deadline : null

    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        throw new Error('End date must not be earlier than start date.')
      }
    }

    if (startDate && enrollmentDeadline) {
      if (new Date(enrollmentDeadline) > new Date(startDate)) {
        throw new Error('Enrollment deadline must not be later than start date.')
      }
    }

    const payload = {
      title,
      description: data.description?.trim() || null,
      objectives: data.objectives?.trim() || null,
      start_date: startDate,
      end_date: endDate,
      enrollment_deadline: enrollmentDeadline,
      capacity: parsedCapacity,
      updated_at: new Date().toISOString(),
    }

    // Preserve status if specifically updating or leave untouched
    if (data.status && Object.values(PROGRAMME_STATUSES).includes(data.status)) {
      payload.status = data.status
    }

    console.log('[updateTrainingProgramme] Performing UPDATE on public.training_programmes:', payload)

    const { data: updatedData, error: updateError } = await supabase
      .from('training_programmes')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        trainer:profiles!training_programmes_trainer_id_fkey (
          id,
          full_name,
          email,
          phone,
          department,
          designation,
          role,
          status
        )
      `)
      .single()

    if (updateError) {
      console.error('[updateTrainingProgramme] Supabase update error:', {
        table: 'training_programmes',
        operation: 'UPDATE',
        id,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        payload,
      })
      throw updateError
    }

    console.log('[updateTrainingProgramme] Successfully updated training programme:', updatedData)
    return {
      success: true,
      data: updatedData,
    }
  } catch (err) {
    console.error('[updateTrainingProgramme] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update training programme',
    }
  }
}

/**
 * Deletes a training programme from public.training_programmes
 *
 * @param {string} id
 */
export async function deleteTrainingProgramme(id) {
  try {
    if (!id) throw new Error('Programme ID is required for deletion.')

    console.log(`[deleteTrainingProgramme] Deleting programme ${id}...`)

    const { error: deleteError } = await supabase
      .from('training_programmes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[deleteTrainingProgramme] Supabase delete error:', {
        table: 'training_programmes',
        operation: 'DELETE',
        id,
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
      })
      throw deleteError
    }

    console.log(`[deleteTrainingProgramme] Successfully deleted programme ${id}`)
    return {
      success: true,
    }
  } catch (err) {
    console.error('[deleteTrainingProgramme] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete training programme',
    }
  }
}
