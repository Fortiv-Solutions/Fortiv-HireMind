import { supabase } from '../lib/supabase';
import type { HiringProject, ProjectWithStats, CvEvaluation, Candidate } from '../types/database';

export interface CandidateWithStats extends Candidate {
  project_count: number;
  latest_status: string | null;
  latest_score: number | null;
  latest_project_title: string | null;
}

// Fetch all candidates with their evaluation stats
export async function fetchAllCandidates(): Promise<CandidateWithStats[]> {
  const { data: candidates, error } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!candidates) return [];

  // Enrich each candidate with evaluation stats
  const enriched = await Promise.all(
    candidates.map(async (candidate: Candidate) => {
      const { data: evals } = await supabase
        .from('cv_evaluations')
        .select(`
          status,
          total_score,
          hiring_project:hiring_projects (title)
        `)
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false });

      const allEvals = evals || [];
      const latest = allEvals[0] as any;

      return {
        ...candidate,
        project_count: allEvals.length,
        latest_status: latest?.status ?? null,
        latest_score: latest?.total_score ?? null,
        latest_project_title: latest?.hiring_project?.title ?? null,
      } as CandidateWithStats;
    })
  );

  return enriched;
}

// Fetch all hiring projects with aggregated candidate stats
export async function fetchProjectsWithStats(): Promise<ProjectWithStats[]> {
  const { data: projects, error } = await supabase
    .from('hiring_projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!projects) return [];

  // For each project, compute stats from cv_evaluations
  const enriched = await Promise.all(
    projects.map(async (project: HiringProject) => {
      const { data: evals } = await supabase
        .from('cv_evaluations')
        .select('status, shortlisted')
        .eq('hiring_project_id', project.id);

      const allEvals = evals || [];
      return {
        ...project,
        total_candidates: allEvals.length,
        shortlisted: allEvals.filter((e) => e.shortlisted === true).length,
        screened: allEvals.filter((e) => e.status === 'Screened').length,
        rejected: allEvals.filter((e) => e.status === 'Rejected').length,
      } as ProjectWithStats;
    })
  );

  return enriched;
}

// Fetch a single hiring project by ID
export async function fetchProjectById(id: string): Promise<HiringProject | null> {
  const { data, error } = await supabase
    .from('hiring_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Fetch cv_evaluations for a project, joining candidate data
export async function fetchEvaluationsForProject(projectId: string): Promise<CvEvaluation[]> {
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
    .eq('hiring_project_id', projectId)
    .order('total_score', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Update evaluation status (shortlist / reject / advance)
export async function updateEvaluationStatus(
  evaluationId: string,
  updates: Partial<Pick<CvEvaluation, 'status' | 'shortlisted' | 'shortlist_reason' | 'reject_reason'>>
): Promise<void> {
  const { error } = await supabase
    .from('cv_evaluations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', evaluationId);

  if (error) throw error;
}

// Create a new hiring project
export async function createHiringProject(
  project: Omit<HiringProject, 'id' | 'created_at' | 'updated_at'>
): Promise<HiringProject> {
  const { data, error } = await supabase
    .from('hiring_projects')
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Create or get candidate by email
export async function createOrGetCandidate(candidateData: {
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
}): Promise<string> {
  // First check if candidate exists by email
  const { data: existing } = await supabase
    .from('candidates')
    .select('id')
    .eq('email', candidateData.email)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new candidate
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      full_name: candidateData.full_name,
      email: candidateData.email,
      phone: candidateData.phone || null,
      location: candidateData.location || null,
      linkedin_url: candidateData.linkedin_url || null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// Create CV evaluation for a candidate
export async function createCvEvaluation(evaluationData: {
  candidate_id: string;
  hiring_project_id: string;
  source_platform?: string;
  parsed_name?: string;
  parsed_email?: string;
  parsed_phone?: string;
  parsed_location?: string;
  parsed_experience_years?: number;
  parsed_skills?: string[];
  skills_match_score?: number;
  experience_score?: number;
  education_score?: number;
  total_score?: number;
}): Promise<CvEvaluation> {
  const { data, error } = await supabase
    .from('cv_evaluations')
    .insert({
      candidate_id: evaluationData.candidate_id,
      hiring_project_id: evaluationData.hiring_project_id,
      source_platform: evaluationData.source_platform || 'Manual',
      parsed_name: evaluationData.parsed_name,
      parsed_email: evaluationData.parsed_email,
      parsed_phone: evaluationData.parsed_phone,
      parsed_location: evaluationData.parsed_location,
      parsed_experience_years: evaluationData.parsed_experience_years || 0,
      parsed_skills: evaluationData.parsed_skills || [],
      skills_match_score: evaluationData.skills_match_score || 0,
      experience_score: evaluationData.experience_score || 0,
      education_score: evaluationData.education_score || 0,
      additional_score: 0,
      total_score: evaluationData.total_score || 0,
      status: 'New',
      shortlisted: false,
      applied_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Add candidate manually to a project
export async function addCandidateManually(
  projectId: string,
  candidateData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    experienceYears?: number;
  }
): Promise<CvEvaluation> {
  // Create or get candidate
  const candidateId = await createOrGetCandidate({
    full_name: `${candidateData.firstName} ${candidateData.lastName}`,
    email: candidateData.email,
    phone: candidateData.phone,
    location: candidateData.location,
    linkedin_url: candidateData.linkedinUrl,
  });

  // Create evaluation with basic scores
  const experienceYears = candidateData.experienceYears || 0;
  const experienceScore = Math.min(experienceYears * 10, 100);
  const totalScore = experienceScore * 0.4 + 30; // Basic score calculation

  const evaluation = await createCvEvaluation({
    candidate_id: candidateId,
    hiring_project_id: projectId,
    source_platform: 'Manual',
    parsed_name: `${candidateData.firstName} ${candidateData.lastName}`,
    parsed_email: candidateData.email,
    parsed_phone: candidateData.phone,
    parsed_location: candidateData.location,
    parsed_experience_years: experienceYears,
    skills_match_score: 50,
    experience_score: experienceScore,
    education_score: 50,
    total_score: totalScore,
  });

  return evaluation;
}

// Update hiring project description
export async function updateProjectDescription(
  projectId: string,
  description: string
): Promise<void> {
  const { error } = await supabase
    .from('hiring_projects')
    .update({ description, updated_at: new Date().toISOString() })
    .eq('id', projectId);

  if (error) throw error;
}

// Fetch job posts for a project
export async function fetchJobPostsForProject(projectId: string) {
  const { data, error } = await supabase
    .from('job_posts')
    .select('*')
    .eq('hiring_project_id', projectId)
    .order('posted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Create a new job post
export async function createJobPost(postData: {
  hiring_project_id: string;
  platform: string;
  post_url: string;
  external_job_id?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('job_posts')
    .insert({
      hiring_project_id: postData.hiring_project_id,
      platform: postData.platform,
      post_url: postData.post_url,
      external_job_id: postData.external_job_id || null,
      posted_at: new Date().toISOString(),
      status: 'Active',
    });

  if (error) throw error;
}

// Update job post status
export async function updateJobPostStatus(
  postId: string,
  status: 'Active' | 'Closed'
): Promise<void> {
  const { error } = await supabase
    .from('job_posts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', postId);

  if (error) throw error;
}

// Fetch the most recent cv_evaluation for a candidate (with full data)
export async function fetchLatestEvaluationForCandidate(candidateId: string): Promise<CvEvaluation | null> {
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
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

// Delete job post
export async function deleteJobPost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('job_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
}
