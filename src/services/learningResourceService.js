import { supabase } from '../lib/supabaseClient'

/**
 * Valid resource types supported by learning_resources
 */
export const RESOURCE_TYPES = {
  RECORDED_LECTURE: 'recorded_lecture',
  PRESENTATION: 'presentation',
  STUDY_MATERIAL: 'study_material',
  OTHER: 'other',
}

export const RESOURCE_TYPE_LABELS = {
  recorded_lecture: 'Recorded Lecture',
  presentation: 'Presentation',
  study_material: 'Study Material',
  other: 'Other',
}

/**
 * Allowed file extensions for resource uploads
 */
export const ALLOWED_FILE_EXTENSIONS = [
  'pdf',
  'ppt',
  'pptx',
  'doc',
  'docx',
  'mp4',
  'webm',
  'jpg',
  'jpeg',
  'png',
]

/**
 * Storage bucket name for training learning resources
 */
export const STORAGE_BUCKET = 'training-resources'

/**
 * Validates a file before upload
 *
 * @param {File} file
 */
export function validateResourceFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select a file to upload.' }
  }

  const fileName = file.name || ''
  const ext = fileName.split('.').pop()?.toLowerCase()

  if (!ext || !ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type (.${ext || 'unknown'}). Allowed formats: ${ALLOWED_FILE_EXTENSIONS.map(e => e.toUpperCase()).join(', ')}`,
    }
  }

  // Max file size: 100MB
  const maxSizeBytes = 100 * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: 'File size exceeds 100MB limit. Please upload a smaller file.',
    }
  }

  return { valid: true }
}

/**
 * Fetches all learning resources belonging to a specific training programme.
 *
 * @param {string} programmeId - UUID of the training programme
 */
export async function getProgrammeResources(programmeId) {
  try {
    if (!programmeId) throw new Error('Training Programme ID is required.')

    console.log(`[learningResourceService] Fetching resources for programme: ${programmeId}`)

    const { data, error } = await supabase
      .from('learning_resources')
      .select(`
        id,
        training_programme_id,
        title,
        description,
        resource_type,
        storage_path,
        original_file_name,
        mime_type,
        file_size,
        created_at
      `)
      .eq('training_programme_id', programmeId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[learningResourceService] Supabase error fetching resources:', error)
      throw error
    }

    return {
      success: true,
      data: data || [],
    }
  } catch (err) {
    console.error('[learningResourceService] Catch block error in getProgrammeResources:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load learning resources.',
      data: [],
    }
  }
}

/**
 * Uploads a file to Supabase Storage and records its metadata in public.learning_resources.
 * Includes rollback: if database metadata insertion fails, the uploaded Storage object is deleted.
 *
 * @param {string} programmeId - Training programme UUID
 * @param {File} file - File object to upload
 * @param {Object} metadata - Resource metadata
 * @param {string} metadata.title - Resource Title (Required)
 * @param {string} [metadata.description] - Resource Description
 * @param {string} metadata.resource_type - Enum ('recorded_lecture', 'presentation', 'study_material', 'other')
 * @param {string} userId - Authenticated user UUID (uploaded_by)
 */
export async function uploadProgrammeResource(programmeId, file, metadata, userId) {
  let uploadedStoragePath = null

  try {
    if (!programmeId) throw new Error('Training Programme ID is required.')
    if (!userId) throw new Error('User ID is required for resource upload.')
    if (!metadata?.title?.trim()) throw new Error('Resource title is required.')
    if (!metadata?.resource_type) throw new Error('Resource type is required.')

    // 1. Validate file
    const validation = validateResourceFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // 2. Generate unique storage path: {training_programme_id}/{unique-file-name}
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const storagePath = `${programmeId}/${uniqueSuffix}-${cleanFileName}`

    console.log(`[learningResourceService] Step 1: Uploading file to storage bucket '${STORAGE_BUCKET}' at: ${storagePath}`)

    // 3. Upload file to Supabase Storage private bucket
    const { data: storageData, error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      })

    if (storageError) {
      console.error('[learningResourceService] Storage upload error:', storageError)
      throw new Error(`Storage upload failed: ${storageError.message}`)
    }

    uploadedStoragePath = storageData?.path || storagePath
    console.log('[learningResourceService] Step 1 SUCCESS: Storage file created:', uploadedStoragePath)

    // 4. Insert metadata row into public.learning_resources
    const payload = {
      training_programme_id: programmeId,
      uploaded_by: userId,
      title: metadata.title.trim(),
      description: metadata.description?.trim() || null,
      resource_type: metadata.resource_type,
      storage_path: uploadedStoragePath,
      original_file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
    }

    console.log('[learningResourceService] Step 2: Inserting database record:', payload)

    const { data: insertedData, error: insertError } = await supabase
      .from('learning_resources')
      .insert(payload)
      .select()
      .single()

    if (insertError) {
      console.error('[learningResourceService] Database insert error:', insertError)

      // ROLLBACK: Attempt to delete the uploaded storage file
      console.warn('[learningResourceService] Rollback: Deleting storage object due to database insertion failure...')
      try {
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadedStoragePath])
        console.log('[learningResourceService] Rollback completed: Storage object deleted.')
      } catch (cleanupErr) {
        console.error('[learningResourceService] Rollback cleanup failed:', cleanupErr)
      }

      throw new Error(`Database error saving resource details: ${insertError.message}`)
    }

    console.log('[learningResourceService] Step 2 SUCCESS: Resource record inserted successfully:', insertedData)
    return {
      success: true,
      data: insertedData,
    }
  } catch (err) {
    console.error('[learningResourceService] Error in uploadProgrammeResource:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload learning resource.',
      data: null,
    }
  }
}

/**
 * Generates a short-lived signed URL for private viewing or downloading of a resource.
 *
 * @param {string} storagePath - Storage path of the file
 * @param {number} [expiresIn=300] - Expiration time in seconds (default 5 minutes)
 * @param {string} [downloadName] - Optional filename to force browser download
 */
export async function getResourceSignedUrl(storagePath, expiresIn = 300, downloadName = null) {
  try {
    if (!storagePath) throw new Error('Storage path is required.')

    console.log(`[learningResourceService] Generating signed URL for: ${storagePath} (expires in ${expiresIn}s)`)

    const options = {}
    if (downloadName) {
      options.download = downloadName
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn, options)

    if (error) {
      console.error('[learningResourceService] Error generating signed URL:', error)
      throw error
    }

    if (!data?.signedUrl) {
      throw new Error('Could not generate signed access URL.')
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
    }
  } catch (err) {
    console.error('[learningResourceService] Catch block error in getResourceSignedUrl:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate secure access link.',
      signedUrl: null,
    }
  }
}

/**
 * Deletes a learning resource:
 * 1. Deletes the storage object in Supabase Storage.
 * 2. Deletes the metadata row from public.learning_resources.
 *
 * @param {Object} resource - Resource object containing id and storage_path
 */
export async function deleteProgrammeResource(resource) {
  try {
    if (!resource?.id) throw new Error('Resource ID is required for deletion.')
    if (!resource?.storage_path) throw new Error('Resource storage path is required for deletion.')

    console.log(`[learningResourceService] Deleting resource ID: ${resource.id}, storagePath: ${resource.storage_path}`)

    // 1. Delete file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([resource.storage_path])

    if (storageError) {
      console.error('[learningResourceService] Error deleting storage object:', storageError)
      throw new Error(`Failed to delete storage file: ${storageError.message}`)
    }

    console.log('[learningResourceService] Storage object removed successfully.')

    // 2. Delete row from public.learning_resources
    const { error: dbError } = await supabase
      .from('learning_resources')
      .delete()
      .eq('id', resource.id)

    if (dbError) {
      console.error('[learningResourceService] Error deleting database record:', dbError)
      throw new Error(`Failed to delete resource database record: ${dbError.message}`)
    }

    console.log('[learningResourceService] Database record deleted successfully.')
    return {
      success: true,
    }
  } catch (err) {
    console.error('[learningResourceService] Error in deleteProgrammeResource:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete resource.',
    }
  }
}
