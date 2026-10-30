import React, { useState } from 'react';
import { Maximize2, Minimize2, Flame, Info, ExternalLink } from 'lucide-react';
import { Button } from './Button';

/**
 * Sandboxed Flamegraph Viewer:
 * Strictly isolated inside a sandboxed iframe with no parent DOM access.
 * Includes fullscreen toggle and 'How to read a flamegraph' help modal.
 */
export function FlamegraphFrame({
  src,
  htmlContent,
  title = 'CPU Profiling Flamegraph',
  className = ''
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col ${
      isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
    } ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-amber-500" />
          <span className="font-semibold text-xs text-slate-200">{title}</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
            Isolated Sandbox
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-slate-800"
          >
            <Info size={13} />
            How to read this
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </Button>
        </div>
      </div>

      {/* Guide Card */}
      {showGuide && (
        <div className="p-3 bg-indigo-950/30 border-b border-indigo-900/50 text-xs text-slate-300 leading-relaxed">
          <p className="font-semibold text-indigo-300 mb-1">Understanding the Flamegraph:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
            <li><strong>Width of a box</strong> represents total time spent in that function (CPU on-stack share).</li>
            <li><strong>Y-axis (height)</strong> represents stack depth. Deep stacks show nested callback or promise chains.</li>
            <li><strong>Wide plateaus at the top</strong> are your performance bottlenecks! They are spending CPU without calling child functions.</li>
          </ul>
        </div>
      )}

      {/* Sandboxed Iframe Container */}
      <div className="flex-1 w-full min-h-[350px] relative bg-slate-950">
        {src ? (
          <iframe
            title={title}
            src={src}
            sandbox="allow-scripts"
            className="w-full h-full min-h-[350px] border-0"
          />
        ) : htmlContent ? (
          <iframe
            title={title}
            srcDoc={htmlContent}
            sandbox="allow-scripts"
            className="w-full h-full min-h-[350px] border-0"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-slate-500 text-xs p-6 text-center">
            <Flame size={32} className="text-slate-700 mb-2" />
            <p className="text-slate-400 font-medium mb-1">Flamegraph Profiling View</p>
            <p className="max-w-xs text-slate-600 text-[11px]">
              A flamegraph will be generated upon completion of the 0x / clinic CPU profiling pass.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlamegraphFrame;
