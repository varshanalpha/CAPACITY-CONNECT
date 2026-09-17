import { supabase } from '../lib/supabaseClient'

/**
 * Valid assessment lifecycle statuses
 */
export const ASSESSMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
}

/**
 * Valid assessment attempt statuses
 */
export const ATTEMPT_STATUS = {
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
}

/**
 * Helper to log and format errors with full technical details
 * (code, message, details, hint).
 */
function extractError(err, defaultMsg = 'An unexpected error occurred.') {
  if (!err) return { message: defaultMsg, code: null, details: null, hint: null }
  if (typeof err === 'string') return { message: err, code: null, details: null, hint: null }

  const message = err.message || (err instanceof Error ? err.message : defaultMsg)
  return {
    message,
    code: err.code || null,
    details: err.details || null,
    hint: err.hint || null,
  }
}

function logServiceError(context, err) {
  console.error(`[assessmentService] ${context}:`, {
    message: err?.message,
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
    raw: err,
  })
}

// ==========================================
// TRAINER / GENERAL ASSESSMENT SERVICES
// ==========================================

/**
 * Fetches all assessments belonging to a specific training programme.
 * Calculates question counts and total marks for each assessment.
 *
 * @param {string} programmeId - UUID of the training programme
 */
export async function getProgrammeAssessments(programmeId) {
  try {
    if (!programmeId) throw new Error('Training Programme ID is required.')

    console.log(`[assessmentService] Fetching assessments for programme: ${programmeId}`)

    // 1. Fetch assessments
    const { data: assessments, error: assessErr } = await supabase
      .from('assessments')
      .select(`
        id,
        training_programme_id,
        created_by,
        title,
        description,
        deadline,
        status,
        created_at,
        updated_at
      `)
      .eq('training_programme_id', programmeId)
      .order('created_at', { ascending: false })

    if (assessErr) {
      logServiceError('Error fetching assessments', assessErr)
      throw assessErr
    }

    const rawAssessments = assessments || []
    if (rawAssessments.length === 0) {
      return { success: true, data: [] }
    }

    const assessmentIds = rawAssessments.map((a) => a.id)

    // 2. Fetch question aggregates
    const { data: questions, error: qErr } = await supabase
      .from('assessment_questions')
      .select('id, assessment_id, marks')
      .in('assessment_id', assessmentIds)

    if (qErr) {
      console.warn('[assessmentService] Warning fetching questions for count calculation:', qErr)
    }

    const countMap = {}
    const marksMap = {}

    ;(questions || []).forEach((q) => {
      const aId = q.assessment_id
      countMap[aId] = (countMap[aId] || 0) + 1
      marksMap[aId] = (marksMap[aId] || 0) + (Number(q.marks) || 1)
    })

    const assessmentsWithStats = rawAssessments.map((a) => ({
      ...a,
      question_count: countMap[a.id] || 0,
      total_marks: marksMap[a.id] || 0,
    }))

    return {
      success: true,
      data: assessmentsWithStats,
    }
  } catch (err) {
    logServiceError('Error in getProgrammeAssessments', err)
    const errObj = extractError(err, 'Failed to load assessments.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: [],
    }
  }
}

/**
 * Fetches a single assessment by its ID, joined with its training programme info.
 *
 * @param {string} assessmentId - Assessment UUID
 */
export async function getAssessmentById(assessmentId) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')

    console.log(`[assessmentService] Fetching assessment details for: ${assessmentId}`)

    const { data: assessment, error } = await supabase
      .from('assessments')
      .select(`
        id,
        training_programme_id,
        created_by,
        title,
        description,
        deadline,
        status,
        created_at,
        updated_at,
        training_programme:training_programmes (
          id,
          title,
          description,
          trainer_id,
          status,
          start_date,
          end_date
        )
      `)
      .eq('id', assessmentId)
      .maybeSingle()

    if (error) {
      logServiceError('Supabase error fetching assessment', error)
      throw error
    }

    if (!assessment) {
      throw new Error('Assessment not found.')
    }

    return {
      success: true,
      data: assessment,
    }
  } catch (err) {
    logServiceError('Error in getAssessmentById', err)
    const errObj = extractError(err, 'Failed to load assessment details.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: null,
    }
  }
}

