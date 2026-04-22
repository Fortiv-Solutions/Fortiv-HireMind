import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  fetchProjectsWithStats,
  fetchProjectById,
  fetchEvaluationsForProject,
  updateEvaluationStatus,
  addCandidateManually,
} from '../services/hiringProjects';
import type { ProjectWithStats, HiringProject, CvEvaluation } from '../types/database';

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
}));
