import { supabase } from '../lib/supabaseClient'

/**
 * Valid skill proficiencies
 */
export const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'advanced', label: 'Advanced', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'expert', label: 'Expert', color: 'bg-purple-50 text-purple-700 border-purple-200' },
]

/**
 * Fetches basic profile and extended trainee profile information
 *
 * @param {string} userId
 */
export async function getTraineeProfile(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    // 1. Fetch public.profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) throw profileError

    // 2. Fetch public.trainee_profiles
    const { data: traineeData, error: traineeError } = await supabase
      .from('trainee_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (traineeError) throw traineeError

    return {
      success: true,
      data: {
        profile: profileData || null,
        traineeProfile: traineeData || null,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch trainee profile',
      data: null,
    }
  }
}

/**
 * Updates basic profile and extended trainee profile
 *
 * @param {string} userId
 * @param {Object} payload
 * @param {Object} payload.profileData - Fields for public.profiles (full_name, phone, department, designation)
 * @param {Object} payload.traineeData - Fields for public.trainee_profiles (professional_summary, current_position, interests)
 */
export async function updateTraineeProfile(userId, { profileData = {}, traineeData = {} }) {
  try {
    if (!userId) {
      console.error('[updateTraineeProfile] Error: User ID is required')
      throw new Error('User ID is required')
    }

    console.log('[updateTraineeProfile] Starting profile update for user:', userId)

    // 1. Update public.profiles (strictly only permitted fields: full_name, phone, department, designation)
    // NEVER send role, status, id, or email.
    const profileUpdates = {
      full_name: profileData.full_name?.trim() || null,
      phone: profileData.phone?.trim() || null,
      department: profileData.department?.trim() || null,
      designation: profileData.designation?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    console.log('[updateTraineeProfile] Step 1: Updating public.profiles:', profileUpdates)

    const { data: updatedProfile, error: pError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (pError) {
      console.error('[updateTraineeProfile] public.profiles UPDATE error:', {
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

    console.log('[updateTraineeProfile] Step 1 SUCCESS:', updatedProfile)

    // 2. Parse interests into text[] array for PostgreSQL compatibility
    let parsedInterests = null
    if (Array.isArray(traineeData.interests)) {
      parsedInterests = traineeData.interests.map((i) => String(i).trim()).filter(Boolean)
    } else if (typeof traineeData.interests === 'string' && traineeData.interests.trim()) {
      parsedInterests = traineeData.interests
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean)
    }

    const traineePayload = {
      user_id: userId,
      professional_summary: traineeData.professional_summary?.trim() || null,
      current_position: traineeData.current_position?.trim() || null,
      interests: parsedInterests,
      updated_at: new Date().toISOString(),
    }

    console.log('[updateTraineeProfile] Step 2: Processing public.trainee_profiles payload:', traineePayload)

    // Check if trainee_profiles record exists for user
    const { data: existingTrainee, error: checkErr } = await supabase
      .from('trainee_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (checkErr) {
      console.error('[updateTraineeProfile] public.trainee_profiles SELECT check error:', checkErr)
    }

    let updatedTrainee = null

    if (existingTrainee) {
      console.log('[updateTraineeProfile] Record exists in trainee_profiles. Performing UPDATE.')
      const { data: updateData, error: tUpdateErr } = await supabase
        .from('trainee_profiles')
        .update({
          professional_summary: traineePayload.professional_summary,
          current_position: traineePayload.current_position,
          interests: traineePayload.interests,
          updated_at: traineePayload.updated_at,
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (tUpdateErr) {
        console.error('[updateTraineeProfile] public.trainee_profiles UPDATE error:', {
          table: 'trainee_profiles',
          operation: 'UPDATE',
          code: tUpdateErr.code,
          message: tUpdateErr.message,
          details: tUpdateErr.details,
          hint: tUpdateErr.hint,
          payload: traineePayload,
        })
        throw new Error(`[trainee_profiles UPDATE] ${tUpdateErr.message} (Code: ${tUpdateErr.code})`)
      }
      updatedTrainee = updateData
    } else {
      console.log('[updateTraineeProfile] Record does not exist in trainee_profiles. Performing INSERT.')
      const { data: insertData, error: tInsertErr } = await supabase
        .from('trainee_profiles')
        .insert(traineePayload)
        .select()
        .single()

      if (tInsertErr) {
        console.error('[updateTraineeProfile] public.trainee_profiles INSERT error:', {
          table: 'trainee_profiles',
          operation: 'INSERT',
          code: tInsertErr.code,
          message: tInsertErr.message,
          details: tInsertErr.details,
          hint: tInsertErr.hint,
          payload: traineePayload,
        })
        throw new Error(`[trainee_profiles INSERT] ${tInsertErr.message} (Code: ${tInsertErr.code})`)
      }
      updatedTrainee = insertData
    }

    console.log('[updateTraineeProfile] Step 2 SUCCESS:', updatedTrainee)

    return {
      success: true,
      data: {
        profile: updatedProfile,
        traineeProfile: updatedTrainee,
      },
    }
  } catch (err) {
    console.error('[updateTraineeProfile] Overall failure:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update trainee profile',
    }
  }
}

// ==========================================
// QUALIFICATIONS
// ==========================================

export async function getQualifications(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { data, error } = await supabase
      .from('qualifications')
      .select('*')
      .eq('user_id', userId)
      .order('start_year', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch qualifications',
      data: [],
    }
  }
}

export async function createQualification(userId, qualification) {
  try {
    if (!userId) throw new Error('User ID is required')
    if (!qualification.degree?.trim()) throw new Error('Degree / Certificate name is required')
    if (!qualification.institution?.trim()) throw new Error('Institution name is required')

    const newRecord = {
      user_id: userId,
      degree: qualification.degree.trim(),
      institution: qualification.institution.trim(),
      field_of_study: qualification.field_of_study?.trim() || null,
      start_year: qualification.start_year ? parseInt(qualification.start_year, 10) : null,
      end_year: qualification.end_year ? parseInt(qualification.end_year, 10) : null,
      grade: qualification.grade?.trim() || null,
    }

    const { data, error } = await supabase
      .from('qualifications')
      .insert(newRecord)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add qualification',
    }
  }
}

export async function updateQualification(qualificationId, userId, qualification) {
  try {
    if (!qualificationId || !userId) throw new Error('Qualification ID and User ID are required')
    if (!qualification.degree?.trim()) throw new Error('Degree / Certificate name is required')
    if (!qualification.institution?.trim()) throw new Error('Institution name is required')

    const updates = {
      degree: qualification.degree.trim(),
      institution: qualification.institution.trim(),
      field_of_study: qualification.field_of_study?.trim() || null,
      start_year: qualification.start_year ? parseInt(qualification.start_year, 10) : null,
      end_year: qualification.end_year ? parseInt(qualification.end_year, 10) : null,
      grade: qualification.grade?.trim() || null,
    }

    const { data, error } = await supabase
      .from('qualifications')
      .update(updates)
      .eq('id', qualificationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update qualification',
    }
  }
}

export async function deleteQualification(qualificationId, userId) {
  try {
    if (!qualificationId || !userId) throw new Error('Qualification ID and User ID are required')

    const { error } = await supabase
      .from('qualifications')
      .delete()
      .eq('id', qualificationId)
      .eq('user_id', userId)

    if (error) throw error

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete qualification',
    }
  }
}

// ==========================================
// WORK EXPERIENCE
// ==========================================

export async function getWorkExperience(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { data, error } = await supabase
      .from('work_experience')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch work experience',
      data: [],
    }
  }
}

export async function createWorkExperience(userId, exp) {
  try {
    if (!userId) throw new Error('User ID is required')
    if (!exp.organization?.trim()) throw new Error('Organization / Company is required')
    if (!exp.job_title?.trim()) throw new Error('Job Title is required')
    if (!exp.start_date) throw new Error('Start date is required')

    const newRecord = {
      user_id: userId,
      organization: exp.organization.trim(),
      job_title: exp.job_title.trim(),
      start_date: exp.start_date,
      end_date: exp.is_current ? null : exp.end_date || null,
      is_current: Boolean(exp.is_current),
      description: exp.description?.trim() || null,
    }

    const { data, error } = await supabase
      .from('work_experience')
      .insert(newRecord)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add work experience',
    }
  }
}

export async function updateWorkExperience(experienceId, userId, exp) {
  try {
    if (!experienceId || !userId) throw new Error('Experience ID and User ID are required')
    if (!exp.organization?.trim()) throw new Error('Organization / Company is required')
    if (!exp.job_title?.trim()) throw new Error('Job Title is required')
    if (!exp.start_date) throw new Error('Start date is required')

    const updates = {
      organization: exp.organization.trim(),
      job_title: exp.job_title.trim(),
      start_date: exp.start_date,
      end_date: exp.is_current ? null : exp.end_date || null,
      is_current: Boolean(exp.is_current),
      description: exp.description?.trim() || null,
    }

    const { data, error } = await supabase
      .from('work_experience')
      .update(updates)
      .eq('id', experienceId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update work experience',
    }
  }
}

export async function deleteWorkExperience(experienceId, userId) {
  try {
    if (!experienceId || !userId) throw new Error('Experience ID and User ID are required')

    const { error } = await supabase
      .from('work_experience')
      .delete()
      .eq('id', experienceId)
      .eq('user_id', userId)

    if (error) throw error

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete work experience',
    }
  }
}

