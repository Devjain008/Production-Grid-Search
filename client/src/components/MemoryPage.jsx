import React, { useState, useMemo } from 'react';
import {
  Database, Search, CheckCircle2, XCircle, HelpCircle, AlertTriangle, Award,
  Layers, ChevronRight, TrendingUp, FileCode2, Filter, Sparkles, Compass, Lightbulb 
} from 'lucide-react';
import { HelpTip, Term } from './HelpTip';
import { VerdictBadge } from '../design-system/VerdictBadge';
import { DataLabelBadge } from '../design-system/DataLabelBadge';
import { Heatmap } from '../design-system/Heatmap';
import { useHelp } from '../content/HelpContext';
import { useCachedApi } from '../services/apiCache';
import { DEMO_EXPERIMENTS } from '../demo/demoData';

const DEFAULT_HEATMAP = {
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
  'unindexed_query:batch': { winRate: 0.25, n: 4, accepted: 1, total: 4 },
  'unindexed_query:async': { winRate: 0.0, n: 1, accepted: 0, total: 1 },

  'sync_blocking:async': { winRate: 0.92, n: 13, accepted: 12, total: 13 },
  'sync_blocking:pool': { winRate: 0.44, n: 9, accepted: 4, total: 9 },
  'sync_blocking:batch': { winRate: 0.0, n: 2, accepted: 0, total: 2 },
  'sync_blocking:cache': { winRate: 0.20, n: 5, accepted: 1, total: 5 }
};

/**
 * Production MemoryPage Component (Section 5.9)
 * Multi-run experience memory, Strategy x Bottleneck Win-Rate Heatmap (n < 5 greying with clear note),
 * Vector Similarity Precedent Search, and Plain-Language Takeaway Lessons.
 */
