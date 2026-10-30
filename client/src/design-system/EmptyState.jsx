import React from 'react';
import { Button } from './Button';
import { FolderSearch } from 'lucide-react';

/**
 * EmptyState Component: Never leaves the user at a dead end.
 * Always suggests a concrete next step or sample data load.
 */
export function EmptyState({
  icon: Icon = FolderSearch,
  title = 'No records found',
  description = 'There is currently no data recorded for this view.',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 max-w-lg mx-auto my-6 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 border border-slate-700">
        <Icon size={24} aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && onAction && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" size="sm" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
