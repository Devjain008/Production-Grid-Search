import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { Button } from './Button';

/**
 * KeyboardHelpModal: Quick '?' shortcut reference dialog for power users.
 */
export function KeyboardHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K / ⌘ + K', desc: 'Open Command Palette & Global Search' },
    { key: '?', desc: 'Open this Keyboard Shortcuts cheat-sheet' },
    { key: 'Esc', desc: 'Close any active modal, popover, or experiment drawer' },
    { key: 'j / k', desc: 'Navigate to Next / Previous experiment in review' },
    { key: 'Tab / Shift + Tab', desc: 'Navigate accessible interactive controls' },
    { key: 'Space / Enter', desc: 'Toggle help popover or trigger action' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 font-sans"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
            <Keyboard size={18} className="text-indigo-400" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
              <span className="text-slate-300">{item.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-[11px] font-semibold">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

export default KeyboardHelpModal;
