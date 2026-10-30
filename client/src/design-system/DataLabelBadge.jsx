import React from 'react';
import { DATA_LABELS } from './tokens';
import { Info } from 'lucide-react';

/**
 * Honest Data Label Badge:
 * Strictly labels whether data is REAL, SIMULATED, MOCK, or DEMO.
 * Never mixed in a single chart without explicit disclosure.
 */
export function DataLabelBadge({ type = 'REAL', size = 'sm', className = '' }) {
  const normType = (type || 'REAL').toUpperCase().trim();
  const config = DATA_LABELS[normType] || DATA_LABELS.REAL;

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.2',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-semibold tracking-wider rounded border cursor-help ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: config.color
      }}
      title={`Data Origin [${config.label}]: ${config.description}`}
      aria-label={`Data source origin: ${config.label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
      <span>{config.label}</span>
      <Info size={11} className="opacity-60" aria-hidden="true" />
    </span>
  );
}

export default DataLabelBadge;
