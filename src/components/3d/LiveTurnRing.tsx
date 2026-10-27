import React from 'react';
import { motion } from 'motion/react';
import { useI18n } from '../../lib/i18n';
import { AnimatedNumber } from '../ui/AnimatedNumber';

interface LiveTurnRingProps {
  peopleAhead: number;
  yourNumber: number;
  currentServing: number;
  isYourTurn: boolean;
  useEasternArabic?: boolean;
}

export const LiveTurnRing: React.FC<LiveTurnRingProps> = ({
  peopleAhead,
  yourNumber,
  currentServing,
  isYourTurn,
  useEasternArabic = false
}) => {
  const { t } = useI18n();

  // Progress percentage (100% when your turn, decays as people ahead increase)
  const maxAheadBaseline = Math.max(10, peopleAhead + 1);
  const progressRatio = isYourTurn 
    ? 1 
    : Math.max(0.08, Math.min(0.95, (maxAheadBaseline - peopleAhead) / maxAheadBaseline));

  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto flex items-center justify-center select-none">
      {/* Outer ambient glow pulses */}
      <motion.div
        animate={isYourTurn ? { scale: [1, 1.15, 1], opacity: [0.4, 0.9, 0.4] } : { scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute inset-4 rounded-full blur-2xl ${
          isYourTurn ? 'bg-emerald-500/30' : 'bg-cyan-500/20'
        }`}
      />

      {/* Floating particles representing people ahead */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: Math.min(8, Math.max(3, peopleAhead)) }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-10, 10, -10],
              x: [-6, 6, -6],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 3 + i * 0.7,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.4
            }}
            style={{
              top: `${15 + (i * 22) % 70}%`,
              left: `${12 + (i * 29) % 75}%`
            }}
            className="absolute w-2 h-2 rounded-full bg-cyan-400/80 shadow-[0_0_8px_#38bdf8]"
          />
        ))}
      </div>

      {/* SVG Progress Ring */}
      <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 260 260">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isYourTurn ? '#34d399' : '#06b6d4'} />
            <stop offset="50%" stopColor={isYourTurn ? '#10b981' : '#0284c7'} />
            <stop offset="100%" stopColor={isYourTurn ? '#059669' : '#3b82f6'} />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx="130"
          cy="130"
          r={radius}
          stroke="currentColor"
          strokeWidth="14"
          className="text-slate-200/80 dark:text-slate-800/80"
          fill="none"
        />

        {/* Animated Progress Arc */}
        <motion.circle
          cx="130"
          cy="130"
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      {/* Center Content: Giant Turn Number or People Ahead */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
        {isYourTurn ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
            className="flex flex-col items-center"
          >
            <span className="text-xs uppercase tracking-widest font-black text-emerald-500 mb-1">
              {t('yourTurnNow')}
            </span>
            <div className="text-6xl sm:text-7xl font-black text-emerald-500">
              <AnimatedNumber value={yourNumber} useEasternArabic={useEasternArabic} />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
              {t('turnCelebration')}
            </span>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-0.5">
              {t('peopleAhead')}
            </span>
            <div className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white my-0.5">
              <AnimatedNumber value={peopleAhead} useEasternArabic={useEasternArabic} />
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              {t('nowServing')} <AnimatedNumber value={currentServing} useEasternArabic={useEasternArabic} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
