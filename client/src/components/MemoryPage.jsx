import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
  FileCode2,
  Filter
} from 'lucide-react';

export default function MemoryPage({ project }) {
  const [stats, setStats] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [selectedExp, setSelectedExp] = useState(null);
  const [similarCases, setSimilarCases] = useState([]);
  const [filterStrategy, setFilterStrategy] = useState('ALL');
  const [filterVerdict, setFilterVerdict] = useState('ALL');
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);

  const fetchStatsAndExperiments = async () => {
    try {
      const statsRes = await fetch('/api/memory/stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || []);
      }

      const expRes = await fetch('/api/memory/experiments?limit=50');
      if (expRes.ok) {
        const data = await expRes.json();
        setExperiments(data.experiments || []);
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
      }
    } catch (e) {
      console.error('Similar search error:', e);
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Database className="w-5 h-5 text-cyan-400" />
          <span>Experiment Memory & Vector Store</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Stores structured experiment telemetry, raw run metrics, and dense semantic embeddings. Powers experience retrieval and Thompson sampling policy learning.
        </p>
      </div>

      {/* Strategy x Category Win-Rate Heatmap Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Strategy Win-Rate Heatmap Matrix</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((s, i) => {
            const isLowSample = s.n < 5;
            let bgClass = 'bg-slate-800/40 text-slate-400 border-slate-700/60';
            if (!isLowSample) {
              if (s.winRate >= 70) bgClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-800';
              else if (s.winRate >= 40) bgClass = 'bg-cyan-950/60 text-cyan-300 border-cyan-800';
              else bgClass = 'bg-rose-950/60 text-rose-300 border-rose-800';
            }

            return (
              <div key={i} className={`p-3 rounded-xl border ${bgClass} transition flex flex-col justify-between`}>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">{s.strategy}</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">{s.category}</div>
                </div>

                <div className="mt-3">
                  <div className="text-lg font-bold font-mono">
                    {isLowSample ? 'N/A' : `${s.winRate}%`}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    n={s.n} | med r={s.medianReward}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Experiment Timeline & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 flex-wrap gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Experiment History Timeline ({filteredExperiments.length})
            </h3>

            <div className="flex items-center space-x-2">
              <select
                value={filterStrategy}
                onChange={(e) => setFilterStrategy(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono focus:outline-none"
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
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono focus:outline-none"
              >
                <option value="ALL">All Verdicts</option>
                <option value="accepted">accepted</option>
                <option value="rejected">rejected</option>
                <option value="inconclusive">inconclusive</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
            {filteredExperiments.map((exp) => {
              const verdictBadge = {
                accepted: 'bg-emerald-950 text-emerald-400 border-emerald-800',
                rejected: 'bg-rose-950 text-rose-400 border-rose-800',
                inconclusive: 'bg-amber-950 text-amber-400 border-amber-800',
                errored: 'bg-red-950 text-red-400 border-red-800'
              }[exp.verdict] || 'bg-slate-800 text-slate-400 border-slate-700';

              return (
                <div
                  key={exp._id}
                  onClick={() => setSelectedExp(exp)}
                  className={`p-4 hover:bg-slate-800/30 cursor-pointer transition flex items-center justify-between ${
                    selectedExp?._id === exp._id ? 'bg-slate-800/40 border-l-2 border-cyan-400' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-white">{exp.hotspot?.function}()</span>
                      <span className="text-[11px] font-mono text-slate-500">{exp.hotspot?.file}:{exp.hotspot?.line}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {exp.strategy}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1 italic">
                      "{exp.lesson || exp.failureReason?.summary || 'No takeaway'}"
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-slate-300">
                      r={exp.reward}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${verdictBadge}`}>
                      {exp.verdict}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFindSimilar(exp);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                      title="Find Similar Past Cases"
                    >
                      Similar ↗
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Experiment Detail / Similar Cases Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Experiment Details & Lessons
          </h3>

          {selectedExp ? (
            <div className="space-y-4 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Reusable Engineering Takeaway</div>
                <div className="text-cyan-300 font-sans text-xs leading-relaxed">
                  {selectedExp.lesson || 'No lesson recorded.'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Metrics Comparison</div>
                <div className="text-slate-300">p95 Latency Delta: <strong className="text-emerald-400">{selectedExp.comparison?.p95DeltaPct || 0}%</strong></div>
                <div className="text-slate-300">Throughput Delta: <strong className="text-cyan-400">{selectedExp.comparison?.rpsDeltaPct || 0}%</strong></div>
                <div className="text-slate-300">Mann-Whitney p-value: <strong>{selectedExp.comparison?.mannWhitneyP || 1.0}</strong></div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Unified Patch Diff</div>
                <pre className="bg-black p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 overflow-x-auto max-h-48">
                  {selectedExp.diff || 'No diff'}
                </pre>
              </div>

              {/* Similar Cases List */}
              {similarCases.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Top Retrieved Similar Cases</div>
                  {similarCases.map((sim, idx) => (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-400 font-bold">{sim.strategy} ({sim.functionName})</span>
                        <span className="text-amber-400">Score: {(sim.score * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-slate-400 font-sans text-[11px] line-clamp-1">{sim.lesson}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-center py-16 text-xs">
              Select an experiment from the timeline to view its diff, metrics breakdown, and similar memory cases.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