/**
 * Creates a new assessment in public.assessments in 'draft' status.
 *
 * @param {Object} data
 * @param {string} data.programmeId - Programme UUID (Required)
 * @param {string} data.title - Assessment Title (Required)
 * @param {string} [data.description]
 * @param {string} [data.deadline] - Optional ISO date string
 * @param {string} data.userId - Authenticated user UUID (Required)
 */
export async function createAssessment({ programmeId, title, description, deadline, userId }) {
  try {
    if (!programmeId) throw new Error('Training Programme ID is required.')
    if (!userId) throw new Error('Authentication required: User ID is missing.')
    if (!title?.trim()) throw new Error('Assessment title is required.')

    // Validate deadline if provided
    let formattedDeadline = null
    if (deadline && deadline.trim()) {
      const deadlineDate = new Date(deadline)
      if (isNaN(deadlineDate.getTime())) {
        throw new Error('Invalid deadline date format.')
      }
      formattedDeadline = deadlineDate.toISOString()
    }

    const payload = {
      training_programme_id: programmeId,
      created_by: userId,
      title: title.trim(),
      description: description?.trim() || null,
      deadline: formattedDeadline,
      status: ASSESSMENT_STATUS.DRAFT,
    }

    console.log('[assessmentService] Creating assessment:', payload)

    const { data, error } = await supabase
      .from('assessments')
      .insert(payload)
      .select()
      .single()

    if (error) {
      logServiceError('Database error creating assessment', error)
      throw error
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    logServiceError('Error in createAssessment', err)
    const errObj = extractError(err, 'Failed to create assessment.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: null,
    }
  }
}

/**
 * Updates an assessment's metadata (title, description, deadline).
 * Note: public.assessments contains updated_at.
 *
 * @param {string} assessmentId - Assessment UUID
 * @param {Object} data
 */
export async function updateAssessment(assessmentId, { title, description, deadline }) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')
    if (!title?.trim()) throw new Error('Assessment title is required.')

    let formattedDeadline = null
    if (deadline && deadline.trim()) {
      const deadlineDate = new Date(deadline)
      if (isNaN(deadlineDate.getTime())) {
        throw new Error('Invalid deadline date format.')
      }
      formattedDeadline = deadlineDate.toISOString()
    }

    const payload = {
      title: title.trim(),
      description: description?.trim() || null,
      deadline: formattedDeadline,
      updated_at: new Date().toISOString(),
    }

    console.log(`[assessmentService] Updating assessment ${assessmentId}:`, payload)

    const { data, error } = await supabase
      .from('assessments')
      .update(payload)
      .eq('id', assessmentId)
      .select()
      .single()

    if (error) {
      logServiceError('Database error updating assessment', error)
      throw error
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    logServiceError('Error in updateAssessment', err)
    const errObj = extractError(err, 'Failed to update assessment.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: null,
    }
  }
}

/**
 * Deletes an assessment and its associated questions.
 *
 * @param {string} assessmentId - Assessment UUID
 */
export async function deleteAssessment(assessmentId) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')

    console.log(`[assessmentService] Deleting assessment: ${assessmentId}`)

    // 1. Delete questions first (or cascade)
    const { error: qErr } = await supabase
      .from('assessment_questions')
      .delete()
      .eq('assessment_id', assessmentId)

    if (qErr) {
      console.warn('[assessmentService] Warning deleting associated questions:', qErr)
    }

    // 2. Delete assessment row
    const { error: assessErr } = await supabase
      .from('assessments')
      .delete()
      .eq('id', assessmentId)

    if (assessErr) {
      logServiceError('Error deleting assessment', assessErr)
      throw assessErr
    }

    return { success: true }
  } catch (err) {
    logServiceError('Error in deleteAssessment', err)
    const errObj = extractError(err, 'Failed to delete assessment.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
    }
  }
}

/**
 * Publishes an assessment after validating all questions and metadata.
 *
 * Validation rules:
 * - Title exists
 * - At least one question exists
 * - Every question has 4 options (A, B, C, D) and a valid correct_option
 * - Marks are positive numbers (> 0)
 *
 * @param {string} assessmentId - Assessment UUID
 */
