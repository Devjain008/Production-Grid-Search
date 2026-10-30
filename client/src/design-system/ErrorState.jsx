import React, { useState } from 'react';
import { AlertTriangle, ServerCrash, Globe, Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from './Button';

/**
 * Production ErrorState Component:
 * Distinguishes user errors, sandbox crashes, and external LLM outages.
 * Always offers recovery actions and 'Copy details' for support.
 */
export function ErrorState({
  type = 'system', // 'user' | 'system' | 'external'
  title = 'An unexpected error occurred',
  message = 'The requested operation could not be completed safely.',
  details,
  onRetry,
  className = ''
}) {
  const [copied, setCopied] = useState(false);

  const icons = {
    user: AlertTriangle,
    system: ServerCrash,
    external: Globe
  };

  const IconComponent = icons[type] || ServerCrash;

  const handleCopy = () => {
    const errorPayload = {
      type,
      title,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(errorPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`p-6 rounded-xl border border-rose-900/40 bg-rose-950/20 max-w-xl mx-auto my-6 ${className}`} role="alert">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-rose-900/40 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0">
          <IconComponent size={20} aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-rose-200 mb-1">{title}</h3>
          <p className="text-sm text-rose-300/80 mb-4 leading-relaxed">{message}</p>

          {details && (
            <div className="mb-4">
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-36">
                {typeof details === 'object' ? JSON.stringify(details, null, 2) : details}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {onRetry && (
              <Button variant="destructive" size="sm" onClick={onRetry} leftIcon={RefreshCw}>
                Retry Operation
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              leftIcon={copied ? Check : Copy}
            >
              {copied ? 'Copied Details' : 'Copy Error Details'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorState;
