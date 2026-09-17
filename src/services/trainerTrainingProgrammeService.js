import { supabase } from '../lib/supabaseClient'

/**
 * Valid enrollment statuses that count towards active programme participation
 */
export const VALID_ENROLLMENT_STATUSES = ['enrolled', 'active', 'completed']

/**
 * Fetches all training programmes assigned to the authenticated trainer with calculated active enrollment counts.
 *
 * Query filters:
 * - training_programmes.trainer_id = trainerId (auth.uid())
 *
 * Safe select fields on training_programmes:
 * id, title, description, objectives, start_date, end_date, enrollment_deadline, capacity, status, trainer_id, created_at
 *
 * @param {string} trainerId - Authenticated trainer's user ID (auth.uid())
 */
export async function getTrainerAssignedProgrammes(trainerId) {
  try {
    if (!trainerId) throw new Error('Trainer ID is required.')

    console.log(`[trainerService] Fetching assigned programmes for trainer: ${trainerId}`)

    // 1. Fetch training programmes assigned to the trainer
    const { data: programmes, error: progErr } = await supabase
      .from('training_programmes')
      .select(`
        id,
        title,
        description,
        objectives,
        start_date,
        end_date,
        enrollment_deadline,
        capacity,
        status,
        trainer_id,
        created_at
      `)
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })

    if (progErr) {
      console.error('[trainerService] Error fetching training programmes:', {
        table: 'training_programmes',
        trainerId,
        code: progErr.code,
        message: progErr.message,
        details: progErr.details,
      })
      throw progErr
    }

    const rawProgrammes = programmes || []

    if (rawProgrammes.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    const programmeIds = rawProgrammes.map((p) => p.id)

    // 2. Fetch all enrollments, learning resources, and assessments for these programmes to calculate counts
    const [enrollmentsRes, resourcesRes, assessmentsRes] = await Promise.all([
      supabase
        .from('enrollments')
        .select('id, training_programme_id, status')
        .in('training_programme_id', programmeIds)
        .in('status', VALID_ENROLLMENT_STATUSES),
      supabase
        .from('learning_resources')
        .select('id, training_programme_id')
        .in('training_programme_id', programmeIds),
      supabase
        .from('assessments')
        .select('id, training_programme_id')
        .in('training_programme_id', programmeIds),
    ])

    if (enrollmentsRes.error) {
      console.warn('[trainerService] Warning fetching enrollments for count calculation:', enrollmentsRes.error)
    }
    if (resourcesRes.error) {
      console.warn('[trainerService] Warning fetching learning resources for count calculation:', resourcesRes.error)
    }
    if (assessmentsRes.error) {
      console.warn('[trainerService] Warning fetching assessments for count calculation:', assessmentsRes.error)
    }

    // 3. Aggregate counts by programme ID
    const enrollmentCountMap = {}
    ;(enrollmentsRes.data || []).forEach((enr) => {
      const pId = enr.training_programme_id
      enrollmentCountMap[pId] = (enrollmentCountMap[pId] || 0) + 1
    })

    const resourceCountMap = {}
    ;(resourcesRes.data || []).forEach((res) => {
      const pId = res.training_programme_id
      resourceCountMap[pId] = (resourceCountMap[pId] || 0) + 1
    })

    const assessmentCountMap = {}
    ;(assessmentsRes.data || []).forEach((a) => {
      const pId = a.training_programme_id
      assessmentCountMap[pId] = (assessmentCountMap[pId] || 0) + 1
    })

    // 4. Attach calculated counts to each programme
    const programmesWithCounts = rawProgrammes.map((p) => ({
      ...p,
      enrolled_count: enrollmentCountMap[p.id] || 0,
      resource_count: resourceCountMap[p.id] || 0,
      assessment_count: assessmentCountMap[p.id] || 0,
    }))

    console.log(`[trainerService] Successfully loaded ${programmesWithCounts.length} assigned programmes with counts`)
    return {
      success: true,
      data: programmesWithCounts,
    }
  } catch (err) {
    console.error('[trainerService] Catch block error in getTrainerAssignedProgrammes:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch assigned training programmes.',
      data: [],
    }
  }
}

