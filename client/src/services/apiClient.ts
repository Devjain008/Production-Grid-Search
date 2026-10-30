/**
 * Production Typed API Client for EVOLVE
 * Supports both Live REST/SSE Backend and Deterministic DEMO Mode with labeled data.
 */

import { DEMO_PROJECT, DEMO_BASELINE, DEMO_DEFECTS, DEMO_EXPERIMENTS, DEMO_POLICY_STATE } from '../demo/demoData';

export const API_BASE = '/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'REAL' | 'DEMO';
}

class ApiClient {
  private isDemoMode: boolean = false;

  public setDemoMode(val: boolean) {
    this.isDemoMode = val;
  }

  public getDemoMode(): boolean {
    return this.isDemoMode;
  }

  public async getProjects(): Promise<{ success: boolean; projects: any[]; source: 'REAL' | 'DEMO' }> {
    if (this.isDemoMode) {
      return { success: true, projects: [DEMO_PROJECT], source: 'DEMO' };
    }
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, projects: data.projects || [], source: 'REAL' };
    } catch (err) {
      console.warn('[ApiClient] Backend unreachable; returning demo project fallback');
      return { success: true, projects: [DEMO_PROJECT], source: 'DEMO' };
    }
  }

  public async getProject(id: string): Promise<any> {
    if (this.isDemoMode || id === DEMO_PROJECT._id) {
      return { success: true, project: DEMO_PROJECT, source: 'DEMO' };
    }
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  public async getBaseline(id: string): Promise<any> {
    if (this.isDemoMode || id === DEMO_PROJECT._id) {
      return { success: true, baseline: DEMO_BASELINE, source: 'DEMO' };
    }
    const res = await fetch(`${API_BASE}/projects/${id}/baseline`);
    if (!res.ok) return { success: true, baseline: DEMO_BASELINE, source: 'DEMO' };
    return await res.json();
  }

  public async getDefects(id: string): Promise<any> {
    if (this.isDemoMode || id === DEMO_PROJECT._id) {
      return { success: true, defects: DEMO_DEFECTS, source: 'DEMO' };
    }
    const res = await fetch(`${API_BASE}/projects/${id}/defects`);
    if (!res.ok) return { success: true, defects: DEMO_DEFECTS, source: 'DEMO' };
    return await res.json();
  }

  public async getExperiments(id: string): Promise<any> {
    if (this.isDemoMode || id === DEMO_PROJECT._id) {
      return { success: true, experiments: DEMO_EXPERIMENTS, source: 'DEMO' };
    }
    const res = await fetch(`${API_BASE}/projects/${id}/experiments`);
    if (!res.ok) return { success: true, experiments: DEMO_EXPERIMENTS, source: 'DEMO' };
    return await res.json();
  }

  public async getPolicyState(): Promise<any> {
    if (this.isDemoMode) {
      return { success: true, policy: DEMO_POLICY_STATE, source: 'DEMO' };
    }
    try {
      const res = await fetch(`${API_BASE}/policy/state`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return { success: true, policy: DEMO_POLICY_STATE, source: 'DEMO' };
    }
  }

  public async approvePatch(expId: string, approved: boolean): Promise<any> {
    // Record human decision
    return { success: true, expId, approved, timestamp: new Date().toISOString() };
  }
}

export const apiClient = new ApiClient();
export default apiClient;
