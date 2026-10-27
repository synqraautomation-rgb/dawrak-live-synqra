import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, MapPin, Sparkles, X, Phone, BellRing, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { soundEngine } from '../../lib/audio';

export interface FlyingAlertData {
  id: string;
  patientName: string;
  queueNumber: number;
  patientPhone: string;
  type: 'on_the_way' | 'arrived_reception' | 'urgent_priority' | 'called';
  estimatedArrivalMinutes?: number;
  timestamp?: string;
  message?: string;
}

interface FlyingPatientAlertProps {
  alert: FlyingAlertData | null;
  onDismiss: () => void;
  onViewPatient?: (patientId: string) => void;
  durationMs?: number;
}

export const FlyingPatientAlert: React.FC<FlyingPatientAlertProps> = ({
  alert,
  onDismiss,
  onViewPatient,
  durationMs = 7000
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!alert) return;

    // Reset progress
    setProgress(100);

    const intervalTime = 50;
    const decrement = (intervalTime / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return Math.max(0, prev - decrement);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [alert, durationMs, onDismiss]);

  if (!alert) return null;

  const isCar = alert.type === 'on_the_way';
  const isReception = alert.type === 'arrived_reception';

  const accentColor = isCar
    ? 'border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)]'
    : isReception
    ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)]'
    : 'border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.35)]';

  const glowBg = isCar
    ? 'bg-amber-500/20 text-amber-300'
    : isReception
    ? 'bg-emerald-500/20 text-emerald-300'
    : 'bg-cyan-500/20 text-cyan-300';

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={alert.id + alert.type}
          initial={{ opacity: 0, y: -45, scale: 0.9, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -30, scale: 0.92, filter: 'blur(12px)', transition: { duration: 0.35 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className={`pointer-events-auto rounded-3xl bg-slate-950/95 backdrop-blur-2xl border-2 p-4 sm:p-5 text-white ${accentColor} relative overflow-hidden`}
        >
          {/* Cyber scanline light reflection */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

          {/* Top row: Alert Badge + Timestamp + Close */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isCar ? 'bg-amber-400' : isReception ? 'bg-emerald-400' : 'bg-cyan-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  isCar ? 'bg-amber-500' : isReception ? 'bg-emerald-500' : 'bg-cyan-500'
                }`} />
              </span>

              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                isCar 
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                  : isReception 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              }`}>
                {isCar ? '🚗 المريض في الطريق الآن' : isReception ? '📍 حاضر بالاستقبال' : 'تحديث حالة المريض'}
              </span>

              {alert.timestamp && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {alert.timestamp}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClickSound();
                onDismiss();
              }}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex items-center gap-3.5">
            {/* Animated Icon Avatar */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 ${glowBg}`}>
              {isCar ? (
                <Car className="w-6 h-6 animate-pulse" />
              ) : isReception ? (
                <MapPin className="w-6 h-6 animate-bounce" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
            </div>

            {/* Info Lockup */}
            <div className="flex-1 min-w-0 text-start">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white truncate">
                  {alert.patientName}
                </h3>
                <span className="px-2 py-0.5 rounded-lg bg-cyan-600/30 text-cyan-300 font-mono font-black text-xs border border-cyan-500/30">
                  تذكرة #{alert.queueNumber}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-0.5">
                {isCar ? (
                  <span>
                    وصول تقديري متوقع خلال <strong className="text-amber-400 font-mono font-bold text-sm">{alert.estimatedArrivalMinutes || 10} دقائق</strong>
                  </span>
                ) : (
                  <span>المريض أكد وصوله للعيادة وهو جاهز للدخول بالدور</span>
                )}
              </p>

              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-cyan-400" />
                  <span>{alert.patientPhone}</span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            {onViewPatient && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClickSound();
                  onViewPatient(alert.id);
                  onDismiss();
                }}
                className="shrink-0 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/30 flex items-center gap-1 cursor-pointer"
              >
                <span>تحديد الدور</span>
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0" />
              </button>
            )}
          </div>

          {/* Auto-Dismiss Laser Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80 overflow-hidden">
            <motion.div
              className={`h-full ${
                isCar ? 'bg-amber-400' : isReception ? 'bg-emerald-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
