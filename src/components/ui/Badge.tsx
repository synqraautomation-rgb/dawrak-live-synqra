import React from 'react';
import { ShieldCheck, Sparkles, Radio } from 'lucide-react';

interface BadgeProps {
  variant?: 'live' | 'verified' | 'active' | 'paused' | 'priority' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold select-none';

  if (variant === 'live') {
    return (
      <span className={`${baseClasses} bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
        </span>
        {children}
      </span>
    );
  }

  if (variant === 'verified') {
    return (
      <span className={`${baseClasses} relative overflow-hidden bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 holographic-shimmer ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="relative z-10">{children}</span>
      </span>
    );
  }

  if (variant === 'priority') {
    return (
      <span className={`${baseClasses} bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold ${className}`}>
        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        {children}
      </span>
    );
  }

  if (variant === 'paused') {
    return (
      <span className={`${baseClasses} bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 ${className}`}>
        {children}
      </span>
    );
  }

  if (variant === 'active') {
    return (
      <span className={`${baseClasses} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <span className={`${baseClasses} bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${className}`}>
      {children}
    </span>
  );
};