export async function publishAssessment(assessmentId) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')

    console.log(`[assessmentService] Validating and publishing assessment: ${assessmentId}`)

    // 1. Fetch assessment
    const { data: assessment, error: assessErr } = await supabase
      .from('assessments')
      .select('id, title, status')
      .eq('id', assessmentId)
      .single()

    if (assessErr || !assessment) {
      throw new Error('Assessment not found.')
    }

    if (!assessment.title?.trim()) {
      throw new Error('Assessment must have a valid title.')
    }

    // 2. Fetch questions
    const { data: questions, error: qErr } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('question_order', { ascending: true })

    if (qErr) {
      logServiceError('Error fetching questions for publish verification', qErr)
      throw new Error('Could not verify assessment questions.')
    }

    if (!questions || questions.length === 0) {
      throw new Error('Cannot publish an assessment with zero questions. Please add at least one question.')
    }

    // 3. Validate every question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const qNum = i + 1

      if (!q.question_text?.trim()) {
        throw new Error(`Question #${qNum} is missing question text.`)
      }
      if (!q.option_a?.trim()) {
        throw new Error(`Question #${qNum} is missing Option A.`)
      }
      if (!q.option_b?.trim()) {
        throw new Error(`Question #${qNum} is missing Option B.`)
      }
      if (!q.option_c?.trim()) {
        throw new Error(`Question #${qNum} is missing Option C.`)
      }
      if (!q.option_d?.trim()) {
        throw new Error(`Question #${qNum} is missing Option D.`)
      }
      if (!q.correct_option || !['A', 'B', 'C', 'D'].includes(q.correct_option.toUpperCase())) {
        throw new Error(`Question #${qNum} must have a designated correct option (A, B, C, or D).`)
      }
      if (!q.marks || Number(q.marks) <= 0) {
        throw new Error(`Question #${qNum} must have positive marks (> 0).`)
      }
    }

    // 4. Update status to 'published'
    const { data: updatedData, error: updateErr } = await supabase
      .from('assessments')
      .update({
        status: ASSESSMENT_STATUS.PUBLISHED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)
      .select()
      .single()

    if (updateErr) {
      logServiceError('Error updating assessment status to published', updateErr)
      throw updateErr
    }

    console.log(`[assessmentService] Assessment ${assessmentId} successfully published.`)
    return {
      success: true,
      data: updatedData,
    }
  } catch (err) {
    logServiceError('Error in publishAssessment', err)
    const errObj = extractError(err, 'Failed to publish assessment.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
    }
  }
}

/**
 * Closes a published assessment (sets status to 'closed').
 *
 * @param {string} assessmentId - Assessment UUID
 */
export async function closeAssessment(assessmentId) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')

    console.log(`[assessmentService] Closing assessment: ${assessmentId}`)

    const { data, error } = await supabase
      .from('assessments')
      .update({
        status: ASSESSMENT_STATUS.CLOSED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)
      .select()
      .single()

    if (error) {
      logServiceError('Error closing assessment', error)
      throw error
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    logServiceError('Error in closeAssessment', err)
    const errObj = extractError(err, 'Failed to close assessment.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
    }
  }
}

/**
 * Fetches all questions for an assessment ordered by question_order ASC.
 * NOTE: For trainer / authoring purposes.
 *
 * @param {string} assessmentId - Assessment UUID
 */
export async function getAssessmentQuestions(assessmentId) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')

    console.log(`[assessmentService] Fetching questions for assessment: ${assessmentId}`)

    const { data, error } = await supabase
      .from('assessment_questions')
      .select(`
        id,
        assessment_id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        marks,
        question_order,
        created_at
      `)
      .eq('assessment_id', assessmentId)
      .order('question_order', { ascending: true })

    if (error) {
      logServiceError('Error fetching questions', error)
      throw error
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (err) {
    logServiceError('Error in getAssessmentQuestions', err)
    const errObj = extractError(err, 'Failed to load questions.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: [],
    }
  }
}

/**
 * Adds a new MCQ question to an assessment.
 * Automatically computes question_order (1, 2, 3...).
 *
 * @param {string} assessmentId
 * @param {Object} questionData
 * @param {string} questionData.question_text
 * @param {string} questionData.option_a
 * @param {string} questionData.option_b
 * @param {string} questionData.option_c
 * @param {string} questionData.option_d
 * @param {string} questionData.correct_option - 'A' | 'B' | 'C' | 'D'
 * @param {number} [questionData.marks=1]
 */
