/**
 * EVOLVE Design System Tokens & Typography
 * WCAG AA Contrast, Okabe-Ito Colorblind-Safe Palette & Semantic Verdicts
 */

export const OKABE_ITO = {
  orange: '#E69F00',
  skyBlue: '#56B4E9',
  bluishGreen: '#009E73',
  yellow: '#F0E442',
  blue: '#0072B2',
  vermillion: '#D55E00',
  reddishPurple: '#CC79A7',
  charcoal: '#333333'
} as const;

export type VerdictType = 
  | 'accepted' 
  | 'rejected' 
  | 'inconclusive' 
  | 'errored' 
  | 'rejected_by_critic';

export interface VerdictConfig {
  label: string;
  shortLabel: string;
  iconName: 'CheckCircle2' | 'XCircle' | 'AlertCircle' | 'AlertTriangle' | 'ShieldAlert';
  color: string;
  bgColor: string;
  borderColor: string;
  plainMeaning: string;
}

export const VERDICTS: Record<VerdictType, VerdictConfig> = {
  accepted: {
    label: 'Verdict: Accepted',
    shortLabel: 'Accepted',
    iconName: 'CheckCircle2',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    plainMeaning: 'Fix passed all tests, measurably improved performance, and met significance standards.'
  },
  rejected: {
    label: 'Verdict: Rejected',
    shortLabel: 'Rejected',
    iconName: 'XCircle',
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    plainMeaning: 'Fix failed functional tests, degraded speed, or caused memory regressions.'
  },
  inconclusive: {
    label: 'Verdict: Inconclusive (Noise)',
    shortLabel: 'Inconclusive',
    iconName: 'AlertCircle',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    plainMeaning: 'Observed speed difference is within benchmark run-to-run noise (p >= 0.05).'
  },
  errored: {
    label: 'Verdict: Error',
    shortLabel: 'Error',
    iconName: 'AlertTriangle',
    color: '#a78bfa',
    bgColor: 'rgba(167, 139, 250, 0.12)',
    borderColor: 'rgba(167, 139, 250, 0.3)',
    plainMeaning: 'The sandbox environment or test harness encountered a runtime crash.'
  },
  rejected_by_critic: {
    label: 'Verdict: Critic Rejected',
    shortLabel: 'Critic Rejected',
    iconName: 'ShieldAlert',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    plainMeaning: 'AI safety filter caught a reward-hack, missing TTL, or broken syntax before testing.'
  }
};

export type DataLabelType = 'REAL' | 'SIMULATED' | 'MOCK' | 'DEMO';

export interface DataLabelConfig {
  label: DataLabelType;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const DATA_LABELS: Record<DataLabelType, DataLabelConfig> = {
  REAL: {
    label: 'REAL',
    description: 'Measured directly from actual sandbox load tests on physical execution.',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  SIMULATED: {
    label: 'SIMULATED',
    description: 'Synthesized via statistical simulator for offline policy exploration.',
    color: '#0284c7',
    bgColor: 'rgba(2, 132, 199, 0.1)',
    borderColor: 'rgba(2, 132, 199, 0.3)'
  },
  MOCK: {
    label: 'MOCK',
    description: 'Generated fixtures for deterministic unit and integration test verification.',
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    borderColor: 'rgba(217, 119, 6, 0.3)'
  },
  DEMO: {
    label: 'DEMO',
    description: 'Self-contained sample data allowing full platform exploration without backend setup.',
    color: '#7c3aed',
    bgColor: 'rgba(124, 58, 237, 0.1)',
    borderColor: 'rgba(124, 58, 237, 0.3)'
  }
};
