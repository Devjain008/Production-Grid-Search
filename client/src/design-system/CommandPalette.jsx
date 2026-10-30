import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, Zap, Folder, Shield, Sliders, BookOpen, FileText, Cpu, Activity, Play } from 'lucide-react';

/**
 * CommandPalette Component (Ctrl+K / Cmd+K):
 * Instant fuzzy navigation and quick actions across the EVOLVE platform.
 */
export function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  projects = [],
  currentProjectId,
  onToggleExpertMode,
  isExpertMode = false,
  onStartOptimize,
  onLoadDemo
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global key listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }
      if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Build searchable commands
  const defaultCommands = [
    { id: 'nav-projects', label: 'Go to Projects Dashboard', category: 'Navigation', icon: Folder, action: () => onNavigate('projects') },
    { id: 'nav-overview', label: 'Go to Project Overview', category: 'Navigation', icon: Activity, action: () => onNavigate('overview') },
    { id: 'nav-baseline', label: 'Go to Baseline Benchmark Report', category: 'Navigation', icon: Cpu, action: () => onNavigate('baseline') },
    { id: 'nav-defects', label: 'Go to Ranked Defects', category: 'Navigation', icon: Shield, action: () => onNavigate('defects') },
    { id: 'nav-optimize', label: 'Go to Optimize Agent Loop', category: 'Navigation', icon: Play, action: () => onNavigate('optimize') },
    { id: 'nav-memory', label: 'Go to Experiment Memory', category: 'Navigation', icon: Zap, action: () => onNavigate('memory') },
    { id: 'nav-policy', label: 'Go to Bandit Learning Policy', category: 'Navigation', icon: Sliders, action: () => onNavigate('policy') },
    { id: 'nav-reports', label: 'Go to Executive Reports', category: 'Navigation', icon: FileText, action: () => onNavigate('reports') },
    { id: 'nav-glossary', label: 'Go to Terminology Glossary', category: 'Navigation', icon: BookOpen, action: () => onNavigate('glossary') },
    { id: 'nav-settings', label: 'Go to Settings', category: 'Navigation', icon: Sliders, action: () => onNavigate('settings') },
    
    // Quick Actions
    { id: 'act-demo', label: 'Load Pre-Configured Demo Project (buggy-shop)', category: 'Quick Action', icon: Zap, action: () => onLoadDemo && onLoadDemo() },
    { id: 'act-mode', label: `Switch to ${isExpertMode ? 'Simple' : 'Expert'} Reading Mode`, category: 'Quick Action', icon: Sliders, action: () => onToggleExpertMode && onToggleExpertMode() },
    { id: 'act-opt', label: 'Start Autonomous Optimization Run', category: 'Quick Action', icon: Play, action: () => onStartOptimize && onStartOptimize() }
  ];

  const filtered = defaultCommands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden font-sans"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <Search size={18} className="text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or search pages... (e.g. Optimize, Baseline, Demo)"
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands or destinations found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => { item.action(); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isSelected ? 'text-white' : 'text-slate-400'} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1 bg-slate-800 rounded">↑</kbd> <kbd className="px-1 bg-slate-800 rounded">↓</kbd> to navigate</span>
            <span><kbd className="px-1 bg-slate-800 rounded">↵</kbd> to select</span>
          </div>
          <span>EVOLVE Command Center</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
