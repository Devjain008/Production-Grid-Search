import { create } from 'zustand';
import { DEMO_PROJECT } from '../demo/demoData';

export interface RunningJob {
  jobId: string;
  projectId: string;
  projectName: string;
  type: 'baseline' | 'optimize' | 'report';
  status: 'running' | 'completed' | 'failed';
  currentStep: string;
  progressPct: number;
  startedAt: string;
}

export interface AppState {
  // Mode & Theme
  expertMode: boolean;
  setExpertMode: (val: boolean) => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;

  // Active Context
  activeProject: any;
  setActiveProject: (p: any) => void;
  selectedExperimentId: string | null;
  setSelectedExperimentId: (id: string | null) => void;

  // Modals & Drawers
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isKeyboardHelpOpen: boolean;
  setKeyboardHelpOpen: (open: boolean) => void;
  isOnboardingTourOpen: boolean;
  setOnboardingTourOpen: (open: boolean) => void;

  // Persistent Running Jobs Tray
  runningJobs: RunningJob[];
  addRunningJob: (job: RunningJob) => void;
  updateRunningJob: (jobId: string, updates: Partial<RunningJob>) => void;
  removeRunningJob: (jobId: string) => void;

  // Notification Toast
  toast: { message: string; type?: 'info' | 'success' | 'warn' | 'error' } | null;
  showToast: (message: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  expertMode: localStorage.getItem('evolve_expert_mode') === 'true',
  setExpertMode: (val) => {
    localStorage.setItem('evolve_expert_mode', String(val));
    set({ expertMode: val });
  },

  theme: (localStorage.getItem('evolve_theme') as 'dark' | 'light') || 'dark',
  setTheme: (t) => {
    localStorage.setItem('evolve_theme', t);
    set({ theme: t });
  },

  isDemoMode: false,
  setDemoMode: (val) => set({ isDemoMode: val }),

  activeProject: DEMO_PROJECT,
  setActiveProject: (p) => set({ activeProject: p }),

  selectedExperimentId: null,
  setSelectedExperimentId: (id) => set({ selectedExperimentId: id }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  isKeyboardHelpOpen: false,
  setKeyboardHelpOpen: (open) => set({ isKeyboardHelpOpen: open }),

  isOnboardingTourOpen: !localStorage.getItem('evolve_tour_completed'),
  setOnboardingTourOpen: (open) => {
    if (!open) localStorage.setItem('evolve_tour_completed', 'true');
    set({ isOnboardingTourOpen: open });
  },

  runningJobs: [],
  addRunningJob: (job) => set((state) => ({ runningJobs: [...state.runningJobs, job] })),
  updateRunningJob: (jobId, updates) => set((state) => ({
    runningJobs: state.runningJobs.map(j => j.jobId === jobId ? { ...j, ...updates } : j)
  })),
  removeRunningJob: (jobId) => set((state) => ({
    runningJobs: state.runningJobs.filter(j => j.jobId !== jobId)
  })),

  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set((state) => (state.toast?.message === message ? { toast: null } : state));
    }, 4000);
  },
  clearToast: () => set({ toast: null })
}));