export async function createAssessmentQuestion(assessmentId, questionData) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')

    const text = questionData.question_text?.trim()
    const optA = questionData.option_a?.trim()
    const optB = questionData.option_b?.trim()
    const optC = questionData.option_c?.trim()
    const optD = questionData.option_d?.trim()
    const correct = (questionData.correct_option || '').toUpperCase()
    const marks = Number(questionData.marks) || 1

    if (!text) throw new Error('Question text is required.')
    if (!optA) throw new Error('Option A is required.')
    if (!optB) throw new Error('Option B is required.')
    if (!optC) throw new Error('Option C is required.')
    if (!optD) throw new Error('Option D is required.')
    if (!['A', 'B', 'C', 'D'].includes(correct)) {
      throw new Error('Correct option must be A, B, C, or D.')
    }
    if (marks <= 0) {
      throw new Error('Marks must be a positive number greater than 0.')
    }

    // 1. Calculate next question_order
    const { data: existingQuestions, error: fetchErr } = await supabase
      .from('assessment_questions')
      .select('question_order')
      .eq('assessment_id', assessmentId)
      .order('question_order', { ascending: false })
      .limit(1)

    if (fetchErr) {
      console.warn('[assessmentService] Warning calculating question_order:', fetchErr)
    }

    const nextOrder = existingQuestions && existingQuestions.length > 0
      ? (existingQuestions[0].question_order || 0) + 1
      : 1

    const payload = {
      assessment_id: assessmentId,
      question_text: text,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_option: correct,
      marks: marks,
      question_order: nextOrder,
    }

    console.log('[assessmentService] Inserting question:', payload)

    const { data, error } = await supabase
      .from('assessment_questions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      logServiceError('Error inserting question', error)
      throw error
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    logServiceError('Error in createAssessmentQuestion', err)
    const errObj = extractError(err, 'Failed to add question.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: null,
    }
  }
}

/**
 * Updates an existing MCQ question.
 * NOTE: Does NOT include updated_at because public.assessment_questions table
 * does not have that column.
 *
 * @param {string} questionId
 * @param {Object} questionData
 */
export async function updateAssessmentQuestion(questionId, questionData) {
  try {
    if (!questionId) throw new Error('Question ID is required.')

    const text = questionData.question_text?.trim()
    const optA = questionData.option_a?.trim()
    const optB = questionData.option_b?.trim()
    const optC = questionData.option_c?.trim()
    const optD = questionData.option_d?.trim()
    const correct = (questionData.correct_option || '').toUpperCase()
    const marks = Number(questionData.marks) || 1

    if (!text) throw new Error('Question text is required.')
    if (!optA) throw new Error('Option A is required.')
    if (!optB) throw new Error('Option B is required.')
    if (!optC) throw new Error('Option C is required.')
    if (!optD) throw new Error('Option D is required.')
    if (!['A', 'B', 'C', 'D'].includes(correct)) {
      throw new Error('Correct option must be A, B, C, or D.')
    }
    if (marks <= 0) {
      throw new Error('Marks must be a positive number greater than 0.')
    }

    const payload = {
      question_text: text,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_option: correct,
      marks: marks,
    }

    console.log(`[assessmentService] Updating question ${questionId}:`, payload)

    const { data, error } = await supabase
      .from('assessment_questions')
      .update(payload)
      .eq('id', questionId)
      .select()
      .single()

    if (error) {
      logServiceError('Error updating question', error)
      throw error
    }

    return {
      success: true,
      data,
    }
  } catch (err) {
    logServiceError('Error in updateAssessmentQuestion', err)
    const errObj = extractError(err, 'Failed to update question.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: null,
    }
  }
}

/**
 * Deletes a question and re-sequences the question_order for remaining questions.
 *
 * @param {string} questionId - Question UUID
 * @param {string} assessmentId - Assessment UUID
 */
export async function deleteAssessmentQuestion(questionId, assessmentId) {
  try {
    if (!questionId) throw new Error('Question ID is required.')
    if (!assessmentId) throw new Error('Assessment ID is required.')

    console.log(`[assessmentService] Deleting question ${questionId} from assessment ${assessmentId}`)

    // 1. Delete question
    const { error: delErr } = await supabase
      .from('assessment_questions')
      .delete()
      .eq('id', questionId)

    if (delErr) {
      logServiceError('Error deleting question', delErr)
      throw delErr
    }

    // 2. Fetch remaining questions and re-index question_order (1, 2, 3...)
    const { data: remainingQuestions, error: fetchErr } = await supabase
      .from('assessment_questions')
      .select('id, question_order')
      .eq('assessment_id', assessmentId)
      .order('question_order', { ascending: true })

    if (!fetchErr && remainingQuestions && remainingQuestions.length > 0) {
      // Re-assign sequential order
      for (let i = 0; i < remainingQuestions.length; i++) {
        const q = remainingQuestions[i]
        const expectedOrder = i + 1
        if (q.question_order !== expectedOrder) {
          const { error: updateOrderErr } = await supabase
            .from('assessment_questions')
            .update({ question_order: expectedOrder })
            .eq('id', q.id)

          if (updateOrderErr) {
            logServiceError('Warning updating question order after deletion', updateOrderErr)
          }
        }
      }
    }

    return { success: true }
  } catch (err) {
    logServiceError('Error in deleteAssessmentQuestion', err)
    const errObj = extractError(err, 'Failed to delete question.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
    }
  }
}