/**
 * Fetches enrolled trainees and their profile details for a specific programme assigned to the trainer.
 *
 * Security & Integrity rules:
 * 1. Validates that the requested programme belongs to the trainer (trainer_id = trainerId).
 * 2. Fetches enrollment records for the programme:
 *    enrollments.training_programme_id = programmeId
 * 3. Fetches trainee profiles from public.profiles using safe fields:
 *    id, full_name, email, department, designation, role, status
 *    (Does NOT use select('*')).
 *
 * @param {string} programmeId - UUID of the training programme
 * @param {string} trainerId - Authenticated trainer's user ID (auth.uid())
 */
export async function getEnrolledTraineesForProgramme(programmeId, trainerId) {
  try {
    if (!programmeId) throw new Error('Training Programme ID is required.')
    if (!trainerId) throw new Error('Trainer ID is required.')

    console.log(`[trainerService] Fetching enrolled trainees for programme: ${programmeId}, trainer: ${trainerId}`)

    // 1. Verify programme ownership / assignment
    const { data: programme, error: progCheckErr } = await supabase
      .from('training_programmes')
      .select(`
        id,
        title,
        description,
        objectives,
        start_date,
        end_date,
        enrollment_deadline,
        capacity,
        status,
        trainer_id,
        created_at
      `)
      .eq('id', programmeId)
      .eq('trainer_id', trainerId)
      .maybeSingle()

    if (progCheckErr) {
      console.error('[trainerService] Error checking programme ownership:', progCheckErr)
      throw progCheckErr
    }

    if (!programme) {
      throw new Error('Training programme not found or you are not authorized to view its trainees.')
    }

    // 2. Fetch enrollment records for this programme
    const { data: enrollments, error: enrollErr } = await supabase
      .from('enrollments')
      .select('id, trainee_id, training_programme_id, status, enrolled_at, updated_at')
      .eq('training_programme_id', programmeId)
      .order('enrolled_at', { ascending: false })

    if (enrollErr) {
      console.error('[trainerService] Error fetching programme enrollments:', enrollErr)
      throw enrollErr
    }

    const rawEnrollments = enrollments || []

    if (rawEnrollments.length === 0) {
      return {
        success: true,
        data: {
          programme,
          enrolledTrainees: [],
          activeCount: 0,
          totalCount: 0,
        },
      }
    }

    // 3. Extract unique trainee IDs
    const traineeIds = [...new Set(rawEnrollments.map((enr) => enr.trainee_id).filter(Boolean))]

    let profileMap = {}

    if (traineeIds.length > 0) {
      // 4. Fetch trainee profiles using ONLY safe fields
      const { data: traineeProfiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, designation, role, status')
        .in('id', traineeIds)

      if (profileErr) {
        console.error('[trainerService] Error fetching trainee profiles:', profileErr)
        throw profileErr
      }

      profileMap = Object.fromEntries(
        (traineeProfiles || []).map((prof) => [prof.id, prof])
      )
    }

    // 5. Combine enrollment and profile records
    let activeCount = 0
    const enrolledTrainees = rawEnrollments.map((enr) => {
      const isCountable = VALID_ENROLLMENT_STATUSES.includes((enr.status || '').toLowerCase())
      if (isCountable) {
        activeCount += 1
      }

      return {
        id: enr.id,
        trainee_id: enr.trainee_id,
        enrollment_status: enr.status,
        enrolled_at: enr.enrolled_at,
        updated_at: enr.updated_at,
        trainee: profileMap[enr.trainee_id] || {
          id: enr.trainee_id,
          full_name: 'Unknown Trainee',
          email: 'N/A',
          department: 'N/A',
          designation: 'N/A',
          role: 'trainee',
          status: 'N/A',
        },
      }
    })

    return {
      success: true,
      data: {
        programme,
        enrolledTrainees,
        activeCount,
        totalCount: enrolledTrainees.length,
      },
    }
  } catch (err) {
    console.error('[trainerService] Catch block error in getEnrolledTraineesForProgramme:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch enrolled trainees.',
      data: null,
    }
  }
}
