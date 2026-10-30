import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, ChevronRight, X, Sparkles, BookOpen, ExternalLink, Lightbulb } from 'lucide-react';
import { getGlossaryEntry } from '../content/glossary';
import { useHelp } from '../content/HelpContext';

/**
 * Single accessible help popover rendered into document.body portal
 */
function HelpPopover({
  entry,
  value,
  triggerRect,
  onClose,
  popoverId,
  isTouch,
  onMouseEnter,
  onMouseLeave
}) {
  const { expertMode, navigateToGlossary } = useHelp();
  const [showTechnical, setShowTechnical] = useState(false);
  const popoverRef = useRef(null);

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Calculate coordinates with auto-flip and edge clamping
  const popoverWidth = 320;
  const margin = 8;
  const paddingScreen = 12;

  const triggerCenter = triggerRect.left + triggerRect.width / 2;
  let left = triggerCenter - popoverWidth / 2;
  // Edge clamping
  if (left < paddingScreen) left = paddingScreen;
  if (left + popoverWidth > window.innerWidth - paddingScreen) {
    left = window.innerWidth - paddingScreen - popoverWidth;
  }

  // Vertical placement (default bottom, auto-flip to top if cramped)
  const spaceBelow = window.innerHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  const placeTop = spaceBelow < 280 && spaceAbove > spaceBelow;

  const top = placeTop
    ? triggerRect.top + window.scrollY - margin
    : triggerRect.bottom + window.scrollY + margin;

  // Arrow position relative to popover left
  const arrowLeft = Math.max(16, Math.min(popoverWidth - 16, triggerCenter - left));

  const dynamicExplanation = (value !== undefined && value !== null && typeof entry.explain === 'function')
    ? entry.explain(value)
    : null;

  return createPortal(
    <div
      ref={popoverRef}
      id={popoverId}
      role="tooltip"
      aria-live="polite"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        top: placeTop ? undefined : `${top}px`,
        bottom: placeTop ? `${window.innerHeight - (triggerRect.top + window.scrollY) + margin}px` : undefined,
        left: `${left}px`,
        width: `${popoverWidth}px`,
        zIndex: 99999
      }}
      className={`bg-slate-900/95 text-slate-100 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-left select-text ${
        prefersReducedMotion ? '' : 'transition-all duration-150 ease-out'
      }`}
    >
      {/* Popover Arrow */}
      <div
        style={{ left: `${arrowLeft}px` }}
        className={`absolute w-3 h-3 bg-slate-900 border-slate-700/80 transform rotate-45 -translate-x-1/2 pointer-events-none ${
          placeTop
            ? '-bottom-1.5 border-b border-r'
            : '-top-1.5 border-t border-l'
        }`}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5 mb-2.5">
        <div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 inline-block mb-1">
            {entry.category}
          </span>
          <h4 className="text-xs font-bold text-white leading-snug">
            {entry.title}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          aria-label="Close help definition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* In simple words */}
      <div className="space-y-2 text-xs">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>In simple words</span>
          </div>
          <p className="text-slate-200 leading-relaxed font-normal text-[11px]">
            {entry.simple}
          </p>
        </div>

        {/* Why it matters here */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
            Why it matters
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {entry.why}
          </p>
        </div>

        {/* Dynamic Contextual Value Explanation */}
        {dynamicExplanation && (
          <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-2.5 text-[11px] text-cyan-200">
            <span className="font-bold block text-cyan-300 text-[10px] uppercase tracking-wider mb-0.5">Your Current Value</span>
            {dynamicExplanation}
          </div>
        )}

        {/* Good / Not Good Rule of Thumb */}
        {entry.goodHint && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 text-[10px] text-slate-300 flex items-start gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Rule of thumb: </strong>
              <span>{entry.goodHint}</span>
            </div>
          </div>
        )}

        {/* Expert Mode Technical Detail Expander */}
        {expertMode && entry.technical && (
          <div className="border-t border-slate-800/80 pt-2 mt-2">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="text-[10px] text-slate-400 hover:text-cyan-300 font-mono flex items-center justify-between w-full transition"
            >
              <span>[+] Technical specification</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${showTechnical ? 'rotate-90' : ''}`} />
            </button>
            {showTechnical && (
              <div className="mt-1.5 p-2 bg-slate-950 rounded-lg text-[10px] font-mono text-slate-400 border border-slate-800 leading-relaxed">
                {entry.technical}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Learn More & Dismiss */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            onClose();
            navigateToGlossary(entry.id);
          }}
          className="text-cyan-400 hover:text-cyan-300 font-medium text-[11px] flex items-center space-x-1 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded"
        >
          <span>Learn more in Glossary</span>
          <ExternalLink className="w-3 h-3" />
        </button>

        {isTouch && (
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-bold rounded-lg transition"
          >
            Got it
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * <HelpTip term="p95" value={...} />
 * Standalone circular "?" icon button with accessible hover popover
 */
export function HelpTip({ term, id, value, className = '' }) {
  const termKey = id || term;
  const entry = getGlossaryEntry(termKey);
  const { activePopoverId, setActivePopoverId, expertMode, alwaysShowIcons } = useHelp();

  const generatedId = useId();
  const popoverId = `help-popover-${termKey}-${generatedId}`;
  const isOpen = activePopoverId === popoverId;

  const triggerRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeGraceTimerRef = useRef(null);
  const isTouchRef = useRef(false);

  const [triggerRect, setTriggerRect] = useState(null);

  const openPopover = () => {
    if (closeGraceTimerRef.current) clearTimeout(closeGraceTimerRef.current);
    if (!triggerRef.current) return;
    setTriggerRect(triggerRef.current.getBoundingClientRect());
    setActivePopoverId(popoverId);
  };

  const closePopover = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeGraceTimerRef.current) clearTimeout(closeGraceTimerRef.current);
    if (isOpen) setActivePopoverId(null);
  };

  const handleMouseEnter = () => {
    if (isTouchRef.current) return;
    if (closeGraceTimerRef.current) clearTimeout(closeGraceTimerRef.current);
    openTimerRef.current = setTimeout(openPopover, 150);
  };

  const handleMouseLeave = () => {
    if (isTouchRef.current) return;
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    // 200ms grace period allowing user to move pointer into popover
    closeGraceTimerRef.current = setTimeout(() => {
      closePopover();
    }, 200);
  };

  const handlePopoverMouseEnter = () => {
    if (closeGraceTimerRef.current) clearTimeout(closeGraceTimerRef.current);
  };

  const handlePopoverMouseLeave = () => {
    if (isTouchRef.current) return;
    closeGraceTimerRef.current = setTimeout(closePopover, 200);
  };

  const handleTouchStart = () => {
    isTouchRef.current = true;
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (isOpen) {
      closePopover();
    } else {
      openPopover();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closePopover();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        closePopover();
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on window resize or scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleRecalc = () => {
      if (triggerRef.current) {
        setTriggerRect(triggerRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener('scroll', handleRecalc, true);
    window.addEventListener('resize', handleRecalc);
    return () => {
      window.removeEventListener('scroll', handleRecalc, true);
      window.removeEventListener('resize', handleRecalc);
    };
  }, [isOpen]);

  if (!entry) return null;

  // Icon visibility rule: in Expert Mode, hide unless alwaysShowIcons is true or currently active
  const iconVisibilityClass = expertMode && !alwaysShowIcons && !isOpen
    ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity'
    : 'opacity-80 hover:opacity-100';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        onKeyDown={handleKeyDown}
        aria-label={`What is ${entry.title}?`}
        aria-describedby={isOpen ? popoverId : undefined}
        aria-expanded={isOpen}
        className={`w-6 h-6 inline-flex items-center justify-center p-0.5 text-slate-400 hover:text-cyan-300 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 cursor-pointer align-middle transition-colors ${iconVisibilityClass} ${className}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && triggerRect && (
        <HelpPopover
          entry={entry}
          value={value}
          triggerRect={triggerRect}
          onClose={closePopover}
          popoverId={popoverId}
          isTouch={isTouchRef.current}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
        />
      )}
    </>
  );
}

/**
 * <Term id="p95" value={...}>p95 latency</Term>
 * Wraps label text with dotted underline and appends the <HelpTip> icon button
 */
export function Term({ id, term, value, children, className = '' }) {
  const termKey = id || term;
  return (
    <span className={`group inline-flex items-center gap-1 ${className}`}>
      <span className="border-b border-dotted border-slate-500/80 group-hover:border-cyan-400 cursor-help transition-colors">
        {children}
      </span>
      <HelpTip id={termKey} value={value} />
    </span>
  );
}

// Backward compatibility alias for InfoTooltip
export default function InfoTooltip({ term, id, value, className = '' }) {
  return <HelpTip id={id || term} value={value} className={className} />;
}
