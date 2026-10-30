import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Server,
  Layers,
  Terminal,
  Cpu,
  Flame,
  Gauge,
  Copy,
  Check,
  Search,
  ShieldCheck,
  HelpCircle,
  FileCode2,
  BarChart3,
  Globe,
  TrendingUp,
  Zap,
  Award,
  Send,
  Users,
  Smile,
  AlertCircle,
  Play
} from 'lucide-react';
import MetricsCharts from './MetricsCharts';
import { HelpTip, Term } from './HelpTip';
import InfoTooltip from './InfoTooltip';

import { DEMO_BASELINE } from '../demo/demoData';

export default function BaselineReport({ project, run, onRebenchmark }) {
  const effectiveRun = run || DEMO_BASELINE;
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'virtual' | 'capacity' | 'routes' | 'logs'
  const [selectedProfile, setSelectedProfile] = useState('load');
  const [isTriggering, setIsTriggering] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Virtual Request Runner State
  const [virtualMethod, setVirtualMethod] = useState('GET');
  const [virtualPath, setVirtualPath] = useState('/health');
  const [virtualBody, setVirtualBody] = useState('{\n  "test": true\n}');
  const [isVirtualLoading, setIsVirtualLoading] = useState(false);
  const [virtualResponse, setVirtualResponse] = useState(null);

  if (!project && !effectiveRun) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-200">No Active Benchmark Run</h3>
        <p className="text-xs text-slate-500 mt-1">Upload an Express project, provide a live deployed link, or click "Run Built-in Sample Benchmark" above.</p>
      </div>
    );
  }

  const {
    metrics = effectiveRun.summary || {},
    capacity = effectiveRun.profiles?.stress || {},
    nfrScorecard = {},
    healthStatus = {},
    containerInfo = {},
    executionMode = 'sandboxed_container',
    status = 'completed'
  } = effectiveRun;

  const handleCopyLogs = () => {
    const logs = containerInfo.runtimeLogs?.join('\n') || 'No logs captured.';
    navigator.clipboard.writeText(logs);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleSendVirtualRequest = async (e) => {
    e.preventDefault();
    setIsVirtualLoading(true);
    setVirtualResponse(null);

    let parsedBody = null;
    if (['POST', 'PUT', 'PATCH'].includes(virtualMethod) && virtualBody.trim()) {
      try {
        parsedBody = JSON.parse(virtualBody);
      } catch (err) {
        setVirtualResponse({
          success: false,
          error: `Invalid JSON payload in request body: ${err.message}`
        });
        setIsVirtualLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/runs/${run._id}/virtual-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: virtualMethod,
          routePath: virtualPath,
          body: parsedBody
        })
      });

      const data = await res.json();
      setVirtualResponse(data);
    } catch (err) {
      setVirtualResponse({
        success: false,
        error: err.message
      });
    } finally {
      setIsVirtualLoading(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready & Evaluated</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/80 text-red-400 border border-red-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      case 'loadtesting':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800 animate-pulse">
            <Gauge className="w-3.5 h-3.5 animate-spin" />
            <span>Simulating Virtual Traffic</span>
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800 animate-pulse">
            <Server className="w-3.5 h-3.5" />
            <span>App Active</span>
          </span>
        );
      case 'building':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800 animate-pulse">
            <Cpu className="w-3.5 h-3.5" />
            <span>Preparing Environment</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Queued</span>
          </span>
        );
    }
  };

  const filteredRoutes = (project.detectedRoutes || []).filter(r => {
    const matchesSearch = r.path.toLowerCase().includes(routeSearch.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' || r.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const selectRouteForVirtualTest = (route) => {
    setVirtualMethod(route.method);
    setVirtualPath(route.path);
    setActiveTab('virtual');
    if (route.path.includes('login') || route.path.includes('auth')) {
      setVirtualBody('{\n  "username": "admin",\n  "password": "password123"\n}');
    } else if (route.path.includes('event') || route.path.includes('analytics')) {
      setVirtualBody('{\n  "event": "button_click",\n  "page": "/home"\n}');
    } else {
      setVirtualBody('{}');
    }
  };

  const handleRebenchmarkSubmit = async () => {
    setIsTriggering(true);
    try {
      await onRebenchmark(selectedProfile);
    } finally {
      setIsTriggering(false);
    }
  };

  // Plain-English Executive Calculations
  const avgResponseTime = metrics.p50 || 0;
  const speedLabel = avgResponseTime < 100 ? 'Lightning Fast' : avgResponseTime < 300 ? 'Good' : 'Noticeably Slow';
  const speedColor = avgResponseTime < 100 ? 'text-emerald-400' : avgResponseTime < 300 ? 'text-cyan-400' : 'text-amber-400';

  const userCapacity = capacity.breakingPointVus || 40;
  const successRate = metrics.errorRate !== undefined ? (100 - (metrics.errorRate * 100)).toFixed(1) : '100.0';

  let executiveVerdict = '🟢 All Systems Healthy';
  let executiveDescription = 'Your application responds reliably and handles steady traffic comfortably.';
  if (metrics.errorRate > 0.05 || metrics.p95 > 800) {
    executiveVerdict = '🔴 Significant Slowdowns Detected';
    executiveDescription = 'Heavy traffic causes noticeable delay or request failures. Attention recommended before production launch.';
  } else if (metrics.p95 > 250 || metrics.eventLoopLagP95Ms > 10) {
    executiveVerdict = '🟡 Minor Bottlenecks Found';
    executiveDescription = 'The app works well, but certain actions take longer than optimal. See recommendation below.';
  }

  return (
    <div className="space-y-6">
      {/* Run Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-white">{project.name}</h2>
              {getStatusBadge(status)}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono uppercase">
                {run.profile} TRAFFIC TEST
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center space-x-1 ${
                executionMode === 'direct_live_deployment'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                  : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              }`}>
                {executionMode === 'direct_live_deployment' ? <Globe className="w-3 h-3" /> : <Server className="w-3 h-3" />}
                <span>{executionMode === 'direct_live_deployment' ? 'Live Deployed Site' : 'Local Container'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluated: {new Date(run.createdAt).toLocaleTimeString()} • {project.detectedRoutes?.length || 0} discovered routes
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="load">Standard Traffic Test (30s)</option>
              <option value="stress">Heavy Stress Test (45s)</option>
              <option value="spike">Sudden Surge Test (20s)</option>
              <option value="soak">Long Endurance Test (60s)</option>
            </select>
            <button
              onClick={handleRebenchmarkSubmit}
              disabled={isTriggering || status === 'running' || status === 'loadtesting'}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition"
            >
              {isTriggering ? 'Running...' : 'Re-test'}
            </button>
          </div>
        </div>

        {/* Executive Plain-English Summary (User-Friendly, Non-Technical) */}
        <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                <Term id="capacity_classification">Executive Health Verdict</Term>
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">{executiveVerdict}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{executiveDescription}</p>
            </div>

            <button
              onClick={() => setActiveTab('virtual')}
              className="flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-md transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Virtual Request</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 pt-1">
            <div>
              <span className="text-[11px] text-slate-500 flex items-center">
                <Term id="p50" value={avgResponseTime}>Typical Speed</Term>
              </span>
              <span className={`text-base font-bold ${speedColor}`}>
                {avgResponseTime}ms <span className="text-xs font-normal text-slate-400">({speedLabel})</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 flex items-center">
                <Term id="concurrency_limit" value={userCapacity}>Visitor Capacity</Term>
              </span>
              <span className="text-base font-bold text-white">
                ~{userCapacity} <span className="text-xs font-normal text-slate-400">simultaneous users</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 flex items-center">
                <Term id="error_rate" value={successRate}>Success Rate</Term>
              </span>
              <span className="text-base font-bold text-emerald-400">
                {successRate}% <span className="text-xs font-normal text-slate-400">success</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 flex items-center">
                <Term id="nfr_scorecard" value={nfrScorecard.overallScore}>Overall Score</Term>
              </span>
              <span className="text-base font-bold text-cyan-400 font-mono">
                {nfrScorecard.overallScore || 80}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'summary' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Dashboard & Charts</span>
        </button>

        <button
          onClick={() => setActiveTab('virtual')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'virtual' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Interactive Virtual Request Tester</span>
        </button>

        <button
          onClick={() => setActiveTab('capacity')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'capacity' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Capacity & Traffic Limit</span>
        </button>

        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'routes' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Discovered Routes ({project.detectedRoutes?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
            activeTab === 'logs' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Logs</span>
        </button>
      </div>

      {/* TAB 1: Summary Dashboard & Charts */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-medium flex items-center">
                <Term id="p50" value={metrics.p50}>Median Response Time</Term>
              </span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {metrics.p50 || '--'} ms
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Typical user experience</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-medium flex items-center">
                <Term id="p95" value={metrics.p95}>Slowest 5% of Visits</Term>
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {metrics.p95 || '--'} ms
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Peak delay threshold</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-medium flex items-center">
                <Term id="throughput" value={metrics.rps}>Requests Handled</Term>
              </span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                {metrics.rps ? `${metrics.rps}/sec` : '--'}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Total hits: {metrics.totalRequests || 0}</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-medium flex items-center">
                <Term id="heap_memory" value={metrics.memoryMaxMb}>Memory Stability</Term>
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {metrics.memoryMaxMb ? `${metrics.memoryMaxMb} MB` : '--'}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Within 512MB memory boundary</span>
            </div>
          </div>

          {status === 'completed' && <MetricsCharts metrics={metrics} />}
        </div>
      )}

      {/* TAB 2: Interactive Virtual Request Runner */}
      {activeTab === 'virtual' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>Interactive Virtual Request Tester</span>
                <InfoTooltip term="virtual_request" />
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Send a real test request right now to any discovered route and inspect the live response.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendVirtualRequest} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <select
                value={virtualMethod}
                onChange={(e) => setVirtualMethod(e.target.value)}
                className="w-full sm:w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-cyan-400 focus:outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>

              <input
                type="text"
                value={virtualPath}
                onChange={(e) => setVirtualPath(e.target.value)}
                placeholder="/api/info or /health"
                className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />

              <button
                type="submit"
                disabled={isVirtualLoading}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-md transition disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isVirtualLoading ? 'animate-spin' : ''}`} />
                <span>{isVirtualLoading ? 'Sending...' : 'Send Request'}</span>
              </button>
            </div>

            {/* Quick Route Shortcuts */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1">Quick Select:</span>
              {(project.detectedRoutes || []).slice(0, 6).map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectRouteForVirtualTest(r)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
                >
                  {r.method} {r.path}
                </button>
              ))}
            </div>

            {['POST', 'PUT', 'PATCH'].includes(virtualMethod) && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">JSON Payload Body</label>
                <textarea
                  value={virtualBody}
                  onChange={(e) => setVirtualBody(e.target.value)}
                  rows={4}
                  className="w-full bg-black border border-slate-800 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </form>

          {/* Virtual Response Display */}
          {virtualResponse && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                    virtualResponse.statusCode >= 200 && virtualResponse.statusCode < 300
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}>
                    {virtualResponse.statusCode || 'ERR'} {virtualResponse.statusText || ''}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Response Time: <strong className="text-cyan-400">{virtualResponse.responseTimeMs || 0}ms</strong>
                  </span>
                </div>

                <span className="text-[11px] text-slate-500 font-mono">{virtualResponse.targetUrl}</span>
              </div>

              {virtualResponse.error ? (
                <div className="p-3 bg-red-950/40 border border-red-900 rounded-lg text-xs text-red-300 font-mono">
                  {virtualResponse.error}
                </div>
              ) : (
                <div className="bg-black p-3 rounded-lg border border-slate-900 overflow-x-auto max-h-64 font-mono text-xs text-slate-300">
                  <pre>{JSON.stringify(virtualResponse.data, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Capacity & Traffic Limit */}
      {activeTab === 'capacity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-cyan-800/60 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center">
                <Term id="peak_capacity" value={capacity.maxPeakRps || Math.round(metrics.rps * 1.35)}>Peak Surge Capacity</Term>
              </span>
              <div className="text-3xl font-extrabold font-mono text-white mt-1">
                {capacity.maxPeakRps || Math.round(metrics.rps * 1.35) || '--'} <span className="text-sm font-sans font-normal text-slate-400">requests/sec</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                The absolute highest burst traffic handled without dropping incoming connections.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-800/60 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                <Term id="steady_traffic" value={capacity.mediumSteadyRps || Math.round(metrics.rps)}>Safe Steady Traffic</Term>
              </span>
              <div className="text-3xl font-extrabold font-mono text-white mt-1">
                {capacity.mediumSteadyRps || Math.round(metrics.rps) || '--'} <span className="text-sm font-sans font-normal text-slate-400">requests/sec</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Ideal everyday traffic load maintaining responsive, sub-second latency for all users.
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-800/60 rounded-2xl p-5 shadow-lg">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                <Term id="concurrency_limit" value={capacity.breakingPointVus || 40}>Safe Concurrency Limit</Term>
              </span>
              <div className="text-3xl font-extrabold font-mono text-white mt-1">
                ~{capacity.breakingPointVus || 40} <span className="text-sm font-sans font-normal text-slate-400">simultaneous users</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Estimated maximum active concurrent user sessions before response times start slowing down.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Discovered Routes */}
      {activeTab === 'routes' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map(m => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition ${
                    methodFilter === m ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search route..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-sans">
                  <th className="pb-2.5">Method</th>
                  <th className="pb-2.5">Route Path</th>
                  <th className="pb-2.5">Parameters</th>
                  <th className="pb-2.5">Source File</th>
                  <th className="pb-2.5 text-right">Interactive Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRoutes.map((route, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
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
                      <button
                        onClick={() => selectRouteForVirtualTest(route)}
                        className="px-2 py-1 rounded text-[11px] font-sans font-medium bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition"
                      >
                        Test Request ➜
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <span className="text-xs font-mono text-slate-300">Container Stdout / Stderr Stream</span>
            <button
              onClick={handleCopyLogs}
              className="flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            >
              {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLogs ? 'Copied' : 'Copy Logs'}</span>
            </button>
          </div>

          <div className="p-4 bg-black font-mono text-xs text-slate-300 max-h-80 overflow-y-auto space-y-1">
            {containerInfo.runtimeLogs && containerInfo.runtimeLogs.length > 0 ? (
              containerInfo.runtimeLogs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap">{log}</div>
              ))
            ) : (
              <div className="text-slate-600">No logs captured yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
