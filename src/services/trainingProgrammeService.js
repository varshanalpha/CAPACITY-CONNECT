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
 * Ordered by created_at descending
 */
export async function getTrainingProgrammes() {
  try {
    console.log('[getTrainingProgrammes] Fetching all training programmes...')

    const { data, error } = await supabase
      .from('training_programmes')
      .select('*')
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
 *
 * @param {string} id
 */
export async function getTrainingProgrammeById(id) {
  try {
    if (!id) throw new Error('Programme ID is required')

    console.log(`[getTrainingProgrammeById] Fetching programme with ID: ${id}`)

    const { data, error } = await supabase
      .from('training_programmes')
      .select('*')
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
      .select()
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
      .select()
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
