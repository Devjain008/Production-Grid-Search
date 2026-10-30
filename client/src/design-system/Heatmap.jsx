import React, { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * Heatmap Component:
 * Visualizes Strategy x Bottleneck win rates with empirical honesty.
 * Invariant: Cells with n < 5 are strictly greyed out with 'Not enough data'.
 */
export function Heatmap({
  strategies = ['batch', 'cache', 'async', 'index', 'pagination', 'pool', 'compression'],
  categories = ['db_n_plus_one', 'unindexed_query', 'sync_blocking', 'unbounded_payload', 'memory_leak'],
  data = {}, // { [`${category}:${strategy}`]: { winRate: 0.82, n: 12, accepted: 10, total: 12 } }
  onCellClick,
  className = ''
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  const formatStrategy = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const formatCategory = (c) => c.replace(/_/g, ' ');

  return (
    <div className={`p-4 rounded-xl border border-slate-800 bg-slate-950 font-sans ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Strategy Win Rate by Bottleneck Category
          </span>
          <p className="text-[11px] text-slate-500">
            Empirical success rate (Accepted / Total attempts). Cells with n &lt; 5 are greyed out.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-800/80 border border-slate-700" />
            <span className="text-[11px]">n &lt; 5 (Insufficient)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-600/30 border border-emerald-500/40" />
            <span className="text-[11px]">High win rate</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left font-medium text-slate-400 border-b border-slate-800 min-w-[140px]">
                Bottleneck
              </th>
              {strategies.map(s => (
                <th key={s} className="p-2 text-center font-medium text-slate-300 border-b border-slate-800 min-w-[85px]">
                  {formatStrategy(s)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat} className="border-b border-slate-900/60 hover:bg-slate-900/30">
                <td className="p-2 font-mono text-slate-300 font-medium capitalize">
                  {formatCategory(cat)}
                </td>
                {strategies.map(strat => {
                  const key = `${cat}:${strat}`;
                  const cell = data[key] || { winRate: 0, n: 0, accepted: 0, total: 0 };
                  const hasEnoughData = cell.n >= 5;
                  const winRatePct = Math.round(cell.winRate * 100);

                  // Color mapping
                  let cellStyle = 'bg-slate-900/40 text-slate-600 border border-slate-800/60';
                  if (hasEnoughData) {
                    if (winRatePct >= 70) {
                      cellStyle = 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:border-emerald-500';
                    } else if (winRatePct >= 40) {
                      cellStyle = 'bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 hover:border-indigo-500';
                    } else {
                      cellStyle = 'bg-rose-950/30 text-rose-300 border border-rose-800/40 hover:border-rose-500';
                    }
                  }

                  return (
                    <td key={strat} className="p-1">
                      <button
                        onClick={() => onCellClick && onCellClick({ category: cat, strategy: strat, ...cell })}
                        onMouseEnter={() => setHoveredCell({ cat, strat, ...cell })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`w-full py-2 px-1 rounded flex flex-col items-center justify-center transition-all ${cellStyle}`}
                        title={`${formatCategory(cat)} with ${formatStrategy(strat)}: ${
                          hasEnoughData ? `${winRatePct}% win rate (n=${cell.n})` : `n=${cell.n} (Not enough data, minimum 5 required)`
                        }`}
                      >
                        {hasEnoughData ? (
                          <>
                            <span className="font-bold font-mono text-sm tabular-nums">
                              {winRatePct}%
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              n={cell.n}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                              n &lt; 5
                            </span>
                            <span className="text-[9px] text-slate-600">
                              {cell.n > 0 ? `n=${cell.n}` : '0 data'}
                            </span>
                          </>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hoveredCell && (
        <div className="mt-3 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span className="text-slate-300">
            {formatCategory(hoveredCell.cat)} + {formatStrategy(hoveredCell.strat)}
          </span>
          <span>
            {hoveredCell.n >= 5
              ? `Win Rate: ${Math.round(hoveredCell.winRate * 100)}% (${hoveredCell.accepted || 0}/${hoveredCell.total || hoveredCell.n} accepted)`
              : `Insufficient data (${hoveredCell.n || 0} attempts logged; >= 5 required for reliable policy guidance)`}
          </span>
        </div>
      )}
    </div>
  );
}

export default Heatmap;