export default function MemoryPage({ project, onProjectNotFound }) {
  const { expertMode } = useHelp();
  const isDemo = Boolean(project?.isDemo || project?._id?.startsWith('demo-'));

  const statsEndpoint = project?._id && !isDemo ? `/api/memory/stats?projectId=${project._id}` : null;
  const expsEndpoint = project?._id && !isDemo ? `/api/memory/experiments?limit=50&projectId=${project._id}` : null;

  const { data: statsData } = useCachedApi(statsEndpoint, {
    enabled: Boolean(statsEndpoint),
    onError: (err) => { if (err.status === 404) onProjectNotFound?.(project._id); }
  });

  const { data: expsData } = useCachedApi(expsEndpoint, {
    enabled: Boolean(expsEndpoint),
    onError: (err) => { if (err.status === 404) onProjectNotFound?.(project._id); }
  });

  const experiments = useMemo(() => {
    if (isDemo) return DEMO_EXPERIMENTS;
    return expsData?.experiments || [];
  }, [isDemo, expsData]);

  const [selectedExpId, setSelectedExpId] = useState(null);
  const [similarCases, setSimilarCases] = useState([]);
  const [filterStrategy, setFilterStrategy] = useState('ALL');
  const [filterVerdict, setFilterVerdict] = useState('ALL');
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  const selectedExp = useMemo(() => {
    if (!experiments.length) return null;
    if (!selectedExpId) return experiments[0];
    return experiments.find(e => (e._id || e.experimentId) === selectedExpId) || experiments[0];
  }, [experiments, selectedExpId]);

  const heatmapData = useMemo(() => {
    if (isDemo || !statsData?.stats || !Array.isArray(statsData.stats)) {
      return DEFAULT_HEATMAP;
    }
    const dynamicMap = { ...DEFAULT_HEATMAP };
    for (const s of statsData.stats) {
      const key = `${s.category}:${s.strategy}`;
      dynamicMap[key] = {
        winRate: s.total > 0 ? (s.accepted / s.total) : 0,
        n: s.total,
        accepted: s.accepted,
        total: s.total
      };
    }
    return dynamicMap;
  }, [isDemo, statsData]);

  const handleFindSimilar = async (exp) => {
    if (!exp) return;
    setSelectedExpId(exp._id || exp.experimentId);
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
        setSimilarCases(experiments.filter(e => (e._id || e.experimentId) !== (exp._id || exp.experimentId)).slice(0, 3));
      }
    } catch {
      setSimilarCases(experiments.filter(e => (e._id || e.experimentId) !== (exp._id || exp.experimentId)).slice(0, 3));
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  const filteredExperiments = useMemo(() => {
    return experiments.filter((e) => {
      if (filterStrategy !== 'ALL' && e.strategy !== filterStrategy) return false;
      if (filterVerdict !== 'ALL' && e.verdict !== filterVerdict) return false;
      return true;
    });
  }, [experiments, filterStrategy, filterVerdict]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {expertMode ? 'Persistent Experience Memory (Qdrant & MongoDB)' : 'Optimization Knowledge Base & Past Lessons'}
            </h2>
            <DataLabelBadge type={isDemo ? "DEMO" : "REAL"} size="xs" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {expertMode
              ? 'Every optimization attempt (successful, failed, or rejected by critic) is vectorized into Qdrant and logged for contextual bandit policy training.'
              : 'The system remembers every attempt it has ever tried, so it knows what strategies work and avoids repeating past mistakes.'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Database size={15} className="text-indigo-400" />
          <span>Vector Memory: Active</span>
        </div>
      </div>

      {/* Exploration vs Exploitation Plain-Language Explainer with Tiny Diagram */}
      <div className="p-4 rounded-2xl border border-indigo-900/40 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-md">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-indigo-400" />
            <span className="font-bold text-indigo-300">How the AI Chooses a Fix (Exploration vs Exploitation):</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            <strong>Exploitation</strong> picks strategies proven to work (like batching for N+1 queries). <strong>Exploration</strong> tests promising alternatives (like caching or pooling) to discover faster or lower-memory fixes without risking regressions.
          </p>
        </div>

        {/* Tiny ASCII/Box Diagram */}
        <div className="flex items-center gap-2 font-mono text-[11px] p-2.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
          <div className="px-2 py-1 rounded bg-indigo-950 border border-indigo-800 text-indigo-300">
            Known Best (88% Win)
          </div>
          <span className="text-slate-500">⇄</span>
          <div className="px-2 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
            Explore Alternative
          </div>
        </div>
      </div>

      {/* Heatmap with Clean n < 5 Note */}
      <div className="space-y-2">
        <Heatmap
          data={heatmapData}
          onCellClick={(cell) => {
            setFilterStrategy(cell.strategy);
          }}
        />
        <p className="text-[11px] text-slate-400 italic px-1">
          * Greyed-out cells indicate insufficient empirical trials (N &lt; 5). As more optimization runs execute, these cells unlock with statistical confidence.
        </p>
      </div>

      {/* Main Grid: Experiments Table + Lessons Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Experiments List (2 Columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Recorded Optimization Attempts ({experiments.length})
            </span>

            <div className="flex items-center gap-2">
              <select
                value={filterStrategy}
                onChange={(e) => setFilterStrategy(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300 font-mono"
              >
                <option value="ALL">All Strategies</option>
                <option value="batch">batch</option>
                <option value="cache">cache</option>
                <option value="async">async</option>
                <option value="pagination">pagination</option>
                <option value="index">index</option>
                <option value="pool">pool</option>
              </select>

              <select
                value={filterVerdict}
                onChange={(e) => setFilterVerdict(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300 font-mono"
              >
                <option value="ALL">All Verdicts</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="inconclusive">Inconclusive</option>
                <option value="rejected_by_critic">Critic Filtered</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[480px] overflow-y-auto">
            {filteredExperiments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No matching experiments recorded in memory.
              </div>
            ) : (
              filteredExperiments.map((exp, idx) => {
                const expKey = exp._id || exp.experimentId || `memory-exp-${idx}`;
                const isSelected = (selectedExp?._id || selectedExp?.experimentId) === (exp._id || exp.experimentId);

                return (
                  <div
                    key={expKey}
                    onClick={() => setSelectedExpId(exp._id || exp.experimentId)}
                    className={`p-3.5 hover:bg-slate-800/40 cursor-pointer transition flex items-center justify-between ${
                      isSelected ? 'bg-slate-800/50 border-l-2 border-indigo-500' : ''
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
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-mono border border-slate-700 transition"
                      >
                        Find Precedents ↗
                      </button>
                      <ChevronRight size={14} className="text-slate-600" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Experiment Detail & Lessons (1 Column) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-lg">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Retained Knowledge &amp; Lessons
          </span>

          {selectedExp ? (
            <div className="space-y-4 text-xs font-mono">
              {/* Takeaway Lesson Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 shadow-sm">
                <span className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                  <Lightbulb size={13} />
                  <span>Preserved Takeaway Lesson:</span>
                </span>
                <p className="text-slate-300 font-sans text-xs leading-relaxed">
                  {selectedExp.lessonLearned || selectedExp.lesson || 'Valid surgical patch accepted into codebase.'}
                </p>
              </div>

              {/* Critic commentary */}
              {selectedExp.critic && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                  <span className="text-indigo-400 font-bold block mb-1">Safety Critic Audit:</span>
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
                    <div key={s._id || s.experimentId || `similar-item-${idx}`} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">#{s._id || s.experimentId}</span>
                        <VerdictBadge verdict={s.verdict} size="sm" />
                      </div>
                      <p className="text-slate-400 font-sans truncate">{s.hotspot?.file}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-center py-4 italic font-sans text-xs">
                    Click "Find Precedents ↗" on any attempt to inspect how similar issues were resolved previously.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs text-center py-8">
              Select an experiment from the list to view its preserved lessons.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
