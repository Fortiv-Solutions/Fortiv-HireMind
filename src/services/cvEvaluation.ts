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
 * Delete a criteria set
 */
export async function deleteCriteriaSet(id: string): Promise<void> {
  const { error } = await supabase
    .from('cv_evaluation_criteria')
    .delete()
    .eq('id', id);

  if (error) throw error;
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
      data: responseData?.data || responseData,
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
      message: 'Failed to send CV file to webhook',
    };
  }
}

// ============================================
// WEBHOOK RESPONSE TYPE
// ============================================

/**
 * The shape of the immediate acknowledgement returned by the n8n webhook.
 * n8n processes the CV asynchronously and writes results to the database.
 * We then poll the database to retrieve the completed evaluation.
 */
export interface WebhookAckResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    candidate_id?: string;
    processing_status?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

// ============================================
// DATABASE POLLING
// ============================================

/**
 * Poll cv_evaluations until n8n has written the result, then return it.
 *
 * Strategy:
 *  - If n8n returned a candidate_id, query by candidate_id + hiring_project_id.
 *  - Otherwise, query by hiring_project_id for any record created after
 *    `submittedAt` (the moment we sent the webhook request).
 *
 * Polls every 3 seconds for up to 2 minutes.
 */
async function pollForEvaluation(
  projectId: string,
  submittedAt: Date,
  candidateId?: string
): Promise<CvEvaluation> {
  const POLL_INTERVAL_MS = 3000;
  const MAX_WAIT_MS = 120_000; // 2 minutes
  const deadline = Date.now() + MAX_WAIT_MS;

  console.log('⏳ Polling database for evaluation result...', { projectId, candidateId });

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    let query = supabase
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
      .eq('hiring_project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (candidateId) {
      query = query.eq('candidate_id', candidateId);
    } else {
      // Only look at records created after we submitted the webhook
      query = query.gte('created_at', submittedAt.toISOString());
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.warn('⚠️ Poll query error (will retry):', error.message);
      continue;
    }

    if (data) {
      console.log('✅ Evaluation found in database:', data.id);
      return data as CvEvaluation;
    }

    console.log('🔄 Not ready yet, retrying in 3s...');
  }

  throw new Error(
    'Timed out waiting for the evaluation result. n8n may still be processing — check the project page in a moment.'
  );
}

/**
 * Process and evaluate a CV.
 * 1. Sends the file + project/criteria context to the n8n webhook.
 * 2. Waits for n8n's acknowledgement (success/error).
 * 3. Polls the database until n8n has written the evaluation record.
 * 4. Returns the completed CvEvaluation from the database.
 *
 * No local DB writes are performed here — n8n owns all database operations.
 */
export async function evaluateCv(
  file: File,
  projectId: string,
  criteriaSetId?: string
): Promise<CvEvaluation> {
  // 1. Get project details (read-only — needed to build the webhook payload)
  const { data: project, error: projectError } = await supabase
    .from('hiring_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  const submittedAt = new Date();

  // 2. Send CV file to webhook and wait for the acknowledgement
  const webhookResponse = await sendToWebhook(file, project, criteriaSetId);

  if (!webhookResponse.success) {
    throw new Error(webhookResponse.error || webhookResponse.message || 'Webhook evaluation failed');
  }

  const ack = webhookResponse.data as WebhookAckResponse['data'];
  const candidateId = ack?.candidate_id;

  console.log('📨 Webhook acknowledged. Waiting for n8n to write evaluation to database...');

  // 3. Poll the database until n8n writes the result
  return pollForEvaluation(projectId, submittedAt, candidateId);
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

  const submittedAt = new Date();

  // 5. Send to webhook and wait for acknowledgement
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for the ack only

  let ackCandidateId: string | undefined;

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
      ackCandidateId = json.data?.candidate_id ?? candidateId;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Webhook acknowledgement timed out. Please try again.');
    }
    throw error;
  }

  console.log('📨 Webhook acknowledged. Waiting for n8n to write evaluation to database...');

  // 6. Poll the database until n8n writes the result
  return pollForEvaluation(projectId, submittedAt, ackCandidateId ?? candidateId);
}
