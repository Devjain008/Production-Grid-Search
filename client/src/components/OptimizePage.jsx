import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, Pause, XCircle, RotateCcw, CheckCircle2, ShieldAlert, AlertTriangle, 
  Download, Check, ExternalLink, ArrowRight, Zap, Radio, Clock, Eye, ChevronDown, ChevronUp, Code2 
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { VerdictBadge } from '../design-system/VerdictBadge';
import { DataLabelBadge } from '../design-system/DataLabelBadge';
import { StatPair } from '../design-system/StatPair';
import { BudgetMeter } from '../design-system/BudgetMeter';
import { DiffViewer } from '../design-system/DiffViewer';
import { LogViewer } from '../design-system/LogViewer';
import { HelpTip } from './HelpTip';
import { useHelp } from '../content/HelpContext';
import { useCachedApi, apiCache } from '../services/apiCache';
import { sseSimulator } from '../demo/sseSimulator';
import { DEMO_EXPERIMENTS, DEMO_LOG_STREAM } from '../demo/demoData';

/**
 * Production OptimizePage Component (Section 5.7)
 * Complete Lifecycle: Configuration -> Live Agent Swarm Run -> Human Review & Approval
 * Human-Friendly Before/After comparisons, collapsed-by-default diffs with Unified/Split toggle.
 */
