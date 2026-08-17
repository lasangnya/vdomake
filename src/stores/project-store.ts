import { create } from 'zustand';
import type { Project, ProjectStatus } from '@/types/project';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  updateProjectStatus: (id: string, status: ProjectStatus) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  updateProjectStatus: (id, status) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, status } : p)),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, status }
          : state.currentProject,
    })),
}));
