import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { VERDICTS } from './tokens';

const ICONS = {
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ShieldAlert
};

/**
 * Accessible Verdict Badge: Color is NEVER the only signal!
 * Displays distinct icon + text label + tooltip for colorblind safety.
 */
export function VerdictBadge({ verdict, size = 'md', className = '' }) {
  const normVerdict = (verdict || 'inconclusive').toLowerCase().trim();
  const config = VERDICTS[normVerdict] || VERDICTS.inconclusive;
  const IconComponent = ICONS[config.iconName] || AlertCircle;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  };

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: config.color
      }}
      title={`${config.label}: ${config.plainMeaning}`}
      role="status"
      aria-label={config.label}
    >
      <IconComponent size={iconSizes[size]} aria-hidden="true" className="shrink-0" />
      <span>{config.shortLabel}</span>
    </span>
  );
}

export default VerdictBadge;
