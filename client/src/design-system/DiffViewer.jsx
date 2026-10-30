import React, { useState } from 'react';
import { Copy, Check, Columns, AlignJustify, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './Button';

/**
 * Production DiffViewer Component:
 * Clean unified and side-by-side diff renderer for agent code patches.
 * Highlights additions (+), deletions (-), and chunk headers with line numbers.
 */
export function DiffViewer({
  diff = '',
  filePath = '',
  stats = { additions: 0, deletions: 0 },
  defaultMode = 'unified',
  className = ''
}) {
  const [mode, setMode] = useState(defaultMode);
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const lines = diff ? diff.split('\n') : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse lines for line numbers
  let oldLineNum = 0;
  let newLineNum = 0;

  const parsedLines = lines.map((line, idx) => {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[2], 10);
      }
      return { type: 'header', content: line, oldNum: '', newNum: '', id: idx };
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      const curNew = newLineNum++;
      return { type: 'addition', content: line, oldNum: '', newNum: curNew, id: idx };
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      const curOld = oldLineNum++;
      return { type: 'deletion', content: line, oldNum: curOld, newNum: '', id: idx };
    } else {
      const curOld = line.startsWith('---') || line.startsWith('+++') ? '' : oldLineNum++;
      const curNew = line.startsWith('---') || line.startsWith('+++') ? '' : newLineNum++;
      return { type: 'context', content: line, oldNum: curOld, newNum: curNew, id: idx };
    }
  });

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs ${className}`}>
      {/* Diff Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Toggle diff visibility"
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>
          <span className="font-semibold text-slate-200">{filePath || 'Unified Code Diff'}</span>

          {stats && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-emerald-400 font-bold font-mono">+{stats.additions || 0}</span>
              <span className="text-rose-400 font-bold font-mono">-{stats.deletions || 0}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5">
            <button
              onClick={() => setMode('unified')}
              className={`px-2 py-1 rounded text-[11px] font-sans font-medium transition-colors ${
                mode === 'unified' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1">
                <AlignJustify size={12} />
                Unified
              </span>
            </button>
            <button
              onClick={() => setMode('sideBySide')}
              className={`px-2 py-1 rounded text-[11px] font-sans font-medium transition-colors ${
                mode === 'sideBySide' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1">
                <Columns size={12} />
                Split
              </span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? Check : Copy}
          >
            {copied ? 'Copied' : 'Copy Diff'}
          </Button>
        </div>
      </div>

      {/* Diff Body */}
      {!isCollapsed && (
        <div className="overflow-x-auto max-h-[500px] select-text">
          <table className="w-full border-collapse">
            <tbody>
              {parsedLines.map((l) => {
                let rowBg = 'hover:bg-slate-900/60';
                let textCol = 'text-slate-300';
                if (l.type === 'addition') {
                  rowBg = 'bg-emerald-950/25 hover:bg-emerald-950/40';
                  textCol = 'text-emerald-300';
                } else if (l.type === 'deletion') {
                  rowBg = 'bg-rose-950/25 hover:bg-rose-950/40';
                  textCol = 'text-rose-300';
                } else if (l.type === 'header') {
                  rowBg = 'bg-indigo-950/30 text-indigo-300';
                  textCol = 'text-indigo-300 font-semibold';
                }

                return (
                  <tr key={l.id} className={`${rowBg} transition-colors border-b border-slate-900/40`}>
                    <td className="w-10 px-2 py-0.5 text-right text-[11px] text-slate-400 select-none border-r border-slate-800/80">
                      {l.oldNum}
                    </td>
                    <td className="w-10 px-2 py-0.5 text-right text-[11px] text-slate-400 select-none border-r border-slate-800/80">
                      {l.newNum}
                    </td>
                    <td className={`px-4 py-0.5 whitespace-pre leading-relaxed font-mono ${textCol}`}>
                      {l.content}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DiffViewer;
