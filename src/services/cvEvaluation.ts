import { supabase } from '../lib/supabase';
import type {
  CvEvaluationCriteria,
  CvCriteriaItem,
  CriteriaWithStats,
  CvEvaluation,
  HiringProject,
  CriteriaStatus,
} from '../types/database';

// ============================================
// CV EVALUATION CRITERIA OPERATIONS
// ============================================

/**
 * Fetch all evaluation criteria with stats
 */
export async function fetchCriteriaWithStats(): Promise<CriteriaWithStats[]> {
  const { data: criteria, error } = await supabase
    .from('cv_evaluation_criteria')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!criteria) return [];

  // For each criteria set, get item count and project usage count
  const enriched = await Promise.all(
    criteria.map(async (criteriaSet: CvEvaluationCriteria) => {
      // Count criteria items
      const { count: itemCount } = await supabase
        .from('cv_criteria_items')
        .select('*', { count: 'exact', head: true })
        .eq('criteria_set_id', criteriaSet.id);

      // Count projects using this criteria
      const { count: projectCount } = await supabase
        .from('project_criteria_mapping')
        .select('*', { count: 'exact', head: true })
        .eq('criteria_set_id', criteriaSet.id);

      return {
        ...criteriaSet,
        criteriaCount: itemCount || 0,
        projectsUsed: projectCount || 0,
      } as CriteriaWithStats;
    })
  );

  return enriched;
}

/**
 * Fetch a single criteria set by ID
 */
