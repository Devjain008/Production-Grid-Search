import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, X } from 'lucide-react';
import { Button } from './Button';

/**
 * OnboardingTour Component: 4-step interactive guided introduction to EVOLVE.
 */
export function OnboardingTour({ isOpen, onClose, onFinish }) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to EVOLVE',
      subtitle: 'Autonomous Self-Healing Optimization for Node/Express Apps',
      content: 'EVOLVE analyzes your Express backend, load-tests it inside an isolated sandbox, finds bottlenecks, and lets AI agents generate empirically validated code fixes.',
      badge: 'Step 1 of 4'
    },
    {
      title: 'Multi-Signal Defect Discovery',
      subtitle: 'Static Analysis + Profiler Hotness + Anomaly Detection',
      content: 'We combine AST static patterns (N+1 queries, unindexed finds, sync blocking) with real CPU sampling and load test anomalies to rank bottlenecks by true business impact.',
      badge: 'Step 2 of 4'
    },
    {
      title: 'Autonomous AI Agent Loop',
      subtitle: 'Propose -> Critique -> Apply -> Benchmark -> Decide',
      content: 'Our LangGraph agent swarm generates minimal surgical diffs. Every proposed patch is vetted by an automated Critic filter to block reward hacks and syntax errors before testing.',
      badge: 'Step 3 of 4'
    },
    {
      title: 'Statistical Evidence & Human Approval',
      subtitle: 'Zero Blind Trust. You Hold the Reins.',
      content: 'Fixes are accepted only if rigorous statistical tests (Mann-Whitney U, p < 0.05) prove a real speedup over baseline noise. You review the diff and approve before export.',
      badge: 'Step 4 of 4'
    }
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      if (onFinish) onFinish();
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Tour"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 font-sans">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {current.badge}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
            aria-label="Skip tour"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-100 mb-1 flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-400" />
            {current.title}
          </h3>
          <p className="text-xs font-semibold text-indigo-300 mb-3">{current.subtitle}</p>
          <p className="text-sm text-slate-300 leading-relaxed">{current.content}</p>
        </div>

        {/* Stepper Dots */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === step ? 'bg-indigo-500 w-5' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Skip
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={isLast ? Check : ArrowRight}
            >
              {isLast ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
