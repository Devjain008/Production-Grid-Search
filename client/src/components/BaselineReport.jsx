import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Server,
  Layers,
  Terminal,
  ChevronDown,
  ChevronUp,
  Cpu,
  Flame,
  Gauge
} from 'lucide-react';
import MetricsCharts from './MetricsCharts';

export default function BaselineReport({ project, run, onRebenchmark }) {
  const [showLogs, setShowLogs] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState('load');
  const [isTriggering, setIsTriggering] = useState(false);

  if (!project || !run) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-sm">No benchmark run selected. Upload a project to generate a baseline report.</p>
      </div>
    );
  }

  const { metrics = {}, healthStatus = {}, containerInfo = {}, status } = run;

  const getStatusBadge = (st) => {
    switch (st) {
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/80 text-red-400 border border-red-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      case 'loadtesting':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800 animate-pulse">
            <Gauge className="w-3.5 h-3.5 animate-spin" />
            <span>Running Load Profiles</span>
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800 animate-pulse">
            <Server className="w-3.5 h-3.5" />
            <span>Sandbox Active</span>
          </span>
        );
      case 'building':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800 animate-pulse">
            <Cpu className="w-3.5 h-3.5" />
            <span>Building Container</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Queued</span>
          </span>
        );
    }
  };

  const steps = [
    { label: 'Upload & AST Scan', active: true, done: true },
    { label: 'Sandbox Isolation', active: status === 'building' || status === 'running', done: ['running', 'loadtesting', 'completed'].includes(status) },
    { label: 'Health Readiness', active: status === 'running', done: ['loadtesting', 'completed'].includes(status) },
    { label: 'k6 / Autocannon Test', active: status === 'loadtesting', done: status === 'completed' },
    { label: 'Baseline Synthesized', active: status === 'completed', done: status === 'completed' }
  ];

  const handleRebenchmarkSubmit = async () => {
    setIsTriggering(true);
    try {
      await onRebenchmark(selectedProfile);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Run Header & Progress Pipeline */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h2 className="text-xl font-bold text-white">{project.name}</h2>
              {getStatusBadge(status)}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {run.profile.toUpperCase()} PROFILE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Run ID: <span className="font-mono text-slate-300">{run._id}</span> • Created: {new Date(run.createdAt).toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="load">Standard Load (20 VUs)</option>
              <option value="stress">Stress Test (80 VUs)</option>
              <option value="spike">Spike Test (100 VUs)</option>
              <option value="soak">Soak Test (15 VUs)</option>
            </select>
            <button
              onClick={handleRebenchmarkSubmit}
              disabled={isTriggering || status === 'running' || status === 'loadtesting'}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition"
            >
              {isTriggering ? 'Scheduling...' : 'Re-benchmark'}
            </button>
          </div>
        </div>

        {/* Step Progression Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-2">
          {steps.map((st, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg border text-xs flex items-center space-x-2 transition ${
                st.done
                  ? 'bg-emerald-950/40 border-emerald-900 text-emerald-300'
                  : st.active
                  ? 'bg-cyan-950/50 border-cyan-800 text-cyan-300 animate-pulse'
                  : 'bg-slate-950/40 border-slate-900 text-slate-500'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                st.done ? 'bg-emerald-500 text-black' : st.active ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'
              }`}>
                {st.done ? '✓' : i + 1}
              </span>
              <span className="truncate">{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: p95 Latency */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>p95 Latency</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.p95 ? `${metrics.p95} ms` : '--'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            p50: {metrics.p50 || '--'} ms | p99: {metrics.p99 || '--'} ms
          </div>
        </div>

        {/* Card 2: Throughput (RPS) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Throughput (RPS)</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.rps ? `${metrics.rps} req/s` : '--'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total Hits: {metrics.totalRequests || '--'}
          </div>
        </div>

        {/* Card 3: Error Rate */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Error Rate</span>
            <AlertTriangle className={`w-4 h-4 ${metrics.errorRate > 0.05 ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.errorRate !== undefined ? `${(metrics.errorRate * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.errorRate > 0.05 ? 'High failure rate detected' : 'Acceptable error tolerance'}
          </div>
        </div>

        {/* Card 4: Event Loop Lag & Memory */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Event-Loop Lag (p95)</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {metrics.eventLoopLagP95Ms ? `${metrics.eventLoopLagP95Ms} ms` : '--'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Peak RAM: {metrics.memoryMaxMb || '--'} MB
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      {status === 'completed' && <MetricsCharts metrics={metrics} />}

      {/* Detected Routes Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Discovered Application Routes</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {project.detectedRoutes ? project.detectedRoutes.length : 0} Endpoints Found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-sans">
                <th className="pb-2">Method</th>
                <th className="pb-2">Path</th>
                <th className="pb-2">Parameters</th>
                <th className="pb-2">Source File</th>
                <th className="pb-2 text-right">Target Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {project.detectedRoutes && project.detectedRoutes.map((route, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      route.method === 'GET'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800'
                        : route.method === 'POST'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : route.method === 'PUT'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}>
                      {route.method}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-200 font-semibold">{route.path}</td>
                  <td className="py-2.5 text-slate-400">
                    {route.params && route.params.length > 0 ? route.params.join(', ') : 'none'}
                  </td>
                  <td className="py-2.5 text-slate-400">
                    {route.filePath || 'server.js'}:{route.line || 1}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="text-[11px] text-cyan-400 font-sans">Fuzzed in Baseline</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Container Logs Viewer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full px-6 py-3 flex items-center justify-between text-xs font-medium text-slate-300 hover:bg-slate-800/50 transition border-b border-slate-800"
        >
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Sandbox Execution & Container Logs</span>
          </div>
          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showLogs && (
          <div className="p-4 bg-black font-mono text-xs text-slate-300 max-h-60 overflow-y-auto space-y-1">
            {containerInfo.runtimeLogs && containerInfo.runtimeLogs.length > 0 ? (
              containerInfo.runtimeLogs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap">{log}</div>
              ))
            ) : (
              <div className="text-slate-600">No logs captured yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
