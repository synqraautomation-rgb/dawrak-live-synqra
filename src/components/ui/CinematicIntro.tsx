import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SynqraLogo } from './SynqraLogo';
import { soundEngine } from '../../lib/audio';
import { Sparkles, Activity, Cpu, Radio, Zap, Volume2 } from 'lucide-react';

interface CinematicIntroProps {
  onComplete: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [phaseText, setPhaseText] = useState('تهيئة النواة الكمومية للمنظومة الطبية...');
  const [isAudioStarted, setIsAudioStarted] = useState(false);

  useEffect(() => {
    // Attempt audio chime
    try {
      soundEngine.playCinematicIntroSound();
      setIsAudioStarted(true);
    } catch {
      // Audio context might be waiting for user interaction
    }

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onComplete();
          }, 450);
          return 100;
        }

        const next = prev + 2.5;
        if (next > 75) {
          setPhaseText('مزامنة شاشات الانتظار والأدوار الصوتية الفورية...');
        } else if (next > 40) {
          setPhaseText('تجهيز البث الصوتي العربي الفصيح فائق النقاء...');
        } else if (next > 15) {
          setPhaseText('ربط خوادم الأمان والحماية السحابية المجهولة الهوية...');
        }
        return next;
      });
    }, 45);

    return () => clearInterval(timer);
  }, [onComplete]);

  const handleSkip = () => {
    soundEngine.playTransitionWhoosh();
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(16px)' }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 bg-[#040711] text-white flex flex-col items-center justify-between p-6 sm:p-12 select-none overflow-hidden"
    >
      {/* Sci-Fi Ambient Light Flares */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-500/15 via-teal-500/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-600/10 blur-[100px] rounded-full" />
        
        {/* Futuristic Laser Grid Floor */}
        <div 
          className="absolute inset-0 opacity-[0.07]" 
          style={{
            backgroundImage: `linear-gradient(to right, #06b6d4 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            transform: 'perspective(500px) rotateX(60deg) translateY(100px)'
          }}
        />
      </div>

      {/* Top Header: System Status & Instant Skip Button */}
      <div className="w-full max-w-5xl flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold tracking-widest shadow-sm">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-300" />
            <span>SYNQRA CORE V2.6 // BOOTING</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500">
            LATENCY: 0.04ms • SECURE AES-256
          </span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/20"
        >
          تخطي الدخول [Skip]
        </button>
      </div>

      {/* Center Cinematic Stage: Holographic Orb & 3D Logo */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
        {/* Rotating Concentric Neon Rings */}
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-dashed border-cyan-500/30"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 rounded-full border border-teal-400/20"
          />
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-8 rounded-full bg-gradient-to-tr from-cyan-500/20 via-teal-400/10 to-transparent blur-md"
          />

          {/* Center Brand Hologram */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative z-10 p-5 rounded-3xl bg-slate-950/80 border border-cyan-400/50 shadow-[0_0_50px_rgba(6,182,212,0.35)]"
          >
            <SynqraLogo size="lg" showTagline={false} />
          </motion.div>
        </div>

        {/* Cinematic Title & Arabesque Future Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2 mb-6"
        >
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-200 to-emerald-400">
              دورك لايف
            </span>{' '}
            <span className="text-slate-400 font-light text-2xl sm:text-4xl">| DAWRAK LIVE</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-slate-400 uppercase">
            منظومة العيادات الذكية والبث الصوتي اللحظي • ابتكار من سينقرا
          </p>
        </motion.div>

        {/* Phase Telemetry Subtitle */}
        <motion.div
          key={phaseText}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-sans font-medium text-cyan-300 mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>{phaseText}</span>
        </motion.div>

        {/* High-Tech Laser Progress Bar */}
        <div className="w-64 sm:w-80 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              SYSTEM READINESS
            </span>
            <span className="text-cyan-400">{Math.round(progress)}%</span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-800 p-0.5 overflow-hidden shadow-inner">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="w-full max-w-5xl flex items-center justify-between relative z-10 text-[11px] text-slate-500 font-mono">
        <span>© 2026 SYNQRA TECHNOLOGIES INC.</span>
        <span>NEXT-GEN CLINIC REALTIME OPERATING SYSTEM</span>
      </div>
    </motion.div>
  );
};
