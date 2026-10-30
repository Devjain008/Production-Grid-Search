import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, Target, AlertCircle, Sparkles, X } from 'lucide-react';
import { GLOSSARY } from '../utils/glossary';

/**
 * InfoTooltip - High-clarity hoverable technical term definer
 * Renders an intuitive '?' icon that reveals plain-language definitions,
 * business impacts, benchmarks, and real-world analogies on hover or tap.
 */
export default function InfoTooltip({
  term,
  title,
  definition,
  impact,
  target,
  analogy,
  category,
  placement = 'top',
  size = 'sm',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Lookup data from central glossary if term key is provided
  const entry = (term && GLOSSARY[term]) ? GLOSSARY[term] : {};

  const displayTitle = title || entry.term || term || 'Technical Term';
  const displayCategory = category || entry.category || 'Non-Functional Metric';
  const displayDefinition = definition || entry.definition || 'No definition available.';
  const displayImpact = impact || entry.impact;
  const displayTarget = target || entry.target;
  const displayAnalogy = analogy || entry.analogy;

  // Handle outside click to close for mobile/touch users
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Placement positioning classes
  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }[placement] || 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ml-1.5 ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onKeyDown={handleKeyDown}
        aria-label={`What is ${displayTitle}?`}
        className="text-slate-400 hover:text-cyan-400 focus:text-cyan-400 focus:outline-none transition-colors p-0.5 rounded-full hover:bg-slate-800/80 focus:ring-1 focus:ring-cyan-500"
      >
        <HelpCircle className={`${iconSizes[size] || 'w-3.5 h-3.5'} opacity-80 hover:opacity-100 transition-opacity`} />
      </button>

      {/* Tooltip Popover Card */}
      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-50 w-72 sm:w-80 p-3.5 bg-slate-950/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md text-left text-xs pointer-events-auto transition-all duration-200 animate-in fade-in zoom-in-95 ${placementClasses}`}
          style={{ maxWidth: 'calc(100vw - 32px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Category Badge and Dismiss Button */}
          <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 mb-1">
                {displayCategory}
              </span>
              <h4 className="text-sm font-bold text-white leading-tight">
                {displayTitle}
              </h4>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300 p-0.5 sm:hidden"
              aria-label="Close tooltip"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Plain-English Definition */}
          <div className="text-slate-300 text-xs leading-relaxed mb-2.5">
            {displayDefinition}
          </div>

          {/* Why It Matters */}
          {displayImpact && (
            <div className="mb-2.5 bg-slate-900/90 rounded-lg p-2 border border-slate-800/80">
              <span className="text-[10px] font-bold text-amber-400 flex items-center space-x-1 uppercase tracking-wider mb-0.5">
                <AlertCircle className="w-3 h-3 mr-1 text-amber-400 flex-shrink-0" />
                Why It Matters
              </span>
              <p className="text-[11px] text-slate-300 leading-normal">
                {displayImpact}
              </p>
            </div>
          )}

          {/* Healthy Target / Benchmark */}
          {displayTarget && (
            <div className="mb-2 bg-emerald-950/40 rounded-lg p-2 border border-emerald-900/50 flex items-start space-x-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Target / SLA Benchmark
                </span>
                <span className="text-[11px] font-mono text-emerald-300">
                  {displayTarget}
                </span>
              </div>
            </div>
          )}

          {/* Real-World Analogy */}
          {displayAnalogy && (
            <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-start space-x-1.5 text-[11px] text-slate-400 italic">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5 not-italic" />
              <span>
                <strong className="text-slate-300 not-italic font-semibold">Analogy: </strong>
                {displayAnalogy}
              </span>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
