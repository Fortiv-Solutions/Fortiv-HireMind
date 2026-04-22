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
 */
async function sendToWebhook(
  file: File,
  parsedData: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    skills: string[];
    experienceYears: number;
    education?: string;
    companies: string[];
    projects: string[];
    summary?: string;
    rawText: string;
  },
  project: HiringProject,
  scores: {
    skillsMatchScore: number;
    experienceScore: number;
    educationScore: number;
    totalScore: number;
  },
  cvFileUrl: string,
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

  console.log('📤 Sending CV data to webhook:', webhookUrl);

  try {
    // Create FormData to send binary file along with other data
    const formData = new FormData();
    
    // Add the binary file
    formData.append('cv_file', file, file.name);
    
    // Add all other data as JSON string
    const payload = {
      // Candidate Information
      candidate: {
        name: parsedData.name,
        email: parsedData.email,
        phone: parsedData.phone || null,
        location: parsedData.location || null,
      },
      
      // Parsed CV Data
      parsed_data: {
        skills: parsedData.skills,
        experience_years: parsedData.experienceYears,
        education: parsedData.education || null,
        companies: parsedData.companies,
        projects: parsedData.projects,
        summary: parsedData.summary || null,
        raw_text: parsedData.rawText,
      },
      
      // Project Information
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
      
      // Evaluation Scores
      scores: {
        skills_match_score: scores.skillsMatchScore,
        experience_score: scores.experienceScore,
        education_score: scores.educationScore,
        total_score: scores.totalScore,
      },
      
      // File Information
      file_info: {
        cv_file_url: cvFileUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      },
      
      // Additional Metadata
      metadata: {
        criteria_set_id: criteriaSetId || null,
        source_platform: 'Manual',
        uploaded_at: new Date().toISOString(),
      },
    };
    
    console.log('📦 Webhook payload summary:', {
      file_name: file.name,
      file_size: file.size,
      candidate_email: parsedData.email,
      project_title: project.title,
      total_score: scores.totalScore,
    });
    
    // Add JSON data
    formData.append('data', JSON.stringify(payload));
    
    // Send to webhook with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
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
    
    console.log('✅ Successfully sent data to webhook');
    
    return {
      success: true,
      message: responseData?.message || 'Data sent successfully',
      data: responseData?.data || responseData,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Webhook timeout after 30 seconds');
      return {
        success: false,
        error: 'Webhook request timeout',
        message: 'The webhook took too long to respond',
      };
    }
    
    console.error('❌ Error sending to webhook:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Failed to send data to webhook',
    };
  }
}

/**
 * Upload CV file to Supabase Storage
 */
