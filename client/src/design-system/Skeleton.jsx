import React from 'react';

/**
 * High-performance animated pulse skeleton fallback
 * Eliminates Cumulative Layout Shift (CLS) during tab switches and data loading.
 */
export function Skeleton({ className = '', variant = 'rect', ...props }) {
  const baseClasses = 'animate-pulse bg-slate-800/60 rounded-lg';
  const variantClasses = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'h-4 rounded' : 'rounded-xl';

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    />
  );
}

export function TabSkeletonFallback({ title = 'Loading section...' }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner Skeleton */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
        <div className="space-y-2 w-full max-w-md">
          <Skeleton className="h-5 w-48 bg-slate-800" />
          <Skeleton className="h-3 w-80 bg-slate-800/50" />
        </div>
        <Skeleton className="h-8 w-24 bg-slate-800" />
      </div>

      {/* KPI Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24 bg-slate-800" />
              <Skeleton className="h-4 w-4 rounded-full bg-slate-800" />
            </div>
            <Skeleton className="h-8 w-32 bg-slate-800/80" />
            <Skeleton className="h-3 w-full bg-slate-800/40" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
        <Skeleton className="h-6 w-56 bg-slate-800" />
        <Skeleton className="h-32 w-full bg-slate-800/30 rounded-xl" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-12 w-full bg-slate-800/20 rounded-xl" />
          <Skeleton className="h-12 w-full bg-slate-800/20 rounded-xl" />
          <Skeleton className="h-12 w-full bg-slate-800/20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
