import React from 'react';
import { motion } from 'motion/react';
import { useI18n } from '../../lib/i18n';

interface SynqraLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const SynqraLogo: React.FC<SynqraLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = ''
}) => {
  const { language } = useI18n();

  const iconSizes = {
    sm: 32,
    md: 42,
    lg: 56
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const dimension = iconSizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-flex items-center gap-3 select-none ${className}`}
    >
      {/* Abstract geometric icon mark: Live Turn Ring + Traveling Glow Node */}
      <div 
        className="relative flex items-center justify-center shrink-0" 
        style={{ width: dimension, height: dimension }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(14,165,233,0.45)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer Automation Orbit Ring */}
          <circle
            cx="50"
            cy="50"
            r="38"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="5"
          />

          {/* Glowing Track Segment */}
          <circle
            cx="50"
            cy="50"
            r="38"
            stroke="url(#logoGrad)"
            strokeWidth="5"
            strokeDasharray="140 80"
            strokeLinecap="round"
          />

          {/* Inner Infinite Turn Loop */}
          <path
            d="M38 50 C38 38, 50 36, 60 44 S70 62, 60 64 C50 66, 44 58, 44 50"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Center Core Node */}
          <circle cx="50" cy="50" r="7" fill="url(#logoGrad)" />
          <circle cx="50" cy="50" r="3" fill="#ffffff" />
        </svg>

        {/* Orbiting Live Traveling Node */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        </motion.div>
      </div>

      {/* Confident Wordmark Lockup */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`font-black tracking-wider text-slate-900 dark:text-white uppercase ${textSizes[size]}`}>
            SYNQRA
          </span>
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            PRO
          </span>
        </div>

        {showTagline && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 -mt-0.5">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">
              {language === 'ar' ? 'دورك لايف' : 'Dawrak Live'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] opacity-80">
              {language === 'ar' ? 'نظام الطوابير الذكي' : 'Smart Queue'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
