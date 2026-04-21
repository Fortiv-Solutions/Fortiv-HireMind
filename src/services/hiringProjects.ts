import { supabase } from '../lib/supabase';
import type { HiringProject, ProjectWithStats, CvEvaluation } from '../types/database';

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
