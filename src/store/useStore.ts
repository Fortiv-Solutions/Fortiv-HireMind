import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  fetchProjectsWithStats,
  fetchProjectById,
  fetchEvaluationsForProject,
  updateEvaluationStatus,
  addCandidateManually,
  updateProjectDescription,
  fetchJobPostsForProject,
  createJobPost,
  updateJobPostStatus,
  deleteJobPost,
  fetchAllCandidates,
  fetchLatestEvaluationForCandidate,
  type CandidateWithStats,
} from '../services/hiringProjects';
import type { ProjectWithStats, HiringProject, CvEvaluation, JobPost } from '../types/database';

interface AppState {
  // Auth
  user: User | null;
  authLoading: boolean;
  
  // Projects
  projects: ProjectWithStats[];
  projectsLoading: boolean;
  projectsError: string | null;

  // Active project detail
  activeProject: HiringProject | null;
  evaluations: CvEvaluation[];
  evaluationsLoading: boolean;
  evaluationsError: string | null;
  
  // Job posts
  jobPosts: JobPost[];
  jobPostsLoading: boolean;

  // All candidates
  candidates: CandidateWithStats[];
  candidatesLoading: boolean;
  candidatesError: string | null;

  // Auth Actions
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  
  // Actions
  loadProjects: () => Promise<void>;
  loadProjectDetail: (id: string) => Promise<void>;
  updateEvaluationStatus: (evaluationId: string, updates: Partial<Pick<CvEvaluation, 'status' | 'shortlisted' | 'shortlist_reason' | 'reject_reason'>>) => Promise<void>;
  advanceEvaluation: (evaluationId: string) => Promise<void>;
  rejectEvaluation: (evaluationId: string, reason?: string) => Promise<void>;
  shortlistEvaluation: (evaluationId: string, reason?: string) => Promise<void>;
  addCandidate: (projectId: string, candidateData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    experienceYears?: number;
  }) => Promise<void>;
  updateProjectDescription: (projectId: string, description: string) => Promise<void>;
  loadJobPosts: (projectId: string) => Promise<void>;
  addJobPost: (postData: {
    hiring_project_id: string;
    platform: string;
    post_url: string;
    external_job_id?: string;
  }) => Promise<void>;
  toggleJobPostStatus: (postId: string, currentStatus: 'Active' | 'Closed') => Promise<void>;
  removeJobPost: (postId: string) => Promise<void>;
  loadAllCandidates: () => Promise<void>;
  fetchCandidateEvaluation: (candidateId: string) => Promise<CvEvaluation | null>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  authLoading: true,
  
  projects: [],
  projectsLoading: false,
  projectsError: null,

  activeProject: null,
  evaluations: [],
  evaluationsLoading: false,
  evaluationsError: null,
  
  jobPosts: [],
  jobPostsLoading: false,

  candidates: [],
  candidatesLoading: false,
  candidatesError: null,

  setUser: (user) => set({ user, authLoading: false }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, projects: [], activeProject: null, evaluations: [] });
  },

  loadProjects: async () => {
    set({ projectsLoading: true, projectsError: null });
    try {
      const projects = await fetchProjectsWithStats();
      set({ projects, projectsLoading: false });
    } catch (err: any) {
      set({ projectsError: err.message ?? 'Failed to load projects', projectsLoading: false });
    }
  },

  loadProjectDetail: async (id: string) => {
    set({ evaluationsLoading: true, evaluationsError: null });
    try {
      const [project, evaluations] = await Promise.all([
        fetchProjectById(id),
        fetchEvaluationsForProject(id),
      ]);
      set({ activeProject: project, evaluations, evaluationsLoading: false });
    } catch (err: any) {
      set({ evaluationsError: err.message ?? 'Failed to load project detail', evaluationsLoading: false });
    }
  },

  updateEvaluationStatus: async (evaluationId: string, updates: Partial<Pick<CvEvaluation, 'status' | 'shortlisted' | 'shortlist_reason' | 'reject_reason'>>) => {
    await updateEvaluationStatus(evaluationId, updates);
  },

  advanceEvaluation: async (evaluationId: string) => {
    await updateEvaluationStatus(evaluationId, { status: 'Screened' });
    // Re-sync evaluations for the active project
    const activeProject = get().activeProject;
    if (activeProject) await get().loadProjectDetail(activeProject.id);
  },

  rejectEvaluation: async (evaluationId: string, reason?: string) => {
    await updateEvaluationStatus(evaluationId, { status: 'Rejected', reject_reason: reason });
    const activeProject = get().activeProject;
    if (activeProject) await get().loadProjectDetail(activeProject.id);
  },

  shortlistEvaluation: async (evaluationId: string, reason?: string) => {
    await updateEvaluationStatus(evaluationId, {
      status: 'Shortlisted',
      shortlisted: true,
      shortlist_reason: reason,
    });
    const activeProject = get().activeProject;
    if (activeProject) await get().loadProjectDetail(activeProject.id);
  },

  addCandidate: async (projectId: string, candidateData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedinUrl?: string;
    experienceYears?: number;
  }) => {
    await addCandidateManually(projectId, candidateData);
    // Reload the project detail to show the new candidate
    await get().loadProjectDetail(projectId);
  },

  updateProjectDescription: async (projectId: string, description: string) => {
    await updateProjectDescription(projectId, description);
    // Reload the project to show updated description
    await get().loadProjectDetail(projectId);
  },

  loadJobPosts: async (projectId: string) => {
    set({ jobPostsLoading: true });
    try {
      const posts = await fetchJobPostsForProject(projectId);
      set({ jobPosts: posts, jobPostsLoading: false });
    } catch (err: any) {
      console.error('Failed to load job posts:', err);
      set({ jobPostsLoading: false });
    }
  },

  addJobPost: async (postData: {
    hiring_project_id: string;
    platform: string;
    post_url: string;
    external_job_id?: string;
  }) => {
    await createJobPost(postData);
    // Reload job posts
    await get().loadJobPosts(postData.hiring_project_id);
  },

  toggleJobPostStatus: async (postId: string, currentStatus: 'Active' | 'Closed') => {
    const newStatus = currentStatus === 'Active' ? 'Closed' : 'Active';
    await updateJobPostStatus(postId, newStatus);
    // Update local state
    set(state => ({
      jobPosts: state.jobPosts.map(post =>
        post.id === postId ? { ...post, status: newStatus } : post
      ),
    }));
  },

  removeJobPost: async (postId: string) => {
    await deleteJobPost(postId);
    // Update local state
    set(state => ({
      jobPosts: state.jobPosts.filter(post => post.id !== postId),
    }));
  },

  loadAllCandidates: async () => {
    set({ candidatesLoading: true, candidatesError: null });
    try {
      const candidates = await fetchAllCandidates();
      set({ candidates, candidatesLoading: false });
    } catch (err: any) {
      set({ candidatesError: err.message ?? 'Failed to load candidates', candidatesLoading: false });
    }
  },

  fetchCandidateEvaluation: async (candidateId: string) => {
    return await fetchLatestEvaluationForCandidate(candidateId);
  },
}));
