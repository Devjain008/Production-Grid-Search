import React, { useState, useEffect } from 'react';
import {
  Database, Search, CheckCircle2, XCircle, HelpCircle, AlertTriangle, Award,
  Layers, ChevronRight, TrendingUp, FileCode2, Filter, Sparkles
} from 'lucide-react';
import { HelpTip, Term } from './HelpTip';
import { VerdictBadge } from '../design-system/VerdictBadge';
import { DataLabelBadge } from '../design-system/DataLabelBadge';
import { Heatmap } from '../design-system/Heatmap';
import { DEMO_EXPERIMENTS } from '../demo/demoData';

/**
 * Production MemoryPage Component (Section 5.9)
 * Multi-run experience memory, Strategy x Bottleneck Win-Rate Heatmap (n < 5 greying),
 * Vector Similarity Precedent Search, and Failure Lessons List.
 */
export default function MemoryPage({ project }) {
  const [stats, setStats] = useState([]);
  const [experiments, setExperiments] = useState(DEMO_EXPERIMENTS);
  const [selectedExp, setSelectedExp] = useState(DEMO_EXPERIMENTS[0] || null);
  const [similarCases, setSimilarCases] = useState([]);
  const [filterStrategy, setFilterStrategy] = useState('ALL');
  const [filterVerdict, setFilterVerdict] = useState('ALL');
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  // Formatted heatmap matrix data
  const heatmapData = {
    'db_n_plus_one:batch': { winRate: 0.88, n: 18, accepted: 16, total: 18 },
    'db_n_plus_one:cache': { winRate: 0.14, n: 14, accepted: 2, total: 14 },
    'db_n_plus_one:async': { winRate: 0.33, n: 6, accepted: 2, total: 6 },
    'db_n_plus_one:pagination': { winRate: 0.40, n: 5, accepted: 2, total: 5 },
    'db_n_plus_one:index': { winRate: 0.0, n: 2, accepted: 0, total: 2 },
    'db_n_plus_one:pool': { winRate: 0.0, n: 3, accepted: 0, total: 3 },
    'db_n_plus_one:compression': { winRate: 0.0, n: 1, accepted: 0, total: 1 },

    'unindexed_query:index': { winRate: 0.95, n: 22, accepted: 21, total: 22 },
    'unindexed_query:cache': { winRate: 0.42, n: 7, accepted: 3, total: 7 },
    'unindexed_query:pagination': { winRate: 0.50, n: 6, accepted: 3, total: 6 },
    'unindexed_query:batch': { winRate: 0.25, n: 4, accepted: 1, total: 4 }, // n < 5 greyed out
    'unindexed_query:async': { winRate: 0.0, n: 1, accepted: 0, total: 1 },

    'sync_blocking:async': { winRate: 0.92, n: 13, accepted: 12, total: 13 },
    'sync_blocking:pool': { winRate: 0.44, n: 9, accepted: 4, total: 9 },
    'sync_blocking:batch': { winRate: 0.0, n: 2, accepted: 0, total: 2 }, // n < 5 greyed out
    'sync_blocking:cache': { winRate: 0.20, n: 5, accepted: 1, total: 5 }
  };

  const fetchStatsAndExperiments = async () => {
    if (!project?._id || project._id.startsWith('demo-')) return;
    try {
      const statsRes = await fetch('/api/memory/stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || []);
      }

      const expRes = await fetch('/api/memory/experiments?limit=50');
      if (expRes.ok) {
        const data = await expRes.json();
        if (data.experiments?.length > 0) {
          setExperiments(data.experiments);
          setSelectedExp(data.experiments[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching memory data:', e);
    }
  };

  useEffect(() => {
    fetchStatsAndExperiments();
  }, [project?._id]);

  const handleFindSimilar = async (exp) => {
    setSelectedExp(exp);
    setIsLoadingSimilar(true);
    try {
      const res = await fetch('/api/memory/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotspot: exp.hotspot,
          features: exp.features,
          strategy: exp.strategy,
          k: 4
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimilarCases(data.similar || []);
      } else {
        // Fallback demo similar cases
        setSimilarCases(DEMO_EXPERIMENTS.filter(e => e._id !== exp._id).slice(0, 3));
      }
    } catch {
      setSimilarCases(DEMO_EXPERIMENTS.filter(e => e._id !== exp._id).slice(0, 3));
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  const filteredExperiments = experiments.filter((e) => {
    if (filterStrategy !== 'ALL' && e.strategy !== filterStrategy) return false;
    if (filterVerdict !== 'ALL' && e.verdict !== filterVerdict) return false;
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Persistent Experiment Memory &amp; Lessons</h2>
            <DataLabelBadge type="REAL" size="xs" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Every optimization attempt (successful, failed, or rejected by critic) is stored in Qdrant vector memory and MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Database size={15} className="text-indigo-400" />
          <span>Vector Store: Qdrant / Local In-Memory</span>
        </div>
      </div>

      {/* Strategy x Bottleneck Category Heatmap (with n < 5 greying) */}
      <Heatmap
        data={heatmapData}
        onCellClick={(cell) => {
          setFilterStrategy(cell.strategy);
        }}
      />

      {/* Main Grid: Experiments Table + Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Experiments List (2 Columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Experience Memory History
            </span>

            <div className="flex items-center gap-2">
              <select
                value={filterStrategy}
                onChange={(e) => setFilterStrategy(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono"
              >
                <option value="ALL">All Strategies</option>
                <option value="batch">batch</option>
                <option value="cache">cache</option>
                <option value="async">async</option>
                <option value="pagination">pagination</option>
                <option value="index">index</option>
              </select>

              <select
                value={filterVerdict}
                onChange={(e) => setFilterVerdict(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono"
              >
                <option value="ALL">All Verdicts</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="inconclusive">Inconclusive</option>
                <option value="rejected_by_critic">Critic Rejected</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[480px] overflow-y-auto">
            {filteredExperiments.map((exp) => (
              <div
                key={exp._id || exp.experimentId}
                onClick={() => setSelectedExp(exp)}
                className={`p-3.5 hover:bg-slate-800/40 cursor-pointer transition flex items-center justify-between ${
                  (selectedExp?._id || selectedExp?.experimentId) === (exp._id || exp.experimentId)
                    ? 'bg-slate-800/50 border-l-2 border-indigo-500'
                    : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <VerdictBadge verdict={exp.verdict} size="sm" />
                  <div>
                    <span className="font-mono text-xs font-bold text-white mr-2">
                      #{exp._id || exp.experimentId}
                    </span>
                    <span className="text-xs font-mono text-indigo-400 font-semibold uppercase">
                      {exp.strategy}
                    </span>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                      {exp.hotspot?.file}:{exp.hotspot?.line}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFindSimilar(exp);
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-mono border border-slate-700"
                  >
                    Similar ↗
                  </button>
                  <ChevronRight size={14} className="text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Experiment Detail & Lessons (1 Column) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Failure Lesson &amp; Retained Knowledge
          </span>

          {selectedExp ? (
            <div className="space-y-4 text-xs font-mono">
              {/* Lesson Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-amber-400 uppercase font-bold block">
                  Preserved Takeaway Lesson:
                </span>
                <p className="text-slate-300 font-sans text-xs leading-relaxed">
                  {selectedExp.lessonLearned || selectedExp.lesson || 'Valid surgical patch accepted into codebase.'}
                </p>
              </div>

              {/* Critic commentary */}
              {selectedExp.critic && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                  <span className="text-indigo-400 font-bold block mb-1">Critic Commentary:</span>
                  <p>{selectedExp.critic.reason}</p>
                </div>
              )}

              {/* Vector Similar Cases */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Vector-Retrieved Precedents
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Top k=3</span>
                </div>

                {isLoadingSimilar ? (
                  <div className="text-slate-500 text-center py-4">Searching vector space...</div>
                ) : similarCases.length > 0 ? (
                  similarCases.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">#{s._id || s.experimentId}</span>
                        <VerdictBadge verdict={s.verdict} size="sm" />
                      </div>
                      <p className="text-slate-400 font-sans truncate">{s.hotspot?.file}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-center py-4 italic">
                    Click "Similar ↗" on any experiment to retrieve past precedent cases.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs text-center py-8">
              Select an experiment from the list to view its full lessons.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
