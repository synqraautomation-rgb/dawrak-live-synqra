import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../lib/theme';
import { useI18n } from '../../lib/i18n';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      aria-label={t('toggleTheme')}
      title={t('toggleTheme')}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden transition-colors border shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
        isDark 
          ? 'bg-slate-900 border-slate-700/80 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.15)]' 
          : 'bg-white border-slate-200 text-amber-500 shadow-slate-200'
      } ${className}`}
    >
      {/* Background Animated Starlight when Dark */}
      <AnimatePresence>
        {isDark && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="absolute top-1.5 left-2 w-0.5 h-0.5 rounded-full bg-white animate-ping opacity-75" />
            <div className="absolute bottom-2 right-2.5 w-0.5 h-0.5 rounded-full bg-cyan-200 opacity-90" />
            <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-indigo-200 opacity-60" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Morphing Sun / Moon SVG */}
      <motion.div
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative w-5 h-5 flex items-center justify-center"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 drop-shadow-sm"
        >
          {isDark ? (
            // Moon Path
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35 }}
              d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
              fill="currentColor"
              className="text-cyan-300"
            />
          ) : (
            // Sun with Rays
            <>
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </>
          )}
        </svg>
      </motion.div>
    </motion.button>
  );
};
