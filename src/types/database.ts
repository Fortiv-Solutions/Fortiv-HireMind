// Database types auto-derived from Supabase schema

export type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
export type ProjectStatus = 'Active' | 'Paused' | 'Closed';
export type EvaluationStatus = 'New' | 'Screened' | 'Shortlisted' | 'Under Review' | 'Rejected';
export type SourcePlatform = 'LinkedIn' | 'Naukri' | 'Indeed' | 'Website' | 'Email' | 'Manual';
export type PostStatus = 'Active' | 'Closed';

export interface HiringProject {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  job_type: JobType | null;
  required_skills: string[] | null;
  required_experience_years: number;
  required_education: string | null;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  location: string | null;
  fingerprint: string | null;
  created_at: string;
  updated_at: string;
}

export interface CvEvaluation {
  id: string;
  candidate_id: string | null;
  hiring_project_id: string | null;
  job_post_id: string | null;
  source_platform: SourcePlatform | null;
  cv_file_url: string | null;
  raw_cv_text: string | null;
  parsed_name: string | null;
  parsed_email: string | null;
  parsed_phone: string | null;
  parsed_location: string | null;
  parsed_skills: string[] | null;
  parsed_experience_years: number | null;
  parsed_education: string | null;
  parsed_companies: string[] | null;
  parsed_projects: string[] | null;
  parsed_summary: string | null;
  skills_match_score: number;
  experience_score: number;
  education_score: number;
  additional_score: number;
  total_score: number;
  status: EvaluationStatus;
  shortlisted: boolean;
  shortlist_reason: string | null;
  reject_reason: string | null;
  applied_at: string;
  screened_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined from candidates table
  candidate?: Candidate;
}

export interface JobPost {
  id: string;
  hiring_project_id: string | null;
  platform: SourcePlatform;
  external_job_id: string | null;
  post_url: string | null;
  posted_at: string | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
}

// Enriched type for the dashboard table row
export interface ProjectWithStats extends HiringProject {
  total_candidates: number;
  shortlisted: number;
  screened: number;
  rejected: number;
}
