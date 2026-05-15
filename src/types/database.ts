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

// CV Evaluation Criteria types
export type CriteriaStatus = 'Active' | 'Inactive' | 'Draft' | 'Archived';
export type CriterionType = 'skill' | 'experience' | 'education' | 'custom';

export interface CvEvaluationCriteria {
  id: string;
  name: string;
  description: string | null;
  status: CriteriaStatus;
  created_at: string;
  updated_at: string;
}

export interface CvCriteriaItem {
  id: string;
  criteria_set_id: string;
  criterion_name: string;
  criterion_description: string | null;
  weight: number;
  criterion_type: CriterionType | null;
  expected_value: string | null;
  created_at: string;
}

export interface ProjectCriteriaMapping {
  id: string;
  hiring_project_id: string;
  criteria_set_id: string;
  created_at: string;
}

export type AiInterviewSetStatus = 'Active' | 'Draft' | 'Archived';
export type AiInterviewQuestionType =
  | 'intro'
  | 'technical'
  | 'experience'
  | 'behavioral'
  | 'role_fit'
  | 'closing'
  | 'general';
export type AiInterviewInviteStatus = 'Not Started' | 'Started' | 'Completed' | 'Expired' | 'Cancelled';
export type AiInterviewSessionStatus = 'Started' | 'Completed' | 'Failed';
export type AiInterviewRecommendation = 'Strong Hire' | 'Hire' | 'Maybe' | 'No Hire';
export type AiInterviewMessageRole = 'ai' | 'candidate' | 'system';

export interface AiInterviewSet {
  id: string;
  hiring_project_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  status: AiInterviewSetStatus;
  created_at: string;
  updated_at: string;
}

export interface AiInterviewQuestion {
  id: string;
  interview_set_id: string;
  question_text: string;
  question_type: AiInterviewQuestionType;
  position: number;
  expected_signal: string | null;
  required: boolean;
  created_at: string;
}

export interface AiInterviewInvite {
  id: string;
  token: string;
  candidate_id: string;
  hiring_project_id: string;
  cv_evaluation_id: string | null;
  interview_set_id: string | null;
  status: AiInterviewInviteStatus;
  expires_at: string | null;
  sent_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiInterviewSession {
  id: string;
  invite_id: string;
  candidate_id: string;
  hiring_project_id: string;
  status: AiInterviewSessionStatus;
  recording_url: string | null;
  transcript: string | null;
  analysis: InterviewAnalysis | null;
  overall_score: number;
  recommendation: AiInterviewRecommendation | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiInterviewMessage {
  id: string;
  session_id: string;
  role: AiInterviewMessageRole;
  content: string;
  question_id: string | null;
  sequence: number;
  created_at: string;
}

export interface InterviewAnalysis {
  overallScore: number;
  recommendation: AiInterviewRecommendation;
  summary: string;
  strengths: string[];
  concerns: string[];
  skillRatings: Array<{
    skill: string;
    score: number;
    evidence: string;
  }>;
  communicationScore: number;
  roleFitScore: number;
  technicalScore: number;
  suggestedNextSteps: string[];
}

// Enriched criteria with stats
export interface CriteriaWithStats extends CvEvaluationCriteria {
  criteriaCount: number;
  projectsUsed: number;
}
