import { create } from 'zustand';
import {
  fetchProjectsWithStats,
  fetchProjectById,
  fetchEvaluationsForProject,
  updateEvaluationStatus,
} from '../services/hiringProjects';
import type { ProjectWithStats, HiringProject, CvEvaluation } from '../types/database';

interface AppState {
  // Projects
  projects: ProjectWithStats[];
  projectsLoading: boolean;
  projectsError: string | null;

  // Active project detail
  activeProject: HiringProject | null;
  evaluations: CvEvaluation[];
  evaluationsLoading: boolean;
  evaluationsError: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  loadProjectDetail: (id: string) => Promise<void>;
  advanceEvaluation: (evaluationId: string) => Promise<void>;
  rejectEvaluation: (evaluationId: string, reason?: string) => Promise<void>;
  shortlistEvaluation: (evaluationId: string, reason?: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  projects: [],
  projectsLoading: false,
  projectsError: null,

  activeProject: null,
  evaluations: [],
  evaluationsLoading: false,
  evaluationsError: null,

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
}));