export async function uploadCvFile(file: File, candidateEmail: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${candidateEmail}_${Date.now()}.${fileExt}`;
  const filePath = `cvs/${fileName}`;

  const { data, error } = await supabase.storage
    .from('cv-uploads')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('cv-uploads')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Parse CV text from file (placeholder - you'll need to implement actual parsing)
 * This could integrate with an AI service or CV parsing API
 */
export async function parseCvFile(file: File): Promise<{
  name: string;
  email: string;
  phone?: string;
  location?: string;
  skills: string[];
  experienceYears: number;
  education?: string;
  companies: string[];
  projects: string[];
  summary?: string;
  rawText: string;
}> {
  // TODO: Implement actual CV parsing logic
  // This is a placeholder that returns mock data
  // You can integrate with services like:
  // - OpenAI API for text extraction
  // - Affinda, Sovren, or other CV parsing APIs
  // - Custom NLP models

  return {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 98765 43210',
    location: 'Bangalore, India',
    skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AWS'],
    experienceYears: 5,
    education: 'B.Tech in Computer Science',
    companies: ['Tech Corp', 'Startup Inc'],
    projects: ['E-commerce Platform', 'Mobile App'],
    summary: 'Experienced software engineer with 5+ years in full-stack development',
    rawText: 'CV content would be extracted here...',
  };
}

/**
 * Calculate evaluation scores based on project requirements
 */
export function calculateEvaluationScores(
  parsedCv: {
    skills: string[];
    experienceYears: number;
    education?: string;
  },
  project: HiringProject
): {
  skillsMatchScore: number;
  experienceScore: number;
  educationScore: number;
  totalScore: number;
} {
  // Skills match score
  const requiredSkills = project.required_skills || [];
  const candidateSkills = parsedCv.skills.map((s) => s.toLowerCase());
  const matchedSkills = requiredSkills.filter((skill) =>
    candidateSkills.some((cs) => cs.includes(skill.toLowerCase()))
  );
  const skillsMatchScore =
    requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) * 100 : 50;

  // Experience score
  const requiredYears = project.required_experience_years || 0;
  const candidateYears = parsedCv.experienceYears || 0;
  let experienceScore = 0;
  if (candidateYears >= requiredYears) {
    experienceScore = Math.min(100, 70 + (candidateYears - requiredYears) * 5);
  } else {
    experienceScore = (candidateYears / requiredYears) * 70;
  }

  // Education score (simplified)
  const educationScore = parsedCv.education ? 75 : 50;

  // Total score (weighted average)
  const totalScore = Math.round(
    skillsMatchScore * 0.5 + experienceScore * 0.3 + educationScore * 0.2
  );

  return {
    skillsMatchScore: Math.round(skillsMatchScore),
    experienceScore: Math.round(experienceScore),
    educationScore,
    totalScore,
  };
}

/**
 * Process and evaluate a CV
 */
export async function evaluateCv(
  file: File,
  projectId: string,
  criteriaSetId?: string
): Promise<CvEvaluation> {
  // 1. Parse the CV
  const parsedData = await parseCvFile(file);

  // 2. Upload the file
  const cvFileUrl = await uploadCvFile(file, parsedData.email);

  // 3. Get project details
  const { data: project, error: projectError } = await supabase
    .from('hiring_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  // 4. Calculate scores
  const scores = calculateEvaluationScores(parsedData, project);

  // 5. Send to webhook and get response
  const webhookResponse = await sendToWebhook(
    file,
    parsedData,
    project,
    scores,
    cvFileUrl,
    criteriaSetId
  );
  
  // Log webhook response for debugging
  if (webhookResponse.success) {
    console.log('✅ Webhook integration successful:', webhookResponse.message);
  } else {
    console.warn('⚠️ Webhook integration failed:', webhookResponse.error);
  }

  // 6. Create or get candidate
  const { data: existingCandidate } = await supabase
    .from('candidates')
    .select('id')
    .eq('email', parsedData.email)
    .single();

  let candidateId: string;

  if (existingCandidate) {
    candidateId = existingCandidate.id;
    // Update candidate info
    await supabase
      .from('candidates')
      .update({
        full_name: parsedData.name,
        phone: parsedData.phone,
        location: parsedData.location,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidateId);
  } else {
    // Create new candidate
    const { data: newCandidate, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        full_name: parsedData.name,
        email: parsedData.email,
        phone: parsedData.phone,
        location: parsedData.location,
      })
      .select('id')
      .single();

    if (candidateError) throw candidateError;
    candidateId = newCandidate.id;
  }

  // 7. Create CV evaluation
  const { data: evaluation, error: evalError } = await supabase
    .from('cv_evaluations')
    .insert({
      candidate_id: candidateId,
      hiring_project_id: projectId,
      criteria_set_id: criteriaSetId || null,
      source_platform: 'Manual',
      cv_file_url: cvFileUrl,
      raw_cv_text: parsedData.rawText,
      parsed_name: parsedData.name,
      parsed_email: parsedData.email,
      parsed_phone: parsedData.phone,
      parsed_location: parsedData.location,
      parsed_skills: parsedData.skills,
      parsed_experience_years: parsedData.experienceYears,
      parsed_education: parsedData.education,
      parsed_companies: parsedData.companies,
      parsed_projects: parsedData.projects,
      parsed_summary: parsedData.summary,
      skills_match_score: scores.skillsMatchScore,
      experience_score: scores.experienceScore,
      education_score: scores.educationScore,
      additional_score: 0,
      total_score: scores.totalScore,
      status: 'New',
      shortlisted: false,
      applied_at: new Date().toISOString(),
    })
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
    .single();

  if (evalError) throw evalError;
  return evaluation;
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
 * Evaluate an existing candidate for a project
 */
export async function evaluateExistingCandidate(
  candidateId: string,
  projectId: string,
  criteriaSetId?: string
): Promise<CvEvaluation> {
  // Get candidate details
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (candidateError) throw candidateError;

  // Get project details
  const { data: project, error: projectError } = await supabase
    .from('hiring_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError) throw projectError;

  // Check if evaluation already exists
  const { data: existingEval } = await supabase
    .from('cv_evaluations')
    .select('id')
    .eq('candidate_id', candidateId)
    .eq('hiring_project_id', projectId)
    .single();

  if (existingEval) {
    throw new Error('This candidate has already been evaluated for this project');
  }

  // Get previous evaluation data if exists
  const { data: previousEval } = await supabase
    .from('cv_evaluations')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Use previous evaluation data or create basic scores
  const parsedData = previousEval
    ? {
        skills: previousEval.parsed_skills || [],
        experienceYears: previousEval.parsed_experience_years || 0,
        education: previousEval.parsed_education,
      }
    : {
        skills: [],
        experienceYears: 0,
        education: undefined,
      };

  const scores = calculateEvaluationScores(parsedData, project);

  // Create new evaluation
  const { data: evaluation, error: evalError } = await supabase
    .from('cv_evaluations')
    .insert({
      candidate_id: candidateId,
      hiring_project_id: projectId,
      criteria_set_id: criteriaSetId || null,
      source_platform: 'Manual',
      cv_file_url: previousEval?.cv_file_url || null,
      raw_cv_text: previousEval?.raw_cv_text || null,
      parsed_name: candidate.full_name,
      parsed_email: candidate.email,
      parsed_phone: candidate.phone,
      parsed_location: candidate.location,
      parsed_skills: previousEval?.parsed_skills || [],
      parsed_experience_years: previousEval?.parsed_experience_years || 0,
      parsed_education: previousEval?.parsed_education || null,
      parsed_companies: previousEval?.parsed_companies || [],
      parsed_projects: previousEval?.parsed_projects || [],
      parsed_summary: previousEval?.parsed_summary || null,
      skills_match_score: scores.skillsMatchScore,
      experience_score: scores.experienceScore,
      education_score: scores.educationScore,
      additional_score: 0,
      total_score: scores.totalScore,
      status: 'New',
      shortlisted: false,
      applied_at: new Date().toISOString(),
    })
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
    .single();

  if (evalError) throw evalError;
  return evaluation;
}