// ==========================================
// TRAINEE ASSESSMENT TAKING SERVICES
// ==========================================

/**
 * Fetches published assessments for a training programme from a trainee's perspective.
 * Joins question counts, total marks, and the trainee's attempt status if one exists.
 *
 * @param {string} programmeId - Training programme UUID
 * @param {string} traineeId - Authenticated trainee user UUID
 */
export async function getTraineeProgrammeAssessments(programmeId, traineeId) {
  try {
    if (!programmeId) throw new Error('Training Programme ID is required.')
    if (!traineeId) throw new Error('Trainee authentication ID is required.')

    console.log(`[assessmentService] Fetching trainee assessments for programme ${programmeId}, trainee ${traineeId}`)

    // 1. Fetch only published assessments for this programme
    const { data: assessments, error: assessErr } = await supabase
      .from('assessments')
      .select(`
        id,
        training_programme_id,
        title,
        description,
        deadline,
        status,
        created_at,
        updated_at
      `)
      .eq('training_programme_id', programmeId)
      .eq('status', ASSESSMENT_STATUS.PUBLISHED)
      .order('deadline', { ascending: true, nullsFirst: false })

    if (assessErr) {
      logServiceError('Error fetching published assessments for trainee', assessErr)
      throw assessErr
    }

    const rawAssessments = assessments || []
    if (rawAssessments.length === 0) {
      return { success: true, data: [] }
    }

    const assessmentIds = rawAssessments.map((a) => a.id)

    // 2. Fetch existing attempts for this trainee
    const { data: attempts, error: attemptErr } = await supabase
      .from('assessment_attempts')
      .select(`
        id,
        assessment_id,
        trainee_id,
        status,
        started_at,
        submitted_at,
        total_marks,
        obtained_marks,
        created_at,
        updated_at
      `)
      .eq('trainee_id', traineeId)
      .in('assessment_id', assessmentIds)

    if (attemptErr) {
      console.warn('[assessmentService] Warning fetching trainee attempts:', attemptErr)
    }

    const attemptMap = {}
    ;(attempts || []).forEach((att) => {
      attemptMap[att.assessment_id] = att
    })

    // 3. For each assessment, fetch safe questions via RPC to calculate question count and total marks
    const decoratedAssessments = await Promise.all(
      rawAssessments.map(async (a) => {
        const qRes = await getTraineeAssessmentQuestions(a.id)
        const qList = qRes.success ? (qRes.data || []) : []
        const count = qList.length
        const totalMarks = qList.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)

        return {
          ...a,
          question_count: count,
          total_marks: totalMarks,
          attempt: attemptMap[a.id] || null,
        }
      })
    )

    return {
      success: true,
      data: decoratedAssessments,
    }
  } catch (err) {
    logServiceError('Error in getTraineeProgrammeAssessments', err)
    const errObj = extractError(err, 'Failed to load programme assessments.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: [],
    }
  }
}

/**
 * Fetches assessment details for a trainee, including programme info and existing attempt.
 *
 * @param {string} assessmentId - Assessment UUID
 * @param {string} traineeId - Authenticated trainee user UUID
 */
