import React from 'react';
import { HelpTip } from '../components/HelpTip';
import { DataLabelBadge } from './DataLabelBadge';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

/**
 * KPI Card with Evidence-First Annotations
 * Every metric displays current value, baseline delta, 95% CI, sample size n, and origin badge.
 */
export function KpiCard({
  title,
  helpTerm,
  value,
  unit = '',
  baselineValue,
  ci,
  n = 5,
  dataType = 'REAL',
  lowerIsBetter = true,
  sparklineData = [],
  className = ''
}) {
  const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
  const numBase = typeof baselineValue === 'number' ? baselineValue : parseFloat(baselineValue) || 0;

  let deltaPct = 0;
  let hasDelta = false;
  if (numBase > 0 && baselineValue !== undefined) {
    deltaPct = ((numVal - numBase) / numBase) * 100;
    hasDelta = true;
  }

  const isImprovement = lowerIsBetter ? deltaPct < 0 : deltaPct > 0;
  const absDelta = Math.abs(deltaPct).toFixed(1);
  const formattedDelta = deltaPct > 0 ? `+${absDelta}%` : `-${absDelta}%`;

  return (
    <div className={`p-4 rounded-xl border bg-slate-900/80 border-slate-800 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-colors ${className}`}>
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-slate-400 truncate">{title}</span>
          {helpTerm && <HelpTip term={helpTerm} value={numVal} />}
        </div>
        <DataLabelBadge type={dataType} size="xs" />
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold font-mono tabular-nums text-slate-100">
          {numVal.toLocaleString()}
        </span>
        {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
      </div>

      {/* Baseline Comparison & Rigor */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
        {hasDelta ? (
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                Math.abs(deltaPct) < 1
                  ? 'text-slate-400 bg-slate-800'
                  : isImprovement
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
              }`}
            >
              {Math.abs(deltaPct) < 1 ? (
                <Minus size={11} />
              ) : isImprovement ? (
                lowerIsBetter ? <TrendingDown size={11} /> : <TrendingUp size={11} />
              ) : (
                lowerIsBetter ? <TrendingUp size={11} /> : <TrendingDown size={11} />
              )}
              {formattedDelta}
            </span>
            <span className="text-slate-500 text-[11px]">vs base</span>
          </div>
        ) : (
          <span className="text-slate-500 text-[11px]">Baseline benchmark</span>
        )}

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          {ci && Array.isArray(ci) && (
            <span title="95% Confidence Interval">CI [{ci[0]}, {ci[1]}]</span>
          )}
          <span title={`Derived from ${n} empirical load test runs`}>n={n}</span>
        </div>
      </div>
    </div>
  );
}

export default KpiCard;
