import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Download, Copy, Check, Trash2, ArrowDown, Search } from 'lucide-react';
import { Button } from './Button';

/**
 * Production LogViewer Component:
 * Real-time virtualized/scrollable terminal for agent optimization and sandbox logs.
 * Supports agent filtering, log level filtering, text search, and follow-tail auto-scrolling.
 */
export function LogViewer({
  logs = [],
  onClear,
  title = 'Autonomous Agent Live Telemetry',
  className = ''
}) {
  const [filterAgent, setFilterAgent] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [followTail, setFollowTail] = useState(true);
  const [copied, setCopied] = useState(false);

  const terminalRef = useRef(null);

  // Auto-scroll when followTail is true
  useEffect(() => {
    if (followTail && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, followTail]);

  const filteredLogs = logs.filter(log => {
    if (filterAgent !== 'ALL' && log.agent && log.agent !== filterAgent) return false;
    if (filterLevel !== 'ALL' && log.level && log.level !== filterLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchMsg = (log.message || log.text || '').toLowerCase().includes(q);
      const matchAgent = (log.agent || '').toLowerCase().includes(q);
      if (!matchMsg && !matchAgent) return false;
    }
    return true;
  });

  const handleCopy = () => {
    const raw = filteredLogs.map(l => `[${l.timestamp || ''}] [${l.level || 'INFO'}] [${l.agent || 'SYSTEM'}] ${l.message || l.text}`).join('\n');
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const raw = filteredLogs.map(l => `[${l.timestamp || ''}] [${l.level || 'INFO'}] [${l.agent || 'SYSTEM'}] ${l.message || l.text}`).join('\n');
    const blob = new Blob([raw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evolve-agent-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950 flex flex-col font-mono text-xs overflow-hidden ${className}`}>
      {/* Terminal Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-indigo-400" aria-hidden="true" />
          <span className="font-semibold text-slate-200">{title}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
            {filteredLogs.length} lines
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Agent Filter */}
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
            aria-label="Filter logs by agent"
          >
            <option value="ALL">All Agents</option>
            <option value="Analyzer">Analyzer</option>
            <option value="Retriever">Retriever</option>
            <option value="Patcher">Patcher</option>
            <option value="Critic">Critic</option>
            <option value="Sandbox">Sandbox</option>
            <option value="Benchmark">Benchmark</option>
            <option value="Decide">Decide</option>
          </select>

          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
            aria-label="Filter logs by level"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="DEBUG">DEBUG</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search size={12} className="absolute left-2 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-6 pr-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 w-28 lg:w-36"
            />
          </div>

          {/* Follow Tail Toggle */}
          <button
            onClick={() => setFollowTail(!followTail)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors ${
              followTail
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Auto-scroll to latest log entries"
          >
            <ArrowDown size={12} className={followTail ? 'animate-bounce' : ''} />
            Tail
          </button>

          {/* Actions */}
          <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy filtered logs">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleDownload} title="Download raw log file">
            <Download size={14} />
          </Button>

          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear} title="Clear terminal">
              <Trash2 size={14} className="text-slate-500 hover:text-rose-400" />
            </Button>
          )}
        </div>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="p-4 overflow-y-auto max-h-[420px] min-h-[220px] select-text space-y-1"
        tabIndex={0}
        aria-label="Live logs output stream"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 italic py-8 text-center">
            No logs matching the current filter criteria.
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            let levelColor = 'text-slate-400';
            if (log.level === 'WARN') levelColor = 'text-amber-400';
            if (log.level === 'ERROR') levelColor = 'text-rose-400 font-semibold';
            if (log.level === 'DEBUG') levelColor = 'text-slate-600';

            return (
              <div key={index} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/50 px-1 rounded">
                <span className="text-slate-600 select-none shrink-0 tabular-nums">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : `[${index + 1}]`}
                </span>
                {log.agent && (
                  <span className="text-indigo-400 font-semibold shrink-0">
                    [{log.agent}]
                  </span>
                )}
                {log.level && (
                  <span className={`shrink-0 ${levelColor}`}>
                    [{log.level}]
                  </span>
                )}
                <span className="text-slate-300 break-all">
                  {log.message || log.text}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default LogViewer;
