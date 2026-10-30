import React, { useState } from 'react';
import { Table, Eye } from 'lucide-react';
import { OKABE_ITO } from './tokens';

/**
 * Boxplot Component for Latency Distributions
 * Visualizes median, IQR (25th-75th), whiskers (5th-95th), and raw jittered points.
 * Includes WCAG AA 'View as table' accessibility toggle and colorblind-safe styling.
 */
export function Boxplot({
  baselineData = [], // array of raw numbers (ms)
  candidateData = [], // array of raw numbers (ms)
  baselineLabel = 'Baseline Run',
  candidateLabel = 'Optimized Candidate',
  unit = 'ms',
  height = 200,
  className = ''
}) {
  const [viewTable, setViewTable] = useState(false);

  // Compute five-number summary + mean
  const computeStats = (arr) => {
    if (!arr || arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const n = sorted.length;
    const min = sorted[0];
    const max = sorted[n - 1];
    const p = (pct) => {
      const idx = (pct / 100) * (n - 1);
      const low = Math.floor(idx);
      const high = Math.ceil(idx);
      const weight = idx - low;
      return sorted[low] * (1 - weight) + sorted[high] * weight;
    };
    const p25 = p(25);
    const median = p(50);
    const p75 = p(75);
    const p95 = p(95);
    const p5 = p(5);
    const mean = sorted.reduce((a, b) => a + b, 0) / n;
    return { min, p5, p25, median, p75, p95, max, mean, n, sorted };
  };

  const bStats = computeStats(baselineData);
  const cStats = computeStats(candidateData);

  if (!bStats && !cStats) {
    return (
      <div className="p-4 rounded-lg border border-slate-800 text-slate-500 text-xs text-center italic">
        No empirical latency run distribution available.
      </div>
    );
  }

  // Determine global min and max scale with 5% padding
  const allValues = [...(baselineData || []), ...(candidateData || [])];
  const globalMin = Math.max(0, Math.min(...allValues) * 0.9);
  const globalMax = Math.max(...allValues) * 1.08;
  const range = globalMax - globalMin || 1;

  const scaleY = (val) => {
    // 0 is bottom (high latency), height is top? Let's do horizontal boxplots: scaleX
    return ((val - globalMin) / range) * 100;
  };

  const renderHorizontalBox = (stats, label, color, yOffset) => {
    if (!stats) return null;
    const x5 = scaleY(stats.p5);
    const x25 = scaleY(stats.p25);
    const xMed = scaleY(stats.median);
    const x75 = scaleY(stats.p75);
    const x95 = scaleY(stats.p95);

    return (
      <g key={label} transform={`translate(0, ${yOffset})`}>
        {/* Label */}
        <text x="10" y="24" fill="#94a3b8" fontSize="11" fontFamily="Inter, sans-serif" fontWeight="500">
          {label} (n={stats.n})
        </text>

        {/* Whisker Line (p5 to p95) */}
        <line
          x1={`${140 + (x5 * 3.5)}`}
          y1="20"
          x2={`${140 + (x95 * 3.5)}`}
          y2="20"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="2,2"
        />

        {/* Whisker Caps */}
        <line x1={`${140 + (x5 * 3.5)}`} y1="12" x2={`${140 + (x5 * 3.5)}`} y2="28" stroke={color} strokeWidth="1.5" />
        <line x1={`${140 + (x95 * 3.5)}`} y1="12" x2={`${140 + (x95 * 3.5)}`} y2="28" stroke={color} strokeWidth="1.5" />

        {/* IQR Box (p25 to p75) */}
        <rect
          x={`${140 + (x25 * 3.5)}`}
          y="10"
          width={`${Math.max(2, (x75 - x25) * 3.5)}`}
          height="20"
          fill={color}
          fillOpacity="0.25"
          stroke={color}
          strokeWidth="1.5"
          rx="3"
        />

        {/* Median Line */}
        <line
          x1={`${140 + (xMed * 3.5)}`}
          y1="8"
          x2={`${140 + (xMed * 3.5)}`}
          y2="32"
          stroke="#f8fafc"
          strokeWidth="2.5"
        />

        {/* Raw Points Jitter */}
        {stats.n <= 25 &&
          stats.sorted.map((val, idx) => {
            const xVal = scaleY(val);
            const jitterY = 20 + ((idx % 5) - 2) * 2;
            return (
              <circle
                key={idx}
                cx={`${140 + (xVal * 3.5)}`}
                cy={jitterY}
                r="3"
                fill={color}
                fillOpacity="0.7"
                stroke="#0f172a"
                strokeWidth="1"
              >
                <title>{`${label} Run #${idx + 1}: ${val} ${unit}`}</title>
              </circle>
            );
          })}

        {/* Median Annotation */}
        <text
          x={`${145 + (x75 * 3.5)}`}
          y="24"
          fill="#cbd5e1"
          fontSize="11"
          fontFamily="JetBrains Mono, monospace"
          className="tabular-nums font-semibold"
        >
          {stats.median.toFixed(0)} {unit}
        </text>
      </g>
    );
  };

  return (
    <div className={`p-4 rounded-xl border border-slate-800 bg-slate-950 font-sans ${className}`}>
      {/* Header and Accessibility Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Latency Distribution (Boxplot & Raw Runs)
          </span>
          <p className="text-[11px] text-slate-500">
            Median bar, 25-75th IQR box, and 5-95th percentile whiskers
          </p>
        </div>

        <button
          onClick={() => setViewTable(!viewTable)}
          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded border border-indigo-900/60 bg-indigo-950/20"
        >
          {viewTable ? <Eye size={13} /> : <Table size={13} />}
          {viewTable ? 'View Chart' : 'View as Table'}
        </button>
      </div>

      {viewTable ? (
        /* Accessible Table Alternative */
        <div className="overflow-x-auto text-xs font-mono">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Condition</th>
                <th className="py-2 px-3">Runs (n)</th>
                <th className="py-2 px-3">Min</th>
                <th className="py-2 px-3">p25</th>
                <th className="py-2 px-3 font-bold text-slate-200">Median</th>
                <th className="py-2 px-3">p75</th>
                <th className="py-2 px-3">p95</th>
                <th className="py-2 px-3">Max</th>
              </tr>
            </thead>
            <tbody>
              {bStats && (
                <tr className="border-b border-slate-900 text-slate-300">
                  <td className="py-2 px-3 font-semibold text-sky-400">{baselineLabel}</td>
                  <td className="py-2 px-3">{bStats.n}</td>
                  <td className="py-2 px-3">{bStats.min} {unit}</td>
                  <td className="py-2 px-3">{bStats.p25.toFixed(1)} {unit}</td>
                  <td className="py-2 px-3 font-bold text-white">{bStats.median.toFixed(1)} {unit}</td>
                  <td className="py-2 px-3">{bStats.p75.toFixed(1)} {unit}</td>
                  <td className="py-2 px-3">{bStats.p95.toFixed(1)} {unit}</td>
                  <td className="py-2 px-3">{bStats.max} {unit}</td>
                </tr>
              )}
              {cStats && (
                <tr className="text-slate-300">
                  <td className="py-2 px-3 font-semibold text-emerald-400">{candidateLabel}</td>
                  <td className="py-2 px-3">{cStats.n}</td>
                  <td className="py-2 px-3">{cStats.min} {unit}</td>
                  <td className="py-2 px-3">{cStats.p25.toFixed(1)} {unit}</td>
                  <td className="py-2 px-3 font-bold text-white">{cStats.median.toFixed(1)} {unit}</td>
                  <td className="py-2 px-3">{cStats.p75.toFixed(1)} {unit}</td>
                  <td className="py-2 px-3">{cStats.p95.toFixed(1)} {unit}</td>
                  <td className="py-2 px-3">{cStats.max} {unit}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* SVG Boxplot Visual */
        <div className="overflow-x-auto">
          <svg width="100%" height={cStats ? 120 : 70} viewBox="0 0 540 120" className="min-w-[480px]">
            {bStats && renderHorizontalBox(bStats, baselineLabel, OKABE_ITO.skyBlue, 0)}
            {cStats && renderHorizontalBox(cStats, candidateLabel, OKABE_ITO.bluishGreen, 50)}
          </svg>
        </div>
      )}
    </div>
  );
}

export default Boxplot;
