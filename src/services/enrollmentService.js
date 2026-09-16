import { supabase } from '../lib/supabaseClient'

/**
 * Fetches all available training programmes for trainees
 * Filter: status IN ('published', 'ongoing')
 * Step A: Fetch published/ongoing training programmes
 * Step B: Collect non-null trainer_ids
 * Step C: Fetch corresponding approved trainers from public.profiles
 * Step D: In-memory lookup map
 * Step E: Map each programme with programme.trainer
 */
export async function getAvailableTrainingProgrammes() {
  try {
    console.log('[getAvailableTrainingProgrammes] Step 1: Fetching training programmes...')

    // STEP 1: Fetch training programmes (no ambiguous nested profiles relation)
    const { data: programmes, error } = await supabase
      .from('training_programmes')
      .select(`
        id,
        title,
        description,
        objectives,
        trainer_id,
        start_date,
        end_date,
        enrollment_deadline,
        capacity,
        status,
        created_at,
        updated_at,
        enrollments (
          id,
          trainee_id,
          status,
          enrolled_at
        )
      `)
      .in('status', ['published', 'ongoing'])
      .order('start_date', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('[getAvailableTrainingProgrammes] Supabase error:', error)
      throw error
    }

    const rawProgrammes = programmes || []

    // STEP 2: Extract trainer IDs
    const trainerIds = [
      ...new Set(
        rawProgrammes
          .map((programme) => programme.trainer_id)
          .filter(Boolean)
      )
    ]

    let trainerById = {}

    // STEP 3: Fetch approved trainers separately
    if (trainerIds.length > 0) {
      console.log('[getAvailableTrainingProgrammes] Step 3: Fetching approved trainer profiles for IDs:', trainerIds)
      const { data: trainersData, error: trainersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          designation,
          department,
          role,
          status
        `)
        .in('id', trainerIds)
        .eq('role', 'trainer')
        .eq('status', 'approved')

      if (trainersError) {
        console.error('[getAvailableTrainingProgrammes] Error fetching trainer profiles:', trainersError)
      }

      // STEP 4: Create trainer lookup
      trainerById = Object.fromEntries(
        (trainersData || []).map((trainer) => [
          trainer.id,
          trainer
        ])
      )
    }

    // STEP 5: Attach trainer to each programme
    const programmesWithTrainer = rawProgrammes.map((programme) => ({
      ...programme,
      trainer: programme.trainer_id
        ? trainerById[programme.trainer_id] || null
        : null
    }))

    console.log(`[getAvailableTrainingProgrammes] Loaded ${programmesWithTrainer.length} programmes with trainer mapping`)
    return {
      success: true,
      data: programmesWithTrainer,
    }
  } catch (err) {
    console.error('[getAvailableTrainingProgrammes] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unable to load training programmes.',
      data: [],
    }
  }
}

/**
 * Fetches all enrollments for a specific trainee
 * Uses two-step trainer lookup to avoid ambiguous relationships
 *
 * @param {string} userId
 */
export async function getMyEnrollments(userId) {
  try {
    if (!userId) throw new Error('User ID is required to fetch enrollments.')

    console.log(`[getMyEnrollments] Fetching enrollments for trainee: ${userId}`)

    // STEP 1: Fetch user enrollments and training programmes
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        trainee_id,
        training_programme_id,
        status,
        enrolled_at,
        updated_at,
        training_programme:training_programmes (
          id,
          title,
          description,
          objectives,
          trainer_id,
          start_date,
          end_date,
          enrollment_deadline,
          capacity,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('trainee_id', userId)
      .order('enrolled_at', { ascending: false })

    if (error) {
      console.error('[getMyEnrollments] Supabase error:', error)
      throw error
    }

    const rawEnrollments = enrollments || []

    // STEP 2: Extract unique trainer IDs
    const trainerIds = [
      ...new Set(
        rawEnrollments
          .map((enr) => enr.training_programme?.trainer_id)
          .filter(Boolean)
      )
    ]

    let trainerById = {}

    // STEP 3: Fetch approved trainers separately
    if (trainerIds.length > 0) {
      const { data: trainersData, error: trainersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          designation,
          department,
          role,
          status
        `)
        .in('id', trainerIds)
        .eq('role', 'trainer')
        .eq('status', 'approved')

      if (trainersError) {
        console.error('[getMyEnrollments] Error querying profiles for trainers:', trainersError)
      }

      // STEP 4: Create trainer lookup
      trainerById = Object.fromEntries(
        (trainersData || []).map((trainer) => [
          trainer.id,
          trainer
        ])
      )
    }

    // STEP 5: Attach trainer to each enrolled programme
    const enrollmentsWithTrainer = rawEnrollments.map((enr) => {
      const p = enr.training_programme
      if (!p) return enr
      return {
        ...enr,
        training_programme: {
          ...p,
          trainer: p.trainer_id
            ? trainerById[p.trainer_id] || null
            : null
        }
      }
    })

    console.log(`[getMyEnrollments] Loaded ${enrollmentsWithTrainer.length} enrolled programmes for user ${userId}`)
    return {
      success: true,
      data: enrollmentsWithTrainer,
    }
  } catch (err) {
    console.error('[getMyEnrollments] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unable to load your enrollments.',
      data: [],
    }
  }
}

