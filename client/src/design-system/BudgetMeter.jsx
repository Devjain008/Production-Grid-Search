import React from 'react';

/**
 * BudgetMeter Component:
 * Tracks consumption of limited optimization resources against user budget constraints:
 * - Experiments executed vs maxExperiments
 * - Tokens consumed vs tokenBudget
 * - Benchmark runs vs benchmarkBudget
 * - Elapsed wall-clock time vs maxMinutes
 */
export function BudgetMeter({
  label,
  used = 0,
  limit = 10,
  unit = '',
  costFormatted,
  className = ''
}) {
  const numUsed = Number(used) || 0;
  const numLimit = Number(limit) || 1;
  const pct = Math.min(100, Math.max(0, (numUsed / numLimit) * 100));

  // Determine threshold color
  let barColor = 'bg-indigo-500';
  let badgeColor = 'text-slate-300';
  if (pct >= 90) {
    barColor = 'bg-rose-500';
    badgeColor = 'text-rose-400';
  } else if (pct >= 70) {
    barColor = 'bg-amber-500';
    badgeColor = 'text-amber-400';
  }

  return (
    <div className={`p-3 rounded-lg border bg-slate-900/70 border-slate-800 ${className}`}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-300">{label}</span>
        <span className={`font-mono tabular-nums font-semibold ${badgeColor}`}>
          {numUsed.toLocaleString()} / {numLimit.toLocaleString()} {unit}
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={numUsed}
          aria-valuemin={0}
          aria-valuemax={numLimit}
          aria-label={`${label} usage`}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
        <span>{pct.toFixed(0)}% consumed</span>
        {costFormatted ? (
          <span className="text-slate-400">Est. cost: {costFormatted}</span>
        ) : (
          <span>{(numLimit - numUsed).toLocaleString()} remaining</span>
        )}
      </div>
    </div>
  );
}

export default BudgetMeter;
