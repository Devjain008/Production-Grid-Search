import React, { useState } from 'react';
import { 
  Cpu, Search, BookOpen, RefreshCw, Radio, Sparkles, ChevronRight, Keyboard, Moon, Sun, Sliders 
} from 'lucide-react';
import { useHelp } from '../content/HelpContext';
import { DataLabelBadge } from '../design-system/DataLabelBadge';

/**
 * Production Header & Top Navigation Bar (Section 4)
 * Breadcrumbs, Project switcher, Running-Jobs Popover, Command Palette (Ctrl+K),
 * Simple/Expert toggle, and Demo indicators.
 */
export default function Header({ 
  activeProject, 
  activeNavTab = 'overview',
  onRefresh, 
  isRefreshing, 
  onNavigateTab,
  onOpenCommandPalette,
  onOpenKeyboardHelp,
  runningJobs = [],
  isDemoMode = false,
  onEnterDemo
}) {
  const { expertMode, setExpertMode, navigateToGlossary } = useHelp();
  const [showJobsPopover, setShowJobsPopover] = useState(false);

  const tabLabels = {
    overview: 'Overview',
    baseline: 'Baseline Report',
    defects: 'Defects & Flamegraph',
    optimize: 'Autonomous Optimize',
    memory: 'Experiment Memory',
    policy: 'Bandit Policy',
    reports: 'Executive Reports',
    glossary: 'Terminology Glossary',
    settings: 'Settings'
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand + Breadcrumbs */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-950 shrink-0">
            <Cpu className="w-5 h-5 text-white" />
          </div>

          <div className="flex items-center gap-2 text-xs truncate">
            <span className="font-bold text-sm tracking-tight text-white">EVOLVE</span>
            <ChevronRight size={13} className="text-slate-600 shrink-0" />
            
            {activeProject ? (
              <span className="font-semibold text-slate-200 truncate max-w-[140px] sm:max-w-[200px]">
                {activeProject.name}
              </span>
            ) : (
              <span className="text-slate-400">All Projects</span>
            )}

            <ChevronRight size={13} className="text-slate-600 shrink-0" />
            <span className="text-indigo-400 font-mono font-medium truncate">
              {tabLabels[activeNavTab] || activeNavTab}
            </span>

            {isDemoMode && (
              <DataLabelBadge type="DEMO" size="xs" />
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Global Search / Command Palette (Ctrl+K) */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition"
            title="Open Command Palette (Ctrl+K / Cmd+K)"
          >
            <Search size={14} className="text-slate-400" />
            <span className="hidden md:inline">Search / Commands</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
              Ctrl K
            </kbd>
          </button>

          {/* Running Jobs Tray */}
          {runningJobs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowJobsPopover(!showJobsPopover)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/40"
              >
                <Radio size={13} className="text-emerald-400 animate-pulse" />
                <span>{runningJobs.length} active</span>
              </button>

              {showJobsPopover && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-3 z-50 text-xs">
                  <span className="font-semibold text-slate-200 block mb-2">Running Optimization Jobs</span>
                  <div className="space-y-2">
                    {runningJobs.map((j) => (
                      <div key={j.jobId} className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-indigo-400">{j.projectName}</span>
                          <span className="text-[10px] text-slate-500">{j.currentStep}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${j.progressPct || 50}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Simple vs Expert Reading Mode Toggle */}
          <button
            onClick={() => setExpertMode(!expertMode)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              expertMode
                ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle between Simple (Grade 8 plain-language) and Expert (all statistical formulas) reading mode"
          >
            <Sliders size={13} />
            <span className="hidden sm:inline">{expertMode ? 'Expert Mode' : 'Simple Mode'}</span>
          </button>

          {/* Glossary Shortcut */}
          <button
            onClick={() => {
              if (onNavigateTab) onNavigateTab('glossary');
              else navigateToGlossary();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 transition shadow-sm"
            title="Open Interactive Glossary & Terminology Help"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Glossary</span>
          </button>

          {/* Keyboard Shortcuts Help */}
          <button
            onClick={onOpenKeyboardHelp}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={16} />
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Refresh status"
            aria-label="Refresh status"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
}