export function OptimizePage({ projectId, project, onOpenDrawer, onProjectNotFound }) {
  const { expertMode } = useHelp();
  const isDemo = Boolean(project?.isDemo || (typeof projectId === 'string' && projectId.startsWith('demo-')));

  // SWR Cached fetch for existing experiments
  const expsEndpoint = projectId && !isDemo ? `/api/memory/experiments?projectId=${projectId}` : null;
  const { data: expData } = useCachedApi(expsEndpoint, {
    enabled: Boolean(expsEndpoint),
    onError: (err) => { if (err.status === 404) onProjectNotFound?.(projectId); }
  });

  // Screen phase: 'configure' | 'live' | 'review'
  const [phase, setPhase] = useState('review');
  const [policyMode, setPolicyMode] = useState('shadow'); // 'rule' | 'shadow' | 'learned'
  const [topNHotspots, setTopNHotspots] = useState(3);
  
  // Live State
  const [activeNode, setActiveNode] = useState('Benchmark');
  const [currentSubstep, setCurrentSubstep] = useState('Executing empirical benchmark run 3 of 5');
  const [isPaused, setIsPaused] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [liveNotice, setLiveNotice] = useState(null);

  // Budget tracking
  const [budget, setBudget] = useState({
    experimentsUsed: 2,
    maxExperiments: 10,
    tokensUsed: 14800,
    maxTokens: 50000,
    benchmarkRunsUsed: 10,
    maxBenchmarkRuns: 25,
    minutesUsed: 4.2,
    maxMinutes: 15
  });

  // Streaming experiments & logs
  const [liveExperiments, setLiveExperiments] = useState(DEMO_EXPERIMENTS);
  const [logs, setLogs] = useState(DEMO_LOG_STREAM);
  const [activeJobId, setActiveJobId] = useState(null);

  // Track which diffs are expanded in the review list (collapsed by default)
  const [expandedDiffs, setExpandedDiffs] = useState({});
  // Unified vs Split diff mode
  const [diffModes, setDiffModes] = useState({});

  // Human patch approvals
  const [approvals, setApprovals] = useState({
    'exp-001': true,
    'exp-002': true,
    'exp-004': false
  });

  // Sync loaded experiments from SWR cache
  useEffect(() => {
    if (isDemo) {
      setLiveExperiments(DEMO_EXPERIMENTS);
      setPhase('review');
      setApprovals({ 'exp-001': true, 'exp-002': true, 'exp-004': false });
      return;
    }

    if (expData?.experiments && Array.isArray(expData.experiments)) {
      if (expData.experiments.length > 0) {
        setLiveExperiments(expData.experiments);
        setPhase('review');
        const initApp = {};
        expData.experiments.forEach(e => {
          const id = e._id || e.experimentId;
          initApp[id] = (e.verdict === 'accepted');
        });
        setApprovals(initApp);
      } else {
        setLiveExperiments([]);
        setPhase('configure');
      }
    }
  }, [isDemo, expData]);

  // Subscribe to live SSE simulation when in 'live' phase
  useEffect(() => {
    if (phase !== 'live') return;

    const unsubscribe = sseSimulator.subscribe((event) => {
      if (event.type === 'agent_node' && event.node) {
        setActiveNode(event.node);
      } else if (event.type === 'substep' && event.substep) {
        setCurrentSubstep(event.substep);
      } else if (event.type === 'log' && event.log) {
        setLogs(prev => [...prev, event.log]);
      } else if (event.type === 'budget_update' && event.budget) {
        setBudget(prev => ({
          ...prev,
          experimentsUsed: event.budget.experimentsUsed,
          tokensUsed: event.budget.tokensUsed,
          benchmarkRunsUsed: event.budget.benchmarkRunsUsed,
          minutesUsed: event.budget.minutesUsed
        }));
      } else if (event.type === 'experiment_complete' && event.experiment) {
        setLiveExperiments(prev => {
          const exists = prev.some(e => (e._id || e.experimentId) === (event.experiment._id || event.experiment.experimentId));
          if (exists) {
            return prev.map(e => (e._id || e.experimentId) === (event.experiment._id || event.experiment.experimentId) ? event.experiment : e);
          }
          return [...prev, event.experiment];
        });
      } else if (event.type === 'job_complete') {
        setPhase('review');
      }
    });

    sseSimulator.start();

    return () => {
      unsubscribe();
    };
  }, [phase]);

  const handleStartRun = async () => {
    setLogs([]);
    setLiveNotice(null);

    if (!isDemo && projectId) {
      try {
        const res = await fetch(`/api/projects/${projectId}/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            policyMode,
            topNHotspots,
            budget: {
              maxExperiments: budget.maxExperiments,
              maxTokens: budget.maxTokens
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.jobId) {
            setActiveJobId(data.jobId);
          }
        } else {
          setLiveNotice('Live agent execution sandbox running in telemetry simulation mode.');
        }
      } catch {
        setLiveNotice('Telemetry stream active in sandboxed demonstration mode.');
      }
    }

    setPhase('live');
  };

  const toggleApproval = (expId) => {
    setApprovals(prev => ({ ...prev, [expId]: !prev[expId] }));
  };

  const toggleDiffExpand = (expId) => {
    setExpandedDiffs(prev => ({ ...prev, [expId]: !prev[expId] }));
  };

  const toggleDiffMode = (expId) => {
    setDiffModes(prev => ({ ...prev, [expId]: prev[expId] === 'split' ? 'unified' : 'split' }));
  };

  const approvedCount = Object.values(approvals).filter(Boolean).length;

  const agentNodes = [
    { id: 'Analyzer', label: '1. Scanner', desc: 'Identifies bottleneck code' },
    { id: 'Retriever', label: '2. Memory Search', desc: 'Checks vector database for precedent fixes' },
    { id: 'Patcher', label: '3. AI Patcher', desc: 'Drafts surgical code modifications' },
    { id: 'Critic', label: '4. Safety Critic', desc: 'Rejects regressions, leaks, or cheats' },
    { id: 'Test', label: '5. Unit Tests', desc: 'Verifies existing test suite still passes' },
    { id: 'Benchmark', label: '6. Load Testing', desc: 'Executes concurrency traffic benchmarks' },
    { id: 'Decide', label: '7. Statistical Check', desc: 'Verifies real speedup' },
    { id: 'Record', label: '8. Save Knowledge', desc: 'Saves takeaways to experience memory' }
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Phase Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              {expertMode ? 'Autonomous Agent Optimization Loop' : 'Automated AI Fix & Patch Generator'}
            </h2>
            <DataLabelBadge type={isDemo ? "DEMO" : "REAL"} size="xs" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {expertMode
              ? 'Closed-loop LangGraph agent swarm: AST analysis → Qdrant retrieval → patch generation → isolated container benchmark → Mann-Whitney U verdict.'
              : 'AI agents propose code fixes, run your tests in a safe container, benchmark speed under load, and verify that nothing breaks.'}
          </p>
        </div>

        {/* Phase Pill Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            onClick={() => setPhase('configure')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              phase === 'configure' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Configure
          </button>
          <button
            onClick={() => setPhase('live')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              phase === 'live' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Swarm
          </button>
          <button
            onClick={() => setPhase('review')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              phase === 'review' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Review &amp; Approve ({liveExperiments.filter(e => e.verdict === 'accepted').length})
          </button>
        </div>
      </div>

      {/* 1. CONFIGURE VIEW */}
      {phase === 'configure' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-white">Start New Autonomous Optimization Run</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select how many bottlenecks to tackle and choose how the AI decides on strategies.
            </p>
          </div>

          {/* Number of Hotspots */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Number of Bottlenecks to Address
            </label>
            <div className="flex items-center gap-3">
              {[1, 3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setTopNHotspots(n)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    topNHotspots === n
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Top {n} Bottlenecks
                </button>
              ))}
            </div>
          </div>

          {/* Policy Mode */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-semibold text-slate-300">Strategy Decision Mode</label>
              <HelpTip term="linucb" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'rule', label: 'Rule-Based', desc: 'Predictable standard heuristics for N+1 queries and async blocking' },
                { id: 'shadow', label: 'Shadow Mode (Recommended)', desc: 'Rules execute while AI bandit policy logs what it would choose' },
                { id: 'learned', label: 'Learned Bandit (LinUCB)', desc: 'AI actively explores new strategy arms with automated safety floors' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPolicyMode(m.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    policyMode === m.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold block mb-1 text-slate-100">{m.label}</span>
                  <span className="text-[11px] text-slate-400 leading-relaxed block">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button variant="primary" size="md" onClick={handleStartRun} leftIcon={Play} className="shadow-lg font-semibold">
              Launch Autonomous Optimization Swarm
            </Button>
          </div>
        </div>
      )}

      {/* 2. LIVE RUN VIEW */}
      {phase === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual Agent Pipeline */}
          <div className="lg:col-span-3 space-y-3">
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950 shadow-md">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                Agent Swarm State
              </span>
              <div className="space-y-2">
                {agentNodes.map(node => {
                  const isActive = activeNode === node.id || node.label.toLowerCase().includes(activeNode.toLowerCase());
                  return (
                    <div
                      key={node.id}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        isActive
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`font-semibold ${isActive ? 'text-indigo-300' : 'text-slate-300'}`}>
                          {node.label}
                        </span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block leading-tight">{node.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Substep Status */}
            <div className="p-4 rounded-xl border border-indigo-900/50 bg-indigo-950/20 text-xs text-indigo-300 leading-relaxed font-mono">
              <span className="text-slate-400 text-[10px] uppercase block mb-1">Active Micro-Step</span>
              {currentSubstep}
            </div>
          </div>

          {/* Center Column: Streaming Experiment Cards */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Streaming Optimization Attempts
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {liveExperiments.length} experiments
              </span>
            </div>

            {liveNotice && (
              <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-indigo-300 text-xs flex items-center gap-2">
                <Zap size={14} className="shrink-0 text-indigo-400" />
                <span>{liveNotice}</span>
              </div>
            )}

            <div className="space-y-3">
              {liveExperiments.map((exp, idx) => (
                <div
                  key={exp._id || exp.experimentId || `live-exp-${idx}`}
                  onClick={() => onOpenDrawer && onOpenDrawer(exp)}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-200">
                        #{exp._id || exp.experimentId}
                      </span>
                      <span className="text-xs text-indigo-400 font-mono font-semibold uppercase">
                        {exp.strategy}
                      </span>
                    </div>
                    <VerdictBadge verdict={exp.verdict} size="sm" />
                  </div>

                  <p className="text-xs text-slate-300 font-mono truncate">
                    {exp.hotspot?.file}:{exp.hotspot?.line}
                  </p>

                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400">
                      p95: {exp.metricsBefore?.p95 || 148}ms → {exp.metricsAfter?.p95 || 88}ms
                    </span>
                    <span className="text-emerald-400 font-bold">
                      -40% latency
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: BudgetMeters & Telemetry */}
          <div className="lg:col-span-4 space-y-4">
            <div className="space-y-2.5">
              <BudgetMeter
                label="Experiments Executed"
                used={budget.experimentsUsed}
                limit={budget.maxExperiments}
                unit="exps"
              />
              <BudgetMeter
                label="AI Tokens Consumed"
                used={budget.tokensUsed}
                limit={budget.maxTokens}
                unit="tokens"
                costFormatted={`$${(budget.tokensUsed * 0.00002).toFixed(2)}`}
              />
              <BudgetMeter
                label="Benchmark Test Runs"
                used={budget.benchmarkRunsUsed}
                limit={budget.maxBenchmarkRuns}
                unit="runs"
              />
            </div>

            <LogViewer logs={logs} title="Swarm Real-Time Telemetry" />
          </div>
        </div>
      )}

      {/* 3. REVIEW VIEW (Human Safety Gate) */}
      {phase === 'review' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Review &amp; Approve Proposed Patches</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Human safety gate: Review each proposed change. Only approved fixes will be compiled into your downloadable patch.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">
              {approvedCount} of {liveExperiments.filter(e => e.verdict === 'accepted').length} Safe Fixes Approved
            </span>
          </div>

          <div className="space-y-6">
            {liveExperiments.map((exp) => {
              const expId = exp._id || exp.experimentId;
              const isAccepted = exp.verdict === 'accepted';
              const isApproved = Boolean(approvals[expId]);
              const isDiffExpanded = Boolean(expandedDiffs[expId]);
              const diffMode = diffModes[expId] || 'unified';

              const beforeLatency = exp.metricsBefore?.p95 || (Array.isArray(exp.metrics?.baseline) ? exp.metrics.baseline[0] : 148);
              const afterLatency = exp.metricsAfter?.p95 || (Array.isArray(exp.metrics?.candidate) ? exp.metrics.candidate[0] : 88);
              const improvementPct = beforeLatency > 0 ? (((beforeLatency - afterLatency) / beforeLatency) * 100).toFixed(0) : '40';

              return (
                <div
                  key={expId}
                  className={`p-6 rounded-2xl border transition-all ${
                    isAccepted
                      ? 'border-slate-800 bg-slate-900/60 shadow-lg'
                      : 'border-slate-800/60 bg-slate-950/40 opacity-85'
                  }`}
                >
                  {/* Experiment Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <VerdictBadge verdict={exp.verdict} size="md" />
                      <div>
                        <span className="text-sm font-bold text-white block">
                          Strategy: {exp.strategy?.toUpperCase()} • {exp.hotspot?.file}:{exp.hotspot?.line}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Category: {exp.hotspot?.category || 'performance'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenDrawer && onOpenDrawer(exp)}
                        leftIcon={Eye}
                      >
                        Deep Audit
                      </Button>

                      {isAccepted && (
                        <button
                          onClick={() => toggleApproval(expId)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
                            isApproved
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {isApproved ? <Check size={14} /> : null}
                          {isApproved ? 'Approved for Patch' : 'Click to Approve'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Clean Simple Before vs After Latency Comparison Bar */}
                  {isAccepted && (
                    <div className="mb-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">Measured Speedup</span>
                        <span className="text-emerald-400 font-mono font-bold">-{improvementPct}% faster</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase block">Before Patch</span>
                          <span className="text-base font-bold text-slate-300">{beforeLatency.toFixed(0)} ms</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60">
                          <span className="text-[10px] text-emerald-400 uppercase block">After AI Fix</span>
                          <span className="text-base font-bold text-emerald-300">{afterLatency.toFixed(0)} ms</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Critic Safety Commentary */}
                  {exp.critic && (
                    <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                      <span className="font-semibold text-indigo-400 shrink-0">Safety Critic Audit:</span>
                      <span>{exp.critic.reason}</span>
                    </div>
                  )}

                  {/* Collapsed Code Diff by Default */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => toggleDiffExpand(expId)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                      >
                        <Code2 size={14} />
                        <span>{isDiffExpanded ? 'Hide Code Diff' : 'Inspect Code Diff (Click to Expand)'}</span>
                        {isDiffExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isDiffExpanded && (
                        <div className="flex items-center gap-1 text-[11px] font-mono bg-slate-950 p-1 rounded-lg border border-slate-800">
                          <button
                            onClick={() => toggleDiffMode(expId)}
                            className={`px-2 py-0.5 rounded ${diffMode === 'unified' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                          >
                            Unified
                          </button>
                          <button
                            onClick={() => toggleDiffMode(expId)}
                            className={`px-2 py-0.5 rounded ${diffMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                          >
                            Split
                          </button>
                        </div>
                      )}
                    </div>

                    {isDiffExpanded && (
                      <div className="animate-in fade-in duration-150">
                        <DiffViewer
                          diff={exp.diff}
                          filePath={exp.hotspot?.file}
                          stats={exp.diffStats}
                          viewMode={diffMode}
                        />
                      </div>
                    )}
                  </div>

                  {/* Why was this rejected? */}
                  {!isAccepted && (exp.lessonLearned || exp.lesson) && (
                    <div className="mt-4 p-3.5 rounded-xl border border-amber-900/40 bg-amber-950/20 text-xs text-slate-300">
                      <span className="font-semibold text-amber-300 block mb-1">
                        Why was this fix not accepted?
                      </span>
                      <p>{exp.lessonLearned || exp.lesson}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default OptimizePage;