export async function getTraineeAssessmentDetails(assessmentId, traineeId) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')
    if (!traineeId) throw new Error('Trainee ID is required.')

    console.log(`[assessmentService] Fetching trainee assessment details for ${assessmentId}`)

    // 1. Fetch assessment
    const { data: assessment, error: assessErr } = await supabase
      .from('assessments')
      .select(`
        id,
        training_programme_id,
        title,
        description,
        deadline,
        status,
        created_at,
        updated_at,
        training_programme:training_programmes (
          id,
          title,
          description,
          status,
          start_date,
          end_date
        )
      `)
      .eq('id', assessmentId)
      .maybeSingle()

    if (assessErr) {
      logServiceError('Error fetching trainee assessment', assessErr)
      throw assessErr
    }

    if (!assessment) {
      throw new Error('Assessment not found or not accessible.')
    }

    // 2. Fetch questions via secure RPC to compute actual count & marks
    const qRes = await getTraineeAssessmentQuestions(assessmentId)
    const questions = qRes.success ? (qRes.data || []) : []
    const questionCount = questions.length
    const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)

    // 3. Fetch existing attempt for trainee
    const { data: attempt, error: attemptErr } = await supabase
      .from('assessment_attempts')
      .select(`
        id,
        assessment_id,
        trainee_id,
        status,
        started_at,
        submitted_at,
        total_marks,
        obtained_marks,
        created_at,
        updated_at
      `)
      .eq('assessment_id', assessmentId)
      .eq('trainee_id', traineeId)
      .maybeSingle()

    if (attemptErr) {
      console.warn('[assessmentService] Warning fetching attempt:', attemptErr)
    }

    return {
      success: true,
      data: {
        ...assessment,
        question_count: questionCount,
        total_marks: totalMarks,
        attempt: attempt || null,
        questions,
      },
    }
  } catch (err) {
    logServiceError('Error in getTraineeAssessmentDetails', err)
    const errObj = extractError(err, 'Failed to load assessment details.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: null,
    }
  }
}

/**
 * Starts an assessment attempt for an authenticated trainee.
 * Handles the UNIQUE(assessment_id, trainee_id) constraint gracefully by returning
 * an existing attempt if one is already present.
 *
 * @param {Object} params
 * @param {string} params.assessmentId - Assessment UUID
 * @param {string} params.traineeId - Authenticated trainee user UUID
 * @param {number} [params.totalMarks=0] - Total marks of the assessment
 */
export async function startTraineeAssessment({ assessmentId, traineeId, totalMarks = 0 }) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')
    if (!traineeId) throw new Error('Trainee ID is required.')

    console.log(`[assessmentService] Starting assessment attempt for ${assessmentId}, trainee ${traineeId}`)

    // 1. Check for existing attempt first
    const { data: existingAttempt, error: checkErr } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('trainee_id', traineeId)
      .maybeSingle()

    if (existingAttempt) {
      console.log('[assessmentService] Existing attempt found, resuming:', existingAttempt.id)
      return {
        success: true,
        data: existingAttempt,
        resumed: true,
      }
    }

    // 2. Insert new attempt
    const payload = {
      assessment_id: assessmentId,
      trainee_id: traineeId,
      status: ATTEMPT_STATUS.IN_PROGRESS,
      started_at: new Date().toISOString(),
      total_marks: totalMarks || 0,
    }

    const { data: newAttempt, error: insertErr } = await supabase
      .from('assessment_attempts')
      .insert(payload)
      .select()
      .single()

    if (insertErr) {
      // If a race condition caused a unique constraint violation, recover by fetching
      if (insertErr.code === '23505') {
        const { data: recoveredAttempt } = await supabase
          .from('assessment_attempts')
          .select('*')
          .eq('assessment_id', assessmentId)
          .eq('trainee_id', traineeId)
          .maybeSingle()

        if (recoveredAttempt) {
          return {
            success: true,
            data: recoveredAttempt,
            resumed: true,
          }
        }
      }
      logServiceError('Error creating assessment attempt', insertErr)
      throw insertErr
    }

    return {
      success: true,
      data: newAttempt,
      resumed: false,
    }
  } catch (err) {
    logServiceError('Error in startTraineeAssessment', err)
    const errObj = extractError(err, 'Failed to start assessment.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: null,
    }
  }
}

/**
 * Loads assessment questions for a TRAINEE via the secure RPC function.
 *
 * CRITICAL SECURITY:
 * Never requests or exposes `correct_option`.
 * RPC only returns: id, assessment_id, question_text, option_a, option_b, option_c, option_d, marks, question_order.
 *
 * @param {string} assessmentId - Assessment UUID
 */
