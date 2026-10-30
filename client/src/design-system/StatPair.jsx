import React from 'react';
import { ArrowRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';

/**
 * StatPair Component: Evidence-First Performance Comparison
 * Enforces scientific rigor:
 * - Always shows baseline -> current, delta %, 95% Confidence Interval, sample size n, and p-value.
 * - If verdict is 'inconclusive' or p >= 0.05, NEVER renders a green win badge.
 *   Instead displays 'No reliable difference (within noise)'.
 */
export function StatPair({
  metricName = 'p95',
  unit = 'ms',
  before,
  after,
  ci, // [lower, upper] e.g. [-45, -30]
  nBefore = 5,
  nAfter = 5,
  pValue,
  verdict = 'accepted',
  lowerIsBetter = true,
  className = ''
}) {
  const isInconclusive = verdict === 'inconclusive' || (typeof pValue === 'number' && pValue >= 0.05);

  // Compute percentage difference
  const numBefore = typeof before === 'number' ? before : parseFloat(before) || 0;
  const numAfter = typeof after === 'number' ? after : parseFloat(after) || 0;
  
  let deltaPct = 0;
  if (numBefore > 0) {
    deltaPct = ((numAfter - numBefore) / numBefore) * 100;
  }

  const isImprovement = lowerIsBetter ? deltaPct < 0 : deltaPct > 0;
  const absDelta = Math.abs(deltaPct).toFixed(1);
  const formattedDelta = deltaPct > 0 ? `+${absDelta}%` : `-${absDelta}%`;

  return (
    <div className={`p-3 rounded-lg border bg-slate-900/60 border-slate-800 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {metricName} Comparison
        </span>
        {isInconclusive ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Minus size={12} />
            No reliable difference
          </span>
        ) : isImprovement ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {lowerIsBetter ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {formattedDelta} validated gain
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            {lowerIsBetter ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formattedDelta} regression
          </span>
        )}
      </div>

      {/* Numerical Progression */}
      <div className="flex items-center gap-2 text-sm font-mono tabular-nums text-slate-200">
        <span>{numBefore.toLocaleString()} {unit}</span>
        <ArrowRight size={13} className="text-slate-500 shrink-0" />
        <span className={isInconclusive ? 'text-slate-200' : isImprovement ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
          {numAfter.toLocaleString()} {unit}
        </span>
      </div>

      {/* Rigorous Evidence Subtitle */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-slate-400">
        {ci && Array.isArray(ci) && ci.length === 2 && (
          <span title="95% Bootstrap Confidence Interval of difference">
            95% CI [{ci[0] > 0 ? `+${ci[0]}` : ci[0]}%, {ci[1] > 0 ? `+${ci[1]}` : ci[1]}%]
          </span>
        )}
        <span>•</span>
        <span title={`Benchmark runs: ${nBefore} baseline runs vs ${nAfter} patch runs`}>
          n={nBefore} vs {nAfter}
        </span>
        {typeof pValue === 'number' && (
          <>
            <span>•</span>
            <span title="Mann-Whitney U statistical significance value">
              p={pValue.toFixed(3)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default StatPair;
