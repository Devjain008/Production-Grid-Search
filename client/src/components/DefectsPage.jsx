import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Flame, Search, Activity, Layers, Code2, ChevronDown, ChevronUp,
  Cpu, ShieldAlert, Zap, Play, Globe, Filter, ExternalLink, Sparkles
} from 'lucide-react';
import { HelpTip, Term } from './HelpTip';
import { DataLabelBadge } from '../design-system/DataLabelBadge';
import { CodeBlock } from '../design-system/CodeBlock';
import { FlamegraphFrame } from '../design-system/FlamegraphFrame';
import { Button } from '../design-system/Button';
import { DEMO_DEFECTS } from '../demo/demoData';

/**
 * Production DefectsPage Component (Section 5.6)
 * Multi-Signal Ranked Hotspots, Evidence Breakdown (Static, Profiler, Anomaly),
 * Expandable Syntax-Highlighted Code Snippets, and Sandboxed Flamegraph Frame.
 */
export default function DefectsPage({ project, onNavigateOptimize }) {
  const [defects, setDefects] = useState(DEMO_DEFECTS);
  const [expandedId, setExpandedId] = useState(DEMO_DEFECTS[0]?.id || null);
  const [showFlamegraph, setShowFlamegraph] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSignal, setSelectedSignal] = useState('ALL');

  useEffect(() => {
    if (!project?._id || project._id.startsWith('demo-')) return;

    fetch(`/api/projects/${project._id}/defects`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.defectReport?.rankedHotspots?.length > 0) {
          setDefects(data.defectReport.rankedHotspots);
        }
      })
      .catch(() => {});
  }, [project]);

  const categories = ['ALL', 'db_n_plus_one', 'unindexed_query', 'sync_blocking', 'unbounded_payload'];

  const filteredDefects = defects.filter(d => {
    if (selectedCategory !== 'ALL' && d.category !== selectedCategory) return false;
    if (selectedSignal !== 'ALL') {
      if (selectedSignal === 'static' && !d.signals?.static?.present) return false;
      if (selectedSignal === 'profiler' && !d.signals?.profiler?.present) return false;
      if (selectedSignal === 'anomaly' && !d.signals?.anomaly?.present) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchFile = (d.file || '').toLowerCase().includes(q);
      const matchFunc = (d.functionName || '').toLowerCase().includes(q);
      const matchCat = (d.category || '').toLowerCase().includes(q);
      if (!matchFile && !matchFunc && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header and Flamegraph Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Ranked Defect Hotspots</h2>
            <DataLabelBadge type="REAL" size="xs" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked by multi-signal evidence: Static AST Patterns (35%) + CPU Profiler Hotness (45%) + Anomaly Spikes (20%).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFlamegraph(!showFlamegraph)}
            leftIcon={Flame}
          >
            {showFlamegraph ? 'Hide Flamegraph' : 'View Flamegraph Panel'}
          </Button>
        </div>
      </div>

      {/* Sandboxed Flamegraph Frame */}
      {showFlamegraph && (
        <FlamegraphFrame
          title={`0x CPU Profiling Flamegraph — ${project?.name || 'buggy-shop'}`}
          className="mb-6 shadow-2xl"
        />
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Search file, function, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 w-48 sm:w-64"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs"
          >
            <option value="ALL">All Categories</option>
            <option value="db_n_plus_one">Database N+1 Loop</option>
            <option value="unindexed_query">Unindexed Query</option>
            <option value="sync_blocking">Synchronous Blocking</option>
          </select>

          {/* Signal Filter */}
          <select
            value={selectedSignal}
            onChange={(e) => setSelectedSignal(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs"
          >
            <option value="ALL">All Evidence Signals</option>
            <option value="static">Static AST Signal</option>
            <option value="profiler">CPU Profiler Signal</option>
            <option value="anomaly">Anomaly Spike Signal</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredDefects.length} of {defects.length} bottlenecks
        </span>
      </div>

      {/* Ranked Defect Hotspot Cards */}
      <div className="space-y-4">
        {filteredDefects.map((defect) => {
          const isExpanded = expandedId === defect.id;
          const scorePct = Math.round((defect.suspicionScore || 0.8) * 100);

          return (
            <div
              key={defect.id || defect.rank}
              className={`rounded-2xl border transition-all ${
                isExpanded
                  ? 'border-indigo-500/50 bg-slate-900 shadow-xl shadow-indigo-950/20'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              {/* Hotspot Card Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : defect.id)}
                className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                    #{defect.rank}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm text-white truncate">
                        {defect.file}:{defect.line}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-indigo-300">
                        {defect.category}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      Function: {defect.functionName}
                    </span>
                  </div>
                </div>

                {/* Score Meter & Evidence Badges */}
                <div className="flex items-center gap-4">
                  {/* Evidence Signals */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    {defect.signals?.static?.present && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-950 text-sky-400 border border-sky-800">
                        Static
                      </span>
                    )}
                    {defect.signals?.profiler?.present && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                        Profiler
                      </span>
                    )}
                    {defect.signals?.anomaly?.present && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950 text-amber-400 border border-amber-800">
                        Anomaly
                      </span>
                    )}
                  </div>

                  {/* Suspicion Score */}
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-amber-400 block">{scorePct}% Suspicion</span>
                    <span className="text-[10px] text-slate-500">Suggested: {defect.suggestedStrategy}</span>
                  </div>

                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded Inspection Section */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4">
                  {/* Plain Language 'Why it matters' */}
                  <div className="p-3.5 rounded-xl border border-indigo-900/40 bg-indigo-950/20 text-xs text-slate-200 leading-relaxed">
                    <span className="font-semibold text-indigo-300 block mb-1">
                      Why this matters for your application:
                    </span>
                    <p>{defect.whyItMatters}</p>
                  </div>

                  {/* Syntax-Highlighted Code Snippet */}
                  <CodeBlock
                    code={defect.codeSnippet}
                    filename={defect.file}
                    highlightLines={[defect.line]}
                    maxHeight="240px"
                  />

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400 font-mono">
                      Policy Arm Recommendation: <strong className="text-emerald-400 uppercase">{defect.suggestedStrategy}</strong>
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigateOptimize && onNavigateOptimize(defect)}
                      leftIcon={Zap}
                    >
                      Fix This Bottleneck in Optimize Loop
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
