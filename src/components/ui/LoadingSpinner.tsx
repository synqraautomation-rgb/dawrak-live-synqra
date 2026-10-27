import React from 'react';
import { motion } from 'motion/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  fullScreen = false,
  className = ''
}) => {
  const sizeMap = {
    sm: { container: 'w-6 h-6', outerRing: 'w-6 h-6', innerRing: 'w-4 h-4', dot: 'w-1.5 h-1.5', text: 'text-xs' },
    md: { container: 'w-10 h-10', outerRing: 'w-10 h-10', innerRing: 'w-7 h-7', dot: 'w-2 h-2', text: 'text-sm' },
    lg: { container: 'w-16 h-16', outerRing: 'w-16 h-16', innerRing: 'w-11 h-11', dot: 'w-3 h-3', text: 'text-base' },
    xl: { container: 'w-24 h-24', outerRing: 'w-24 h-24', innerRing: 'w-16 h-16', dot: 'w-4 h-4', text: 'text-lg font-bold' }
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3.5 select-none ${className}`}>
      <div className={`relative ${currentSize.container} flex items-center justify-center`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md pointer-events-none" />

        {/* Outer Rotating Cyber Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          className={`absolute ${currentSize.outerRing} rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-500/40`}
        />

        {/* Inner Counter-Rotating Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className={`absolute ${currentSize.innerRing} rounded-full border-2 border-transparent border-b-teal-300 border-l-indigo-500/50`}
        />

        {/* Center Glowing Pulse Dot */}
        <motion.div
          animate={{ scale: [0.85, 1.2, 0.85], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className={`${currentSize.dot} rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.9)]`}
        />
      </div>

      {text && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${currentSize.text} font-semibold text-slate-600 dark:text-slate-300 tracking-wide text-center`}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md transition-opacity">
        {content}
      </div>
    );
  }

  return content;
};
