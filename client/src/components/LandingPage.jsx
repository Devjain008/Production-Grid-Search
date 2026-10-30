import React, { useState } from 'react';
import { ArrowRight, Sparkles, Shield, Cpu, Play, CheckCircle2, AlertTriangle, Lock, Terminal } from 'lucide-react';
import { Button } from '../design-system/Button';
import { DataLabelBadge } from '../design-system/DataLabelBadge';

/**
 * Production Landing Page for EVOLVE
 * Honest capability disclosures, loop diagram, and instant 1-click Demo Project access.
 */
export function LandingPage({ onEnterDemo, onOpenAuth, onGoToDashboard }) {
  const steps = [
    { title: '1. Analyze', desc: 'AST parser detects anti-patterns (N+1 queries, unindexed finds, sync blocking).' },
    { title: '2. Load Test', desc: 'Isolated sandbox executes k6 load profiles to measure tail latency and event loop lag.' },
    { title: '3. Propose Fix', desc: 'AI agents synthesize minimal surgical diffs, vetted by a strict Critic safety filter.' },
    { title: '4. Validate', desc: 'Empirical 5-run benchmarks verify speedup via Mann-Whitney U test (p < 0.05).' },
    { title: '5. Learn', desc: 'Contextual bandit policy learns which optimization strategies work best per bottleneck.' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-950">
            E
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight leading-none text-white">EVOLVE</h1>
            <span className="text-[10px] text-slate-400 font-mono">Autonomous Self-Healing Benchmark Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onOpenAuth}>
            Sign In
          </Button>
          <Button variant="primary" size="sm" onClick={onEnterDemo} leftIcon={Sparkles}>
            Try Demo Project
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
          <DataLabelBadge type="DEMO" size="xs" />
          <span>No credit card or setup required • Instant browser demo</span>
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15] mb-6">
          Find performance defects. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            Let AI fix them. Statistically verified.
          </span>
        </h2>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Upload your Node/Express project into an isolated sandbox. EVOLVE load-tests it, locates bottlenecks, generates surgical patches, and only accepts fixes proven with scientific benchmarks.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Button
            variant="primary"
            size="lg"
            onClick={onEnterDemo}
            rightIcon={ArrowRight}
            className="text-base px-6 py-3 font-semibold shadow-xl shadow-indigo-950/50"
          >
            Launch Sample Project (buggy-shop)
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={onGoToDashboard}
            leftIcon={Terminal}
            className="text-base px-6 py-3"
          >
            Go to Projects Dashboard
          </Button>
        </div>

        {/* The Closed-Loop Visual Diagram */}
        <div className="w-full max-w-4xl p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl mb-20 text-left">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
              The Autonomous Self-Healing Optimization Loop
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              LangGraph State Swarm + Isolated Container Sandbox
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {steps.map((s, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500/50 transition-colors">
                <span className="font-semibold text-xs text-indigo-300 block mb-1">{s.title}</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Honest Capabilities Disclosure */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="p-6 rounded-2xl border border-emerald-900/40 bg-emerald-950/15">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} />
              What EVOLVE Can Do
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <li>• Automated AST scanning for database N+1 loops, missing indexes, and sync crypto.</li>
              <li>• Automated k6 load profiling with p50, p90, p95, p99, and event loop lag measurement.</li>
              <li>• Surgical patch synthesis with automated Critic filter preventing memory leaks.</li>
              <li>• Statistical hypothesis testing (Mann-Whitney U, p &lt; 0.05) rejecting noise.</li>
              <li>• Contextual bandit learning (LinUCB) prioritizing high-win strategies over time.</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl border border-amber-900/40 bg-amber-950/15">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-3">
              <AlertTriangle size={18} />
              What EVOLVE Cannot Do (Honest Bounds)
            </h3>
            <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <li>• Does not auto-deploy patches to production without human developer review & approval.</li>
              <li>• Does not support arbitrary non-Node.js languages in Phase 1-6 (Express backend focused).</li>
              <li>• Sandbox has zero outbound internet access to prevent accidental external API billing.</li>
              <li>• Rejects trivial early-return reward-hacks that break behavioral test parity.</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        EVOLVE Performance Platform • Grade 8 Accessible Explanations • WCAG AA Colorblind-Safe
      </footer>
    </div>
  );
}

export default LandingPage;
