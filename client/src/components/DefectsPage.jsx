import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Flame,
  Search,
  Activity,
  Layers,
  Code2,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldAlert,
  Zap,
  Play
} from 'lucide-react';

export default function DefectsPage({ project }) {
  const [report, setReport] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedDefect, setExpandedDefect] = useState(null);
  const [showFlamegraph, setShowFlamegraph] = useState(false);

  const fetchDefectsAndProfile = async () => {
    if (!project) return;
    try {
      const resDefects = await fetch(`/api/projects/${project._id}/defects`);
      if (resDefects.ok) {
        const data = await resDefects.json();
        setReport(data.defectReport);
      }

      const resProfile = await fetch(`/api/projects/${project._id}/profile`);
      if (resProfile.ok) {
        const data = await resProfile.json();
        setProfile(data.profileResult);
      }
    } catch (e) {
      console.error('Error fetching defects:', e);
    }
  };

  useEffect(() => {
    fetchDefectsAndProfile();
  }, [project?._id]);

  const handleRunAnalysis = async () => {
    if (!project) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${project._id}/analyze`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReport(data.defectReport);
        setProfile(data.profileResult);
      }
    } catch (e) {
      console.error('Analysis error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-200">No Project Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select or upload a project above to view code analysis and defect rankings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Defect Ranking & Hotspot Analysis</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Fuses Static Analysis AST rules, V8 CPU Profiler hot frames, and Isolation Forest anomaly scores into an actionable suspicion list.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFlamegraph(!showFlamegraph)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-2 transition"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <span>{showFlamegraph ? 'Hide Flamegraph' : 'View Flamegraph'}</span>
          </button>

          <button
            onClick={handleRunAnalysis}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black flex items-center space-x-2 transition disabled:opacity-50 shadow-md shadow-cyan-500/10"
          >
            <Play className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analyzing Codebase...' : 'Run Full Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Embedded Flamegraph Viewer */}
      {showFlamegraph && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Interactive CPU Profiler Flamegraph</span>
            </span>
            <a
              href={`/api/projects/${project._id}/flamegraph`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-400 hover:underline"
            >
              Open Fullscreen ↗
            </a>
          </div>
          <iframe
            src={`/api/projects/${project._id}/flamegraph`}
            title="Flamegraph"
            className="w-full h-96 rounded-xl border border-slate-800 bg-slate-950"
          />
        </div>
      )}

      {/* Ranked Defects Table */}
      {report && report.rankedDefects?.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Ranked Hotspots & Recommended Strategies ({report.rankedDefects.length})
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Weights: Static ({report.weights?.wStatic}) | Profile ({report.weights?.wProfile}) | Anomaly ({report.weights?.wAnomaly})
            </span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {report.rankedDefects.map((defect) => {
              const isExpanded = expandedDefect === defect.rank;
              const strategyColor = {
                batch: 'bg-emerald-950 text-emerald-400 border-emerald-800',
                async: 'bg-cyan-950 text-cyan-400 border-cyan-800',
                pagination: 'bg-blue-950 text-blue-400 border-blue-800',
                index: 'bg-purple-950 text-purple-400 border-purple-800',
                cache: 'bg-amber-950 text-amber-400 border-amber-800',
                pool: 'bg-indigo-950 text-indigo-400 border-indigo-800'
              }[defect.suggestedStrategy] || 'bg-slate-800 text-slate-300 border-slate-700';

              return (
                <div key={defect.rank} className="p-5 hover:bg-slate-800/20 transition">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedDefect(isExpanded ? null : defect.rank)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                        #{defect.rank}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm font-bold text-white">{defect.function}()</span>
                          <span className="text-xs font-mono text-slate-500">{defect.file}:{defect.line}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {defect.evidence?.static?.[0]?.message || 'High CPU/Latency Hotspot'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-xs font-mono text-slate-400">Suspicion Score</div>
                        <div className="text-sm font-bold font-mono text-amber-400">{(defect.score * 100).toFixed(1)}%</div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase border ${strategyColor}`}>
                        {defect.suggestedStrategy}
                      </span>

                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Evidence & Code Snippet */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4">
                      {/* Evidence Badges */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Static Analysis</span>
                          <div className="text-xs text-slate-300 mt-1">
                            {defect.evidence?.static?.length > 0 ? (
                              <span className="text-red-400 font-semibold">{defect.evidence.static[0].ruleId} (Sev: {defect.evidence.static[0].severity}/5)</span>
                            ) : (
                              <span className="text-slate-500">No static violations</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Profiler Hotness</span>
                          <div className="text-xs text-slate-300 mt-1">
                            {defect.evidence?.profile ? (
                              <span className="text-orange-400 font-bold">{defect.evidence.profile.selfTimePercent}% CPU Self-Time</span>
                            ) : (
                              <span className="text-slate-500">Passive frame</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Isolation Forest Anomaly</span>
                          <div className="text-xs text-slate-300 mt-1">
                            {defect.evidence?.anomaly ? (
                              <span className="text-amber-400 font-bold">Anomaly Score: {(defect.evidence.anomaly.anomalyScore * 100).toFixed(0)}%</span>
                            ) : (
                              <span className="text-slate-500">Nominal route</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Code Snippet */}
                      {defect.evidence?.static?.[0]?.snippet && (
                        <div>
                          <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center space-x-1.5">
                            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Source Code Snippet ({defect.file}:{defect.line})</span>
                          </div>
                          <pre className="bg-black border border-slate-800/80 rounded-xl p-3 text-xs font-mono text-cyan-300 overflow-x-auto">
                            {defect.evidence.static[0].snippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-200">No Defect Report Generated Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Click "Run Full Analysis" above to execute static AST scans, CPU profiling, and anomaly detection on this codebase.
          </p>
        </div>
      )}
    </div>
  );
}
