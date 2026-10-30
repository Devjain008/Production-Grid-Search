import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, XCircle, RotateCcw, CheckCircle2, ShieldAlert, AlertTriangle, 
  Download, Check, ExternalLink, ArrowRight, Zap, Radio, Clock, Eye 
} from 'lucide-react';
import { Button } from '../design-system/Button';
import { VerdictBadge } from '../design-system/VerdictBadge';
import { DataLabelBadge } from '../design-system/DataLabelBadge';
import { StatPair } from '../design-system/StatPair';
import { BudgetMeter } from '../design-system/BudgetMeter';
import { DiffViewer } from '../design-system/DiffViewer';
import { LogViewer } from '../design-system/LogViewer';
import { HelpTip } from './HelpTip';
import { sseSimulator } from '../demo/sseSimulator';
import { DEMO_EXPERIMENTS, DEMO_LOG_STREAM } from '../demo/demoData';

/**
 * Production OptimizePage Component (Section 5.7)
 * Complete Lifecycle: Configuration -> Live Agent Swarm Run -> Human Review & Approval
 */
export function OptimizePage({ projectId, onOpenDrawer }) {
  // Phase of the screen: 'configure' | 'live' | 'review'
  const [phase, setPhase] = useState('review');
  const [policyMode, setPolicyMode] = useState('shadow'); // 'rule' | 'shadow' | 'learned'
  const [topNHotspots, setTopNHotspots] = useState(3);
  
  // Live State
  const [activeNode, setActiveNode] = useState('Benchmark');
  const [currentSubstep, setCurrentSubstep] = useState('Executing empirical benchmark run 3 of 5');
  const [isPaused, setIsPaused] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected' | 'reconnecting'

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
  const [experiments, setExperiments] = useState(DEMO_EXPERIMENTS);
  const [logs, setLogs] = useState(DEMO_LOG_STREAM);

  // Human patch approvals: { [expId]: true | false }
  const [approvals, setApprovals] = useState({
    'exp-001': true,
    'exp-002': true,
    'exp-004': false
  });

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
        setExperiments(prev => {
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

  const handleStartRun = () => {
    setLogs([]);
    setPhase('live');
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      sseSimulator.resume();
      setIsPaused(false);
    } else {
      sseSimulator.pause();
      setIsPaused(true);
    }
  };

  const handleConfirmCancel = () => {
    sseSimulator.cancel();
    setShowCancelConfirm(false);
    setPhase('review');
  };

  const toggleApproval = (expId) => {
    setApprovals(prev => ({ ...prev, [expId]: !prev[expId] }));
  };

  const approvedCount = Object.values(approvals).filter(Boolean).length;

  const agentNodes = [
    { id: 'Analyzer', label: 'Analyzer', desc: 'Scans AST for bottlenecks' },
    { id: 'Retriever', label: 'Retriever', desc: 'Queries Qdrant vector memory' },
    { id: 'Patcher', label: 'Patcher', desc: 'Generates surgical diff' },
    { id: 'Critic', label: 'Critic', desc: 'Filters leaks & reward-hacks' },
    { id: 'Test', label: 'Sandbox Test', desc: 'Executes functional tests' },
    { id: 'Benchmark', label: 'Benchmark', desc: 'Runs 5 k6 load profiles' },
    { id: 'Decide', label: 'Decide', desc: 'Mann-Whitney U significance' },
    { id: 'Record', label: 'Record', desc: 'Persists lessons to memory' }
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Phase Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Autonomous Agent Optimization Loop</h2>
            <DataLabelBadge type="REAL" size="xs" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Self-healing optimization pipeline. Every patch is verified by statistical benchmarks before human approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {phase === 'configure' && (
            <Button variant="primary" size="md" onClick={handleStartRun} leftIcon={Play}>
              Start Autonomous Run
            </Button>
          )}

          {phase === 'live' && (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs font-mono text-indigo-300">
                <Radio size={14} className="animate-pulse text-emerald-400" />
                <span>Job Live • Tab safe to close</span>
              </div>
              <Button variant="outline" size="sm" onClick={handlePauseToggle} leftIcon={isPaused ? Play : Pause}>
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowCancelConfirm(true)} leftIcon={XCircle}>
                Cancel Run
              </Button>
            </>
          )}

          {phase === 'review' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPhase('configure')} leftIcon={RotateCcw}>
                Re-Configure Run
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={approvedCount === 0}
                disabledReason="Approve at least one patch below to download"
                leftIcon={Download}
              >
                Download Approved Patches ({approvedCount})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-400" />
              Cancel Current Optimization Job?
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Cancelling will immediately halt active benchmarks. Any already-accepted patches and lessons learned up to this point will be safely preserved in memory.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowCancelConfirm(false)}>
                Keep Running
              </Button>
              <Button variant="destructive" size="sm" onClick={handleConfirmCancel}>
                Yes, Stop Job
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 1. CONFIGURATION VIEW */}
      {phase === 'configure' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 max-w-3xl mx-auto space-y-6">
          <h3 className="text-sm font-bold text-slate-200">Autonomous Run Parameters</h3>

          {/* Top N Hotspots */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Top Ranked Bottlenecks to Address
            </label>
            <div className="flex items-center gap-3">
              {[1, 3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setTopNHotspots(n)}
                  className={`px-4 py-2 rounded-lg border text-xs font-mono font-semibold transition-colors ${
                    topNHotspots === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
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
              <label className="text-xs font-medium text-slate-300">Strategy Selection Policy Mode</label>
              <HelpTip term="linucb" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'rule', label: 'Rule-Based', desc: 'Deterministic AST pattern heuristics' },
                { id: 'shadow', label: 'Shadow Mode (Recommended)', desc: 'Rule executes, learned policy logs choices' },
                { id: 'learned', label: 'Learned Bandit (LinUCB)', desc: 'Active exploration via contextual bandit' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPolicyMode(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    policyMode === m.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-semibold block mb-0.5">{m.label}</span>
                  <span className="text-[10px] text-slate-400 leading-snug block">{m.desc}</span>
                </button>
              ))}
            </div>
            {policyMode === 'learned' && (
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs mt-3 flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>Notice: Learned mode explores new strategies. Safety floors reject regressions automatically.</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button variant="primary" size="md" onClick={handleStartRun} leftIcon={Play}>
              Launch Self-Healing Swarm
            </Button>
          </div>
        </div>
      )}

      {/* 2. LIVE RUN VIEW */}
      {phase === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual LangGraph Agent Machine */}
          <div className="lg:col-span-3 space-y-3">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                LangGraph Agent State
              </span>
              <div className="space-y-2">
                {agentNodes.map(node => {
                  const isActive = activeNode === node.id;
                  return (
                    <div
                      key={node.id}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isActive
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
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
            <div className="p-3.5 rounded-xl border border-indigo-900/50 bg-indigo-950/20 text-xs text-indigo-300 leading-relaxed font-mono">
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
                {experiments.length} experiments
              </span>
            </div>

            <div className="space-y-3">
              {experiments.map((exp, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenDrawer && onOpenDrawer(exp)}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-200">
                        #{exp._id || exp.experimentId}
                      </span>
                      <span className="text-xs text-indigo-400 font-mono font-semibold">
                        {exp.strategy}
                      </span>
                    </div>
                    <VerdictBadge verdict={exp.verdict} size="sm" />
                  </div>

                  <p className="text-xs text-slate-300 font-mono truncate">
                    {exp.hotspot?.file}:{exp.hotspot?.line}
                  </p>

                  {exp.stats && (
                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums pt-2 border-t border-slate-800/80">
                      <span className="text-slate-400">
                        p95: {exp.metricsBefore?.p95}ms → {exp.metricsAfter?.p95}ms
                      </span>
                      {exp.stats.deltaPct < 0 && (
                        <span className="text-emerald-400 font-bold">
                          {exp.stats.deltaPct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: BudgetMeters & Virtualized Logs */}
          <div className="lg:col-span-4 space-y-4">
            <div className="space-y-2">
              <BudgetMeter
                label="Experiments"
                used={budget.experimentsUsed}
                limit={budget.maxExperiments}
                unit="exps"
              />
              <BudgetMeter
                label="LLM Tokens"
                used={budget.tokensUsed}
                limit={budget.maxTokens}
                unit="tokens"
                costFormatted={`$${(budget.tokensUsed * 0.00002).toFixed(2)}`}
              />
              <BudgetMeter
                label="Benchmark Runs"
                used={budget.benchmarkRunsUsed}
                limit={budget.maxBenchmarkRuns}
                unit="runs"
              />
            </div>

            <LogViewer logs={logs} title="Agent Swarm Telemetry" />
          </div>
        </div>
      )}

      {/* 3. REVIEW VIEW (After finish) */}
      {phase === 'review' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Accepted & Candidate Fixes Review</h3>
              <p className="text-xs text-slate-400">
                Human safety gate: Review each proposed diff. Only approved fixes are compounded into the downloadable patch.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {approvedCount} of {experiments.filter(e => e.verdict === 'accepted').length} Accepted Fixes Approved
            </span>
          </div>

          <div className="space-y-6">
            {experiments.map((exp) => {
              const isAccepted = exp.verdict === 'accepted';
              const isApproved = !!approvals[exp._id || exp.experimentId];

              return (
                <div
                  key={exp._id || exp.experimentId}
                  className={`p-6 rounded-2xl border transition-all ${
                    isAccepted
                      ? 'border-slate-800 bg-slate-900/60'
                      : 'border-slate-800/60 bg-slate-950/40 opacity-90'
                  }`}
                >
                  {/* Experiment Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <VerdictBadge verdict={exp.verdict} size="md" />
                      <div>
                        <span className="text-sm font-bold text-white block">
                          Strategy: {exp.strategy.toUpperCase()} • {exp.hotspot?.file}:{exp.hotspot?.line}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Category: {exp.hotspot?.category}
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
                        Deep Inspect
                      </Button>

                      {isAccepted && (
                        <button
                          onClick={() => toggleApproval(exp._id || exp.experimentId)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            isApproved
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {isApproved ? <Check size={14} /> : null}
                          {isApproved ? 'Approved for Export' : 'Click to Approve'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Evidence StatPair */}
                  {isAccepted && (
                    <div className="mb-4">
                      <StatPair
                        metricName="p95 Tail Latency"
                        unit="ms"
                        before={exp.metricsBefore?.p95}
                        after={exp.metricsAfter?.p95}
                        ci={exp.stats?.ci}
                        nBefore={exp.stats?.nBefore || 5}
                        nAfter={exp.stats?.nAfter || 5}
                        pValue={exp.stats?.pValue}
                        verdict={exp.verdict}
                      />
                    </div>
                  )}

                  {/* Critic Safety Commentary */}
                  {exp.critic && (
                    <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                      <span className="font-semibold text-indigo-400 shrink-0">Critic Filter:</span>
                      <span>{exp.critic.reason}</span>
                    </div>
                  )}

                  {/* Surgical Code Diff */}
                  <DiffViewer
                    diff={exp.diff}
                    filePath={exp.hotspot?.file}
                    stats={exp.diffStats}
                  />

                  {/* Why was this rejected? */}
                  {!isAccepted && exp.lessonLearned && (
                    <div className="mt-4 p-3.5 rounded-xl border border-amber-900/40 bg-amber-950/20 text-xs text-slate-300">
                      <span className="font-semibold text-amber-300 block mb-1">
                        Why was this fix not accepted?
                      </span>
                      <p>{exp.lessonLearned}</p>
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
