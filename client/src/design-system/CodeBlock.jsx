import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';
import { Button } from './Button';

/**
 * Production CodeBlock Component:
 * Escapes all input to prevent XSS. Supports line numbering, line highlighting, and copying.
 */
export function CodeBlock({
  code = '',
  language = 'javascript',
  filename = '',
  highlightLines = [], // e.g. [14, 15, 16]
  maxHeight = '400px',
  className = ''
}) {
  const [copied, setCopied] = useState(false);

  const lines = (code || '').split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs ${className}`}>
      {/* File Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 text-slate-300">
          <FileCode size={14} className="text-indigo-400" />
          <span className="font-semibold text-xs">{filename || language}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          leftIcon={copied ? Check : Copy}
          className="h-7 text-xs"
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      {/* Code Display */}
      <div className="overflow-x-auto p-3" style={{ maxHeight }}>
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlighted = highlightLines.includes(lineNum);

              return (
                <tr
                  key={idx}
                  className={`leading-relaxed ${
                    isHighlighted
                      ? 'bg-amber-950/40 text-amber-200 border-l-2 border-amber-500'
                      : 'hover:bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <td className="w-8 pr-3 text-right text-slate-400 select-none text-[11px] tabular-nums">
                    {lineNum}
                  </td>
                  <td className="whitespace-pre pl-2 font-mono">
                    {line || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CodeBlock;