/**
 * Checks if a trainee is already enrolled in a training programme
 *
 * @param {string} userId
 * @param {string} programmeId
 */
export async function checkEnrollment(userId, programmeId) {
  try {
    if (!userId || !programmeId) return { success: true, isEnrolled: false }

    const { data, error } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('trainee_id', userId)
      .eq('training_programme_id', programmeId)
      .maybeSingle()

    if (error) {
      console.error('[checkEnrollment] Error checking enrollment status:', error)
      return { success: false, isEnrolled: false, error: error.message }
    }

    return {
      success: true,
      isEnrolled: !!data,
      enrollment: data || null,
    }
  } catch (err) {
    console.error('[checkEnrollment] Catch block error:', err)
    return {
      success: false,
      isEnrolled: false,
      error: err instanceof Error ? err.message : 'Error checking enrollment.',
    }
  }
}

/**
 * Counts total active enrollments for a training programme
 *
 * @param {string} programmeId
 */
export async function getEnrollmentCount(programmeId) {
  try {
    if (!programmeId) return { success: true, count: 0 }

    const { count, error } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('training_programme_id', programmeId)

    if (error) {
      console.error('[getEnrollmentCount] Supabase count error:', error)
      throw error
    }

    return {
      success: true,
      count: count || 0,
    }
  } catch (err) {
    console.error('[getEnrollmentCount] Catch block error:', err)
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Failed to get enrollment count.',
    }
  }
}

/**
 * Enrolls the authenticated trainee in a training programme
 *
 * Validations:
 * - Deadline check (must not be past enrollment_deadline)
 * - Capacity check (enrollment count must not exceed capacity)
 * - Duplicate check (user cannot enroll twice)
 *
 * @param {string} userId
 * @param {string} programmeId
 */
export async function enrollInProgramme(userId, programmeId) {
  try {
    if (!userId) throw new Error('User authentication required for enrollment.')
    if (!programmeId) throw new Error('Programme ID is required.')

    console.log(`[enrollInProgramme] Processing enrollment for user ${userId} in programme ${programmeId}...`)

    // 1. Fetch current programme details to validate status, deadline, and capacity
    const { data: programme, error: progErr } = await supabase
      .from('training_programmes')
      .select('id, title, status, enrollment_deadline, capacity')
      .eq('id', programmeId)
      .single()

    if (progErr || !programme) {
      console.error('[enrollInProgramme] Error fetching programme for enrollment:', progErr)
      throw new Error('Selected training programme could not be found.')
    }

    // 2. Validate programme status (must be published or ongoing)
    if (programme.status !== 'published' && programme.status !== 'ongoing') {
      throw new Error(`Enrollment is not open for this programme (Status: ${programme.status}).`)
    }

    // 3. Validate enrollment deadline
    if (programme.enrollment_deadline) {
      const deadlineDate = new Date(programme.enrollment_deadline)
      // Set to end of day if only date is provided
      deadlineDate.setHours(23, 59, 59, 999)
      if (new Date() > deadlineDate) {
        throw new Error('Enrollment for this training programme has closed (deadline passed).')
      }
    }

    // 4. Validate duplicate enrollment
    const { data: existingEnrollment, error: dupCheckErr } = await supabase
      .from('enrollments')
      .select('id')
      .eq('trainee_id', userId)
      .eq('training_programme_id', programmeId)
      .maybeSingle()

    if (dupCheckErr) {
      console.warn('[enrollInProgramme] Warning during duplicate check:', dupCheckErr)
    }

    if (existingEnrollment) {
      throw new Error('You are already enrolled in this programme.')
    }

    // 5. Validate capacity (check current active enrollments)
    if (programme.capacity && programme.capacity > 0) {
      const { count: currentCount, error: countErr } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('training_programme_id', programmeId)

      if (!countErr && currentCount !== null && currentCount >= programme.capacity) {
        throw new Error('This programme is now full. Please try another programme.')
      }
    }

    // 6. Perform INSERT into public.enrollments
    const insertPayload = {
      trainee_id: userId,
      training_programme_id: programmeId,
      status: 'enrolled',
    }

    console.log('[enrollInProgramme] Inserting enrollment:', insertPayload)

    const { data: enrolledRecord, error: insertErr } = await supabase
      .from('enrollments')
      .insert(insertPayload)
      .select()
      .single()

    if (insertErr) {
      console.error('[enrollInProgramme] Supabase insert error:', {
        table: 'enrollments',
        operation: 'INSERT',
        userId,
        programmeId,
        code: insertErr.code,
        message: insertErr.message,
        details: insertErr.details,
        hint: insertErr.hint,
      })

      // Check unique constraint violation (duplicate enrollment race condition)
      if (insertErr.code === '23505') {
        throw new Error('You are already enrolled in this programme.')
      }

      throw insertErr
    }

    console.log('[enrollInProgramme] Successfully enrolled trainee in programme:', enrolledRecord)
    return {
      success: true,
      data: enrolledRecord,
    }
  } catch (err) {
    console.error('[enrollInProgramme] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unable to enroll in this programme.',
    }
  }
}