// ==========================================
// SKILLS & USER SKILLS (SHARED CATALOG + USER RELATIONSHIP)
// ==========================================

export async function getSkills() {
  try {
    console.log('[getSkills] Fetching shared IMD skills catalog from public.skills...')
    const { data, error } = await supabase
      .from('skills')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      console.error('[getSkills] Error fetching skills:', {
        table: 'skills',
        operation: 'SELECT',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    console.log('[getSkills] Loaded IMD skills count:', data?.length || 0)
    return { success: true, data: data || [] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch skills catalog',
      data: [],
    }
  }
}

export async function getUserSkills(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    console.log('[getUserSkills] Fetching user skills for userId:', userId)
    const { data, error } = await supabase
      .from('user_skills')
      .select(`
        user_id,
        skill_id,
        proficiency,
        skills (
          id,
          name
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('[getUserSkills] Error fetching user skills:', {
        table: 'user_skills',
        operation: 'SELECT',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw error
    }

    console.log('[getUserSkills] Loaded user skills count:', data?.length || 0)
    return { success: true, data: data || [] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch trainee skills',
      data: [],
    }
  }
}


export async function addUserSkill(userId, skillId, proficiency = 'intermediate') {
  try {
    if (!userId || !skillId) throw new Error('User ID and Skill ID are required')

    const newRecord = {
      user_id: userId,
      skill_id: skillId,
      proficiency: (proficiency || 'intermediate').toLowerCase(),
    }

    console.log('[addUserSkill] Attempting INSERT into public.user_skills:', newRecord)

    const { data, error } = await supabase
      .from('user_skills')
      .insert(newRecord)
      .select(`
        user_id,
        skill_id,
        proficiency,
        skills (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('[addUserSkill] FAILED at public.user_skills INSERT:', {
        table: 'user_skills',
        operation: 'INSERT',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload: newRecord,
      })
      throw new Error(`[user_skills INSERT failed] ${error.message} (Code: ${error.code})`)
    }

    console.log('[addUserSkill] Successfully linked skill to user:', data)
    return { success: true, data }
  } catch (err) {
    console.error('[addUserSkill] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add skill to profile',
    }
  }
}

export async function updateUserSkill(userId, skillId, proficiency) {
  try {
    if (!userId || !skillId) throw new Error('User ID and Skill ID are required')

    const cleanProf = (proficiency || 'intermediate').toLowerCase()
    console.log('[updateUserSkill] Updating user_skills proficiency:', { userId, skillId, proficiency: cleanProf })

    const { data, error } = await supabase
      .from('user_skills')
      .update({ proficiency: cleanProf })
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .select(`
        user_id,
        skill_id,
        proficiency,
        skills (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('[updateUserSkill] FAILED at public.user_skills UPDATE:', {
        table: 'user_skills',
        operation: 'UPDATE',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(`[user_skills UPDATE failed] ${error.message} (Code: ${error.code})`)
    }

    console.log('[updateUserSkill] Successfully updated user skill:', data)
    return { success: true, data }
  } catch (err) {
    console.error('[updateUserSkill] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update skill proficiency',
    }
  }
}

export async function deleteUserSkill(userId, skillId) {
  try {
    if (!userId || !skillId) throw new Error('User ID and Skill ID are required')

    console.log('[deleteUserSkill] Deleting from public.user_skills:', { userId, skillId })
    const { error } = await supabase
      .from('user_skills')
      .delete()
      .eq('user_id', userId)
      .eq('skill_id', skillId)

    if (error) {
      console.error('[deleteUserSkill] FAILED at public.user_skills DELETE:', {
        table: 'user_skills',
        operation: 'DELETE',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(`[user_skills DELETE failed] ${error.message} (Code: ${error.code})`)
    }

    console.log('[deleteUserSkill] Successfully removed user skill')
    return { success: true }
  } catch (err) {
    console.error('[deleteUserSkill] Catch block error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove skill',
    }
  }
}

// ==========================================
// CERTIFICATES & STORAGE
// ==========================================

/**
 * Uploads certificate file to private Supabase Storage and records metadata
 *
 * Bucket: certificates
 * Path: certificates/{userId}/{timestamp}_{cleanFileName}
 */
export async function uploadCertificate(userId, {
  file,
  certificateName,
  issuingOrganization,
  issueDate,
  credentialId,
}) {
  let uploadedStoragePath = null
  try {
    if (!userId) throw new Error('User ID is required')
    if (!file) throw new Error('Certificate file is required')
    if (!certificateName?.trim()) throw new Error('Certificate name is required')
    if (!issuingOrganization?.trim()) throw new Error('Issuing organization is required')
    if (!issueDate) throw new Error('Issue date is required')

    // 1. Sanitize file name and construct user-isolated path: {userId}/{timestamp}_{sanitizedName}
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueFileName = `${Date.now()}_${cleanFileName}`
    const storagePath = `${userId}/${uniqueFileName}`

    // 2. Upload to private 'certificates' bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    uploadedStoragePath = uploadData?.path || storagePath

    // 3. Insert metadata record in public.certificates
    const certRecord = {
      user_id: userId,
      certificate_name: certificateName.trim(),
      issuing_organization: issuingOrganization.trim(),
      issue_date: issueDate,
      credential_id: credentialId?.trim() || null,
      original_file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: uploadedStoragePath,
    }

    const { data: certData, error: dbError } = await supabase
      .from('certificates')
      .insert(certRecord)
      .select()
      .single()

    if (dbError) {
      // Rollback storage upload if DB insert fails
      await supabase.storage.from('certificates').remove([uploadedStoragePath])
      throw new Error(`Database record creation failed: ${dbError.message}`)
    }

    return { success: true, data: certData }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload certificate',
    }
  }
}

export async function getCertificates(userId) {
  try {
    if (!userId) throw new Error('User ID is required')

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch certificates',
      data: [],
    }
  }
}

/**
 * Generates an authorized signed URL for viewing/downloading private certificate files
 *
 * @param {string} storagePath - e.g. "userId/filename.pdf"
 * @param {number} expiresIn - duration in seconds (default: 300s = 5 minutes)
 */
export async function createSignedCertificateUrl(storagePath, expiresIn = 300) {
  try {
    if (!storagePath) throw new Error('Storage path is required')

    const { data, error } = await supabase.storage
      .from('certificates')
      .createSignedUrl(storagePath, expiresIn)

    if (error) throw error

    return { success: true, signedUrl: data?.signedUrl }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate signed download URL',
    }
  }
}

/**
 * Deletes certificate record and cleans up storage file
 *
 * @param {string} certificateId
 * @param {string} userId
 * @param {string} storagePath
 */
export async function deleteCertificate(certificateId, userId, storagePath) {
  try {
    if (!certificateId || !userId) throw new Error('Certificate ID and User ID are required')

    // 1. Delete from Supabase Storage if path exists
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('certificates')
        .remove([storagePath])

      if (storageError) {
        console.warn('Storage file deletion warning:', storageError.message)
      }
    }

    // 2. Delete from public.certificates
    const { error: dbError } = await supabase
      .from('certificates')
      .delete()
      .eq('id', certificateId)
      .eq('user_id', userId)

    if (dbError) throw dbError

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete certificate',
    }
  }
}

/**
 * Helper to calculate profile completion percentage based on filled fields
 */
export function calculateProfileCompleteness({
  profile,
  traineeProfile,
  qualifications = [],
  workExperience = [],
  userSkills = [],
  certificates = [],
}) {
  let score = 0
  const maxScore = 100

  // 1. Basic Profile (20 pts)
  if (profile?.full_name) score += 5
  if (profile?.phone) score += 5
  if (profile?.department) score += 5
  if (profile?.designation) score += 5

  // 2. Extended Trainee Info (25 pts)
  if (traineeProfile?.professional_summary) score += 15
  if (traineeProfile?.current_position) score += 5
  if (traineeProfile?.interests) score += 5

  // 3. Qualifications (20 pts)
  if (qualifications.length > 0) score += 20

  // 4. Work Experience (15 pts)
  if (workExperience.length > 0) score += 15

  // 5. Skills (10 pts)
  if (userSkills.length > 0) score += 10

  // 6. Certificates (10 pts)
  if (certificates.length > 0) score += 10

  return Math.min(score, maxScore)
}
