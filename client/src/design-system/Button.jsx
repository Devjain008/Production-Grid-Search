import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Production Accessible Button Component
 * Supports variants, loading states, and disabled-with-reason tooltips.
 */
export const Button = React.forwardRef(({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'
  size = 'md',        // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled = false,
  disabledReason = '',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = '',
  type = 'button',
  onClick,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variantClasses = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950 focus:ring-indigo-500',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:ring-slate-500',
    destructive: 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm focus:ring-rose-500',
    outline: 'border border-slate-700 hover:bg-slate-800/80 text-slate-300 focus:ring-indigo-500',
    ghost: 'hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 focus:ring-slate-500'
  };

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 min-h-[30px]',
    md: 'text-sm px-4 py-2 gap-2 min-h-[38px]',
    lg: 'text-base px-5 py-2.5 gap-2.5 min-h-[46px]'
  };

  const isDisabled = disabled || isLoading;

  const buttonElement = (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      title={disabled && disabledReason ? disabledReason : undefined}
      aria-disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" aria-hidden="true" />
      ) : LeftIcon ? (
        <LeftIcon size={size === 'sm' ? 14 : 16} className="shrink-0" aria-hidden="true" />
      ) : null}
      
      <span>{children}</span>

      {!isLoading && RightIcon && (
        <RightIcon size={size === 'sm' ? 14 : 16} className="shrink-0" aria-hidden="true" />
      )}
    </button>
  );

  return buttonElement;
});

Button.displayName = 'Button';

export const IconButton = React.forwardRef(({
  icon: Icon,
  label,
  variant = 'ghost',
  size = 'md',
  isLoading = false,
  disabled = false,
  disabledReason = '',
  className = '',
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'w-7 h-7 p-1',
    md: 'w-9 h-9 p-2',
    lg: 'w-11 h-11 p-2.5'
  };

  return (
    <Button
      ref={ref}
      variant={variant}
      disabled={disabled}
      disabledReason={disabledReason}
      isLoading={isLoading}
      className={`${sizeClasses[size]} rounded-lg p-0 ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={size === 'sm' ? 14 : 18} aria-hidden="true" />
    </Button>
  );
});

IconButton.displayName = 'IconButton';