export async function fetchCriteriaById(id: string): Promise<CvEvaluationCriteria | null> {
  const { data, error } = await supabase
    .from('cv_evaluation_criteria')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch criteria items for a criteria set
 */
export async function fetchCriteriaItems(criteriaSetId: string): Promise<CvCriteriaItem[]> {
  const { data, error } = await supabase
    .from('cv_criteria_items')
    .select('*')
    .eq('criteria_set_id', criteriaSetId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new evaluation criteria set
 */
export async function createCriteriaSet(
  criteriaData: Omit<CvEvaluationCriteria, 'id' | 'created_at' | 'updated_at'>
): Promise<CvEvaluationCriteria> {
  const { data, error } = await supabase
    .from('cv_evaluation_criteria')
    .insert(criteriaData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new evaluation criteria set with items
 */
export async function createCriteriaSetWithItems(
  criteriaData: Omit<CvEvaluationCriteria, 'id' | 'created_at' | 'updated_at'>,
  items: Array<Omit<CvCriteriaItem, 'id' | 'criteria_set_id' | 'created_at'>>
): Promise<CvEvaluationCriteria> {
  // Create the criteria set
  const criteriaSet = await createCriteriaSet(criteriaData);

  // Create the criteria items if any
  if (items.length > 0) {
    const itemsToInsert = items.map((item) => ({
      criteria_set_id: criteriaSet.id,
      criterion_name: item.criterion_name,
      criterion_description: item.criterion_description,
      weight: item.weight,
      criterion_type: item.criterion_type,
      expected_value: item.expected_value,
    }));

    const { error: itemsError } = await supabase
      .from('cv_criteria_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Rollback: delete the criteria set if items creation fails
      await supabase.from('cv_evaluation_criteria').delete().eq('id', criteriaSet.id);
      throw itemsError;
    }
  }

  return criteriaSet;
}

/**
 * Update a criteria set
 */
export async function updateCriteriaSet(
  id: string,
  updates: Partial<Omit<CvEvaluationCriteria, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('cv_evaluation_criteria')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Update criteria set with items (for editing)
 */
export async function updateCriteriaSetWithItems(
  id: string,
  criteriaData: Partial<Omit<CvEvaluationCriteria, 'id' | 'created_at' | 'updated_at'>>,
  itemsToAdd: Array<Omit<CvCriteriaItem, 'id' | 'criteria_set_id' | 'created_at'>>,
  itemsToUpdate: Array<{ id: string } & Partial<Omit<CvCriteriaItem, 'id' | 'criteria_set_id' | 'created_at'>>>,
  itemsToDelete: string[]
): Promise<void> {
  // Update the criteria set
  await updateCriteriaSet(id, criteriaData);

  // Delete items
  if (itemsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('cv_criteria_items')
      .delete()
      .in('id', itemsToDelete);

    if (deleteError) throw deleteError;
  }

  // Update existing items
  if (itemsToUpdate.length > 0) {
    for (const item of itemsToUpdate) {
      const { id: itemId, ...updates } = item;
      const { error: updateError } = await supabase
        .from('cv_criteria_items')
        .update(updates)
        .eq('id', itemId);

      if (updateError) throw updateError;
    }
  }

  // Add new items
  if (itemsToAdd.length > 0) {
    const itemsToInsert = itemsToAdd.map((item) => ({
      criteria_set_id: id,
      criterion_name: item.criterion_name,
      criterion_description: item.criterion_description,
      weight: item.weight,
      criterion_type: item.criterion_type,
      expected_value: item.expected_value,
    }));

    const { error: insertError } = await supabase
      .from('cv_criteria_items')
      .insert(itemsToInsert);

    if (insertError) throw insertError;
  }
}

/**
 * Fetch criteria set with items for editing
 */
export async function fetchCriteriaWithItems(id: string): Promise<{
  name: string;
  description: string;
  status: CriteriaStatus;
  items: CvCriteriaItem[];
}> {
  // Fetch criteria set
  const criteria = await fetchCriteriaById(id);
  if (!criteria) throw new Error('Criteria set not found');

  // Fetch items
  const items = await fetchCriteriaItems(id);

  return {
    name: criteria.name,
    description: criteria.description || '',
    status: criteria.status,
    items,
  };
}

/**
 * Delete a criteria set.
 * Checks for linked cv_evaluations first — if any exist, throws a descriptive
 * error so the UI can surface a helpful message instead of a raw 409.
 */
export async function deleteCriteriaSet(id: string): Promise<void> {
  // Check for linked evaluations (foreign key constraint)
  const { count, error: countError } = await supabase
    .from('cv_evaluations')
    .select('*', { count: 'exact', head: true })
    .eq('criteria_set_id', id);

  if (countError) throw countError;

  if (count && count > 0) {
    throw new Error(
      `This criteria set is used by ${count} CV evaluation${count > 1 ? 's' : ''} and cannot be deleted. ` +
      `Archive it instead to keep your evaluation history intact.`
    );
  }

  const { error } = await supabase
    .from('cv_evaluation_criteria')
    .delete()
    .eq('id', id);

  if (error) {
    // Fallback: surface a clean message if the FK check somehow missed it
    if (error.code === '23503') {
      throw new Error(
        'This criteria set is still referenced by existing evaluations and cannot be deleted. Archive it instead.'
      );
    }
    throw error;
  }
}

/**
 * Duplicate a criteria set
 */
export async function duplicateCriteriaSet(id: string): Promise<CvEvaluationCriteria> {
  // Fetch original criteria set
  const original = await fetchCriteriaById(id);
  if (!original) throw new Error('Criteria set not found');

  // Fetch original items
  const originalItems = await fetchCriteriaItems(id);

  // Create new criteria set
  const newCriteria = await createCriteriaSet({
    name: `${original.name} (Copy)`,
    description: original.description,
    status: 'Draft',
  });

  // Create new items
  if (originalItems.length > 0) {
    const newItems = originalItems.map((item) => ({
      criteria_set_id: newCriteria.id,
      criterion_name: item.criterion_name,
      criterion_description: item.criterion_description,
      weight: item.weight,
      criterion_type: item.criterion_type,
      expected_value: item.expected_value,
    }));

    const { error } = await supabase.from('cv_criteria_items').insert(newItems);
    if (error) throw error;
  }

  return newCriteria;
}

// ============================================
// CV UPLOAD & EVALUATION OPERATIONS
// ============================================

/**
 * Send CV data to webhook
 * Only sends the binary file and real project/criteria data
 * No mock or parsed data - let the AI analyze everything
 */
async function sendToWebhook(
  file: File,
  project: HiringProject,
  criteriaSetId?: string
): Promise<{
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}> {
  const webhookUrl = import.meta.env.VITE_CV_INTAKE_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('Webhook URL not configured. Skipping webhook call.');
    return {
      success: false,
      message: 'Webhook URL not configured',
    };
  }

  console.log('📤 Sending CV file to webhook for AI analysis:', webhookUrl);

  try {
    // Create FormData to send binary file along with other data
    const formData = new FormData();
    
    // Add the binary CV file - this is the main data for AI to analyze
    formData.append('cv_file', file, file.name);
    
    // Add only real data (no mock/parsed data)
    const payload: any = {
      // Project Information (real data from database)
      project: {
        id: project.id,
        title: project.title,
        department: project.department,
        location: project.location,
        job_type: project.job_type,
        required_skills: project.required_skills,
        required_experience_years: project.required_experience_years,
        required_education: project.required_education,
        description: project.description,
        status: project.status,
      },
      
      // File Information
      file_info: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_at: new Date().toISOString(),
      },
      
      // Metadata
      metadata: {
        source_platform: 'Manual',
        uploaded_at: new Date().toISOString(),
      },
    };
    
    // If criteria set is selected, fetch and include it
    if (criteriaSetId) {
      try {
        const { data: criteriaSet, error: criteriaError } = await supabase
          .from('cv_evaluation_criteria')
          .select('*')
          .eq('id', criteriaSetId)
          .single();
        
        if (!criteriaError && criteriaSet) {
          // Fetch criteria items
          const { data: criteriaItems, error: itemsError } = await supabase
            .from('cv_criteria_items')
            .select('*')
            .eq('criteria_set_id', criteriaSetId)
            .order('created_at', { ascending: true });
          
          if (!itemsError && criteriaItems) {
            payload.evaluation_criteria = {
              id: criteriaSet.id,
              name: criteriaSet.name,
              description: criteriaSet.description,
              status: criteriaSet.status,
              items: criteriaItems.map(item => ({
                criterion_name: item.criterion_name,
                criterion_description: item.criterion_description,
                weight: item.weight,
                criterion_type: item.criterion_type,
                expected_value: item.expected_value,
              })),
            };
            console.log('📋 Including evaluation criteria:', criteriaSet.name);
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch criteria details:', err);
        // Continue without criteria - don't fail the webhook call
      }
      
      payload.metadata.criteria_set_id = criteriaSetId;
    }
    
    console.log('📦 Webhook payload summary:', {
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      project_title: project.title,
      has_criteria: !!criteriaSetId,
      criteria_items_count: payload.evaluation_criteria?.items?.length || 0,
    });
    
    // Add JSON data
    formData.append('data', JSON.stringify(payload));
    
    // Send to webhook with timeout — n8n AI processing can take a while
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Webhook error:', response.status, errorText);
      return {
        success: false,
        error: `Webhook failed with status ${response.status}`,
        message: errorText,
      };
    }
    
    // Try to parse JSON response
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
      console.log('📥 Webhook JSON response:', responseData);
    } else {
      const textResponse = await response.text();
      console.log('📥 Webhook text response:', textResponse);
      responseData = { message: textResponse };
    }
    
    console.log('✅ Successfully sent CV file to webhook for AI analysis');
    
    return {
      success: true,
      message: responseData?.message || 'CV file sent successfully',
      data: responseData, // return the raw response — caller handles unwrapping
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Webhook timeout after 2 minutes');
      return {
        success: false,
        error: 'Webhook request timeout',
        message: 'The webhook took too long to respond. Please try again.',
      };
    }
    
    console.error('❌ Error sending to webhook:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: error.message?.includes('fetch')
        ? 'CORS error: The n8n webhook must allow requests from this origin. Check your n8n webhook CORS settings.'
        : 'Failed to send CV file to webhook',
    };
  }
}

// ============================================
// WEBHOOK RESPONSE TYPE
// ============================================

export interface WebhookResponseData {
  candidate_id: string;
  cv_evaluation_id: string;
  job_post_id: string;
  job_title: string;
  original_filename: string;
  cv_file_url: string;
  total_score: number;
  status: string;
  shortlisted: boolean;
  processing_status: string;
  timestamp: string;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  data: WebhookResponseData;
}

// ============================================
// SINGLE FETCH BY EVALUATION ID
// ============================================

async function fetchEvaluationById(cvEvaluationId: string): Promise<CvEvaluation> {
  const { data, error } = await supabase
    .from('cv_evaluations')
    .select(`
      *,
      candidate:candidates (
        id,
        full_name,
        email,
        phone,
        linkedin_url,
        location
      )
    `)
    .eq('id', cvEvaluationId)
    .single();

  if (error) throw error;
  return data as CvEvaluation;
}

/**
 * Process and evaluate a CV.
 * 1. Sends the file + project/criteria context to the n8n webhook.
 * 2. Webhook responds with all IDs (candidate_id, cv_evaluation_id, etc.).
 * 3. Uses cv_evaluation_id from the response to fetch the full record once.
 * 4. Returns the completed CvEvaluation.
 */
export async function evaluateCv(
  file: File,
  projectId: string,
  criteriaSetId?: string
): Promise<{ evaluation: CvEvaluation; webhookData: WebhookResponseData }> {
  // 1. Get project details (needed to build the webhook payload)
  const { data: project, error: projectError } = await supabase
    .from('hiring_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  // 2. Send CV to webhook and wait for the response
  const webhookResponse = await sendToWebhook(file, project, criteriaSetId);

  if (!webhookResponse.success) {
    throw new Error(webhookResponse.error || webhookResponse.message || 'Webhook evaluation failed');
  }

  // 3. Unwrap the webhook response — handles all shapes:
  //    - Array: [{ success, message, data: { cv_evaluation_id, ... } }]
  //    - Object with data: { success, message, data: { cv_evaluation_id, ... } }
  //    - Direct data: { cv_evaluation_id, ... }
  const raw = webhookResponse.data;
  const responseItem = Array.isArray(raw) ? raw[0] : raw;
  const webhookData: WebhookResponseData = responseItem?.data ?? responseItem;

  if (!webhookData?.cv_evaluation_id) {
    console.error('Unexpected webhook response shape:', raw);
    throw new Error('Webhook response did not include a cv_evaluation_id.');
  }
  console.log('📨 Webhook responded with IDs:', webhookData);

  // 4. Single fetch using cv_evaluation_id from the webhook response
  const evaluation = await fetchEvaluationById(webhookData.cv_evaluation_id);

  return { evaluation, webhookData };
}

/**
 * Fetch existing candidates for selection
 */
export async function fetchExistingCandidates(): Promise<
  Array<{
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    location: string | null;
  }>
> {
  const { data, error } = await supabase
    .from('candidates')
    .select('id, full_name, email, phone, location')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}

/**
 * Evaluate an existing candidate for a project.
 * 1. Sends candidate + project context to the n8n webhook.
 * 2. Waits for n8n's acknowledgement.
 * 3. Polls the database until n8n has written the evaluation record.
 * 4. Returns the completed CvEvaluation from the database.
 *
 * No local DB writes are performed here — n8n owns all database operations.
 */
export async function evaluateExistingCandidate(
  candidateId: string,
  projectId: string,
  criteriaSetId?: string
): Promise<CvEvaluation> {
  const webhookUrl = import.meta.env.VITE_CV_INTAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('Webhook URL not configured. Please set VITE_CV_INTAKE_WEBHOOK_URL.');
  }

  // 1. Fetch candidate details (read-only)
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (candidateError) throw candidateError;

  // 2. Fetch project details (read-only)
  const { data: project, error: projectError } = await supabase
    .from('hiring_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  // 3. Build payload
  const payload: Record<string, unknown> = {
    candidate: {
      id: candidate.id,
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      linkedin_url: candidate.linkedin_url,
    },
    project: {
      id: project.id,
      title: project.title,
      department: project.department,
      location: project.location,
      job_type: project.job_type,
      required_skills: project.required_skills,
      required_experience_years: project.required_experience_years,
      required_education: project.required_education,
      description: project.description,
      status: project.status,
    },
    metadata: {
      source_platform: 'Manual',
      uploaded_at: new Date().toISOString(),
      evaluation_type: 'existing_candidate',
    },
  };

  // 4. Optionally include criteria set
  if (criteriaSetId) {
    try {
      const { data: criteriaSet, error: criteriaError } = await supabase
        .from('cv_evaluation_criteria')
        .select('*')
        .eq('id', criteriaSetId)
        .single();

      if (!criteriaError && criteriaSet) {
        const { data: criteriaItems } = await supabase
          .from('cv_criteria_items')
          .select('*')
          .eq('criteria_set_id', criteriaSetId)
          .order('created_at', { ascending: true });

        if (criteriaItems) {
          payload.evaluation_criteria = {
            id: criteriaSet.id,
            name: criteriaSet.name,
            description: criteriaSet.description,
            status: criteriaSet.status,
            items: criteriaItems.map((item) => ({
              criterion_name: item.criterion_name,
              criterion_description: item.criterion_description,
              weight: item.weight,
              criterion_type: item.criterion_type,
              expected_value: item.expected_value,
            })),
          };
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch criteria details:', err);
    }
    (payload.metadata as Record<string, unknown>).criteria_set_id = criteriaSetId;
  }

  console.log('📤 Sending existing candidate to webhook for AI analysis');

  // 5. Send to webhook and wait for the response
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook failed with status ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const json = await response.json();
      if (json.success === false) {
        throw new Error(json.error || json.message || 'Webhook returned an error');
      }

      // Webhook returns an array — grab the first item
      const responsePayload: WebhookResponse = Array.isArray(json) ? json[0] : json;

      if (!responsePayload?.data?.cv_evaluation_id) {
        throw new Error('Webhook response did not include a cv_evaluation_id.');
      }

      console.log('📨 Webhook responded with IDs:', responsePayload.data);

      // 6. Single fetch using cv_evaluation_id
      return fetchEvaluationById(responsePayload.data.cv_evaluation_id);
    }

    throw new Error('Webhook returned a non-JSON response.');
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Webhook timed out. Please try again.');
    }
    throw error;
  }
}

// ============================================
// BULK CV UPLOAD
// ============================================

export type BulkFileStatus = 'pending' | 'processing' | 'success' | 'error';

export interface BulkFileResult {
  file: File;
  status: BulkFileStatus;
  evaluation?: CvEvaluation;
  candidateName?: string;
  totalScore?: number;
  error?: string;
}

/**
 * Upload and evaluate multiple CVs sequentially.
 * Calls onProgress after each file so the UI can update in real time.
 */
export async function bulkUploadCVs(
  files: File[],
  projectId: string,
  criteriaSetId: string | undefined,
  onProgress: (results: BulkFileResult[]) => void
): Promise<BulkFileResult[]> {
  // Initialise all as pending
  const results: BulkFileResult[] = files.map((file) => ({
    file,
    status: 'pending',
  }));

  onProgress([...results]);

  for (let i = 0; i < files.length; i++) {
    // Mark current file as processing
    results[i] = { ...results[i], status: 'processing' };
    onProgress([...results]);

    try {
      const { evaluation, webhookData } = await evaluateCv(files[i], projectId, criteriaSetId);

      results[i] = {
        ...results[i],
        status: 'success',
        evaluation,
        candidateName:
          evaluation.candidate?.full_name ??
          evaluation.parsed_name ??
          webhookData.original_filename ??
          files[i].name,
        totalScore: evaluation.total_score,
      };
    } catch (err: any) {
      const message: string =
        err?.message?.includes('fetch') || err?.message?.includes('CORS')
          ? 'Network error — check webhook CORS settings.'
          : err?.message?.includes('timeout') || err?.name === 'AbortError'
          ? 'Request timed out. The webhook took too long to respond.'
          : err?.message || 'Evaluation failed. Please try again.';

      results[i] = { ...results[i], status: 'error', error: message };
    }

    onProgress([...results]);
  }

  return results;
}
