import React, { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  Square,
  Download,
  FileCode2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';

const GRAPH_NODES = [
  'selectHotspot',
  'retrieveSimilar',
  'patch',
  'critic',
  'validateAndBenchmark',
  'decide',
  'record'
];

export default function OptimizePage({ project }) {
  const [isRunning, setIsRunning] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [currentNode, setCurrentNode] = useState('selectHotspot');
  const [maxExperiments, setMaxExperiments] = useState(5);
  const [maxTokens, setMaxTokens] = useState(30000);
  const [maxBenchRuns, setMaxBenchRuns] = useState(25);
  const [history, setHistory] = useState([]);
  const [acceptedCount, setAcceptedCount] = useState(0);

  const startOptimization = async () => {
    if (!project) return;
    setIsRunning(true);
    setHistory([]);
    setAcceptedCount(0);

    try {
      const res = await fetch(`/api/projects/${project._id}/optimize?async=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: {
            maxExperiments: Number(maxExperiments),
            maxTokens: Number(maxTokens),
            maxBenchRuns: Number(maxBenchRuns)
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveJob(data);
        setAcceptedCount(data.acceptedCount || 0);
      }
    } catch (e) {
      console.error('Optimization loop error:', e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span>Autonomous Agent Optimization Loop</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            LangGraph closed-loop agent team: Proposes patches for top defects, reviews code semantics via Critic, validates behavioral equivalence in sandboxes, benchmarks interleaved runs, and compounds accepted fixes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={startOptimization}
            disabled={isRunning || !project}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black flex items-center space-x-2 transition disabled:opacity-50 shadow-md shadow-cyan-500/10"
          >
            <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Agents Running Loop...' : 'Launch Optimization Loop'}</span>
          </button>
        </div>
      </div>

      {/* Budget & Safety Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
        <div>
          <label className="block text-slate-400 mb-1 text-[11px] uppercase font-bold">Max Experiments Budget</label>
          <input
            type="number"
            value={maxExperiments}
            onChange={(e) => setMaxExperiments(e.target.value)}
            disabled={isRunning}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 text-[11px] uppercase font-bold">Max LLM Token Budget</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            disabled={isRunning}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 text-[11px] uppercase font-bold">Max Benchmark Runs</label>
          <input
            type="number"
            value={maxBenchRuns}
            onChange={(e) => setMaxBenchRuns(e.target.value)}
            disabled={isRunning}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* LangGraph State Workflow Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>LangGraph Agent State Machine</span>
        </h3>

        <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2 text-center font-mono">
          {GRAPH_NODES.map((node, i) => {
            const isActive = isRunning && currentNode === node;
            return (
              <React.Fragment key={node}>
                <div
                  className={`flex-1 min-w-[110px] p-2.5 rounded-xl border text-[11px] transition ${
                    isActive
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold animate-pulse'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-[9px] text-slate-500 uppercase">Step {i + 1}</div>
                  <div className="mt-0.5 truncate">{node}</div>
                </div>
                {i < GRAPH_NODES.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Output Artifacts Download Banner (When completed) */}
      {activeJob && activeJob.artifacts && (
        <div className="bg-emerald-950/40 border border-emerald-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-emerald-200">Optimization Loop Finished: {acceptedCount} Fix(es) Accepted</h4>
              <p className="text-xs text-emerald-400/80 mt-0.5">
                Statistically validated patches compounded and archived into downloadable artifacts.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={`/api/optimize/${activeJob.jobId}/patch`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-emerald-800 text-emerald-300 flex items-center space-x-1.5 transition"
            >
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span>Download optimized.patch</span>
            </a>

            <a
              href={`/api/optimize/${activeJob.jobId}/report`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center space-x-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Full Report</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
