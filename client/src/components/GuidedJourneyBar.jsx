import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, AlertTriangle, Zap, CheckCircle2, MoreHorizontal, Database, Target, BookOpen, Settings, ChevronDown, Check, ArrowRight 
} from 'lucide-react';
import { useHelp } from '../content/HelpContext';

/**
 * Production Guided 4-Step Product Journey Bar
 * Replaces the flat 9 tabs with an intuitive step-by-step workflow:
 * 1 Connect App -> 2 Find Problems -> 3 Fix Automatically -> 4 Review & Export.
 * Advanced technical tools (Memory, Policy, Glossary, Settings) are housed under a clean menu.
 */
export function GuidedJourneyBar({
  activeNavTab,
  onNavigateTab,
  projectProgress = { step: 2, totalDefects: 3, acceptedFixes: 2 }
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAdvancedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const primarySteps = [
    {
      step: 1,
      id: 'baseline',
      title: '1. Connect App',
      subtitle: 'Upload or benchmark',
      icon: UploadCloud,
      color: 'text-sky-400'
    },
    {
      step: 2,
      id: 'defects',
      title: '2. Find Problems',
      subtitle: `${projectProgress.totalDefects || 3} bottlenecks`,
      icon: AlertTriangle,
      color: 'text-amber-400'
    },
    {
      step: 3,
      id: 'optimize',
      title: '3. Fix Automatically',
      subtitle: 'Agent swarm loop',
      icon: Zap,
      color: 'text-emerald-400'
    },
    {
      step: 4,
      id: 'overview',
      aliasIds: ['overview', 'reports'],
      title: '4. Review & Export',
      subtitle: `${projectProgress.acceptedFixes || 2} speedups ready`,
      icon: CheckCircle2,
      color: 'text-indigo-400'
    }
  ];

  const advancedItems = [
    { id: 'memory', label: 'Experience Memory', desc: 'Qdrant vector lessons', icon: Database },
    { id: 'policy', label: 'Bandit Policy Engine', desc: 'LinUCB exploration', icon: Target },
    { id: 'reports', label: 'Executive Reports', desc: 'Audit certification', icon: CheckCircle2 },
    { id: 'glossary', label: 'Plain-English Glossary', desc: 'Definitions & guides', icon: BookOpen },
    { id: 'settings', label: 'Project Settings', desc: 'Environment & tokens', icon: Settings }
  ];

  const isAdvancedActive = advancedItems.some(i => i.id === activeNavTab && activeNavTab !== 'overview');

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
      {/* 4-Step Journey Progression */}
      <nav aria-label="Optimization Journey" className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1">
        {primarySteps.map((stepItem, idx) => {
          const Icon = stepItem.icon;
          const isSelected = activeNavTab === stepItem.id || (stepItem.aliasIds && stepItem.aliasIds.includes(activeNavTab));
          const isComplete = (projectProgress.step || 1) > stepItem.step;

          return (
            <React.Fragment key={stepItem.id}>
              <button
                onClick={() => onNavigateTab(stepItem.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all whitespace-nowrap text-left ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-950 ring-1 ring-indigo-400/40'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isComplete ? <Check size={14} className="text-emerald-400" /> : <Icon size={14} className={isSelected ? 'text-white' : stepItem.color} />}
                </div>

                <div>
                  <span className="block font-semibold leading-tight">{stepItem.title}</span>
                  <span className={`block text-[10px] leading-tight ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {stepItem.subtitle}
                  </span>
                </div>
              </button>

              {idx < primarySteps.length - 1 && (
                <div className="hidden md:flex items-center text-slate-600 px-0.5">
                  <ArrowRight size={13} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Advanced Tools Dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
            isAdvancedActive
              ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          aria-haspopup="true"
          aria-expanded={advancedOpen}
        >
          <MoreHorizontal size={15} />
          <span>Advanced Tools</span>
          <ChevronDown size={13} className="text-slate-500" />
        </button>

        {advancedOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md p-2 z-50 text-xs space-y-1 animate-in fade-in duration-100">
            <span className="text-[10px] font-mono uppercase text-slate-500 px-2 py-1 block">
              Deep Analytics &amp; Control
            </span>
            {advancedItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigateTab(item.id);
                    setAdvancedOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-xl transition flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={15} className={isSelected ? 'text-indigo-400' : 'text-slate-400'} />
                  <div>
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-[10px] text-slate-500">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default GuidedJourneyBar;