export async function getTraineeAssessmentQuestions(assessmentId) {
  try {
    if (!assessmentId) throw new Error('Assessment ID is required.')

    console.log(`[assessmentService] Loading questions for trainee via RPC on assessment: ${assessmentId}`)

    const { data, error } = await supabase.rpc('get_trainee_assessment_questions', {
      p_assessment_id: assessmentId,
    })

    if (error) {
      logServiceError('Error loading questions for trainee via RPC', error)
      throw error
    }

    const sortedQuestions = (data || []).sort((a, b) => (a.question_order || 0) - (b.question_order || 0))

    return {
      success: true,
      data: sortedQuestions,
    }
  } catch (err) {
    logServiceError('Error in getTraineeAssessmentQuestions', err)
    const errObj = extractError(err, 'Failed to load assessment questions.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: [],
    }
  }
}

/**
 * Fetches all answers previously saved for an attempt.
 *
 * @param {string} attemptId - Attempt UUID
 */
export async function getAttemptAnswers(attemptId) {
  try {
    if (!attemptId) throw new Error('Attempt ID is required.')

    console.log(`[assessmentService] Fetching saved answers for attempt: ${attemptId}`)

    const { data, error } = await supabase
      .from('assessment_answers')
      .select(`
        id,
        attempt_id,
        question_id,
        selected_option,
        created_at,
        updated_at
      `)
      .eq('attempt_id', attemptId)

    if (error) {
      logServiceError('Error fetching attempt answers', error)
      throw error
    }

    const answersMap = {}
    ;(data || []).forEach((ans) => {
      answersMap[ans.question_id] = ans.selected_option
    })

    return {
      success: true,
      data: data || [],
      answersMap,
    }
  } catch (err) {
    logServiceError('Error in getAttemptAnswers', err)
    const errObj = extractError(err, 'Failed to load saved answers.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: [],
      answersMap: {},
    }
  }
}

/**
 * Saves or updates a trainee's selected answer for a specific question.
 * Enforces UNIQUE (attempt_id, question_id) via check-then-update / upsert.
 *
 * @param {Object} params
 * @param {string} params.attemptId - Attempt UUID
 * @param {string} params.questionId - Question UUID
 * @param {string} params.selectedOption - 'A' | 'B' | 'C' | 'D'
 */
export async function saveAssessmentAnswer({ attemptId, questionId, selectedOption }) {
  try {
    if (!attemptId) throw new Error('Attempt ID is required.')
    if (!questionId) throw new Error('Question ID is required.')
    if (!selectedOption || !['A', 'B', 'C', 'D'].includes(selectedOption.toUpperCase())) {
      throw new Error('Valid option (A, B, C, or D) is required.')
    }

    const option = selectedOption.toUpperCase()

    // 1. Check if answer already exists
    const { data: existing, error: checkErr } = await supabase
      .from('assessment_answers')
      .select('id')
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .maybeSingle()

    if (checkErr) {
      console.warn('[assessmentService] Warning checking existing answer:', checkErr)
    }

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('assessment_answers')
        .update({
          selected_option: option,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        logServiceError('Error updating answer', error)
        throw error
      }

      return { success: true, data }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('assessment_answers')
        .insert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_option: option,
        })
        .select()
        .single()

      if (error) {
        logServiceError('Error inserting answer', error)
        throw error
      }

      return { success: true, data }
    }
  } catch (err) {
    logServiceError('Error in saveAssessmentAnswer', err)
    const errObj = extractError(err, 'Failed to save answer.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: null,
    }
  }
}

/**
 * Submits a trainee assessment attempt, transitioning status to 'submitted'.
 *
 * @param {string} attemptId - Attempt UUID
 */
export async function submitTraineeAssessment(attemptId) {
  try {
    if (!attemptId) throw new Error('Attempt ID is required.')

    console.log(`[assessmentService] Submitting attempt: ${attemptId}`)

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('assessment_attempts')
      .update({
        status: ATTEMPT_STATUS.SUBMITTED,
        submitted_at: now,
        updated_at: now,
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (error) {
      logServiceError('Error submitting assessment attempt', error)
      throw error
    }

    console.log(`[assessmentService] Attempt ${attemptId} successfully submitted at ${now}`)

    return {
      success: true,
      data,
    }
  } catch (err) {
    logServiceError('Error in submitTraineeAssessment', err)
    const errObj = extractError(err, 'Failed to submit assessment.')
    return {
      success: false,
      error: errObj.message,
      code: errObj.code,
      details: errObj.details,
      hint: errObj.hint,
      data: null,
    }
  }
}
