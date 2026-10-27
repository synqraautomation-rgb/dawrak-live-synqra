import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { soundEngine } from '../lib/audio';
import { 
  PublicClinic, 
  PublicQueueEntry, 
  subscribePublicClinic, 
  subscribePublicQueue 
} from '../lib/firebase';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { SynqraLogo } from '../components/ui/SynqraLogo';
import { 
  Building2, 
  Volume2, 
  VolumeX, 
  Maximize, 
  WifiOff, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface WaitingRoomDisplayPageProps {
  clinicId: string;
  onNavigate: (path: string) => void;
}

type ConnectionStatus = 'connected' | 'reconnecting' | 'offline' | 'permission_denied' | 'not_found';

export const WaitingRoomDisplayPage: React.FC<WaitingRoomDisplayPageProps> = ({
  clinicId,
  onNavigate
}) => {
  const { t, formatNumber } = useI18n();
  const [clinic, setClinic] = useState<PublicClinic | null>(null);
  const [queue, setQueue] = useState<PublicQueueEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [volume, setVolume] = useState(soundEngine.getVolume());
  const [showFlashGlow, setShowFlashGlow] = useState(false);
  const [audioPrimed, setAudioPrimed] = useState(false);

  // Track previous serving number to detect actual updates only
  const previousServingRef = useRef<number | null>(null);
  const isInitialMountRef = useRef<boolean>(true);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => {
      if (connectionStatus === 'offline') setConnectionStatus('connected');
    };
    const handleOffline = () => setConnectionStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionStatus]);

  useEffect(() => {
    // Hide default cursor and lock body style for TV display
    document.documentElement.classList.add('dark');

    const handleError = (err: unknown) => {
      const code = (err as { code?: string })?.code;
      if (!navigator.onLine) {
        setConnectionStatus('offline');
      } else if (code === 'permission-denied') {
        setConnectionStatus('permission_denied');
      } else {
        setConnectionStatus('reconnecting');
      }
    };

    const unsubClinic = subscribePublicClinic(
      clinicId,
      (data) => {
        if (!data) {
          setConnectionStatus('not_found');
          setClinic(null);
          return;
        }

        setConnectionStatus('connected');
        const currentNum = data.currentServingNumber || 0;

        // Trigger announcement ONLY when number changes and NOT on initial mount
        if (!isInitialMountRef.current && previousServingRef.current !== null && currentNum !== previousServingRef.current && currentNum > 0) {
          // Visual flash glow
          setShowFlashGlow(true);
          setTimeout(() => setShowFlashGlow(false), 2000);

          // HARD CONSTRAINT: Call announceNumber with ONLY the numeric currentNum!
          soundEngine.announceNumber(currentNum);
        }

        previousServingRef.current = currentNum;
        isInitialMountRef.current = false;
        setClinic(data);
      },
      handleError
    );

    const unsubQueue = subscribePublicQueue(
      clinicId,
      (entries) => {
        setQueue(entries);
        if (connectionStatus !== 'offline' && connectionStatus !== 'permission_denied') {
          setConnectionStatus('connected');
        }
      },
      handleError
    );

    return () => {
      unsubClinic();
      unsubQueue();
    };
  }, [clinicId]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundEngine.setVolume(newVol);
  };

  // Next 2-3 queued numbers (anonymized numbers only)
  const currentNum = clinic?.currentServingNumber || 0;
  const upcomingQueueNumbers = queue
    .filter((q) => q.status === 'waiting' && q.queueNumber > currentNum)
    .sort((a, b) => a.queueNumber - b.queueNumber)
    .slice(0, 3)
    .map((q) => q.queueNumber);

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden">
      {/* Visual Flash Glow Pulse upon number update */}
      <AnimatePresence>
        {showFlashGlow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-cyan-400 pointer-events-none z-20"
          />
        )}
      </AnimatePresence>

      {/* Top Header: Clinic Brand + TV Mode Controls */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center p-3 border border-slate-700 bg-slate-900/90 shadow-lg"
          >
            {clinic?.logoUrl ? (
              <img src={clinic.logoUrl} alt={clinic.clinicName} className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-10 h-10 text-cyan-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {clinic?.clinicName || 'العيادة الطبية'}
            </h1>
            <p className="text-sm sm:text-lg text-cyan-400 font-bold mt-0.5">
              {clinic?.specialty}
            </p>
          </div>
        </div>

        {/* Ambient Display Controls (Volume, Fullscreen, Back) */}
        <div className="flex items-center gap-3">
          {/* Audio Activator / Prime status */}
          {!audioPrimed && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playChime();
                setAudioPrimed(true);
              }}
              className="px-3 py-2 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center gap-2 animate-pulse cursor-pointer shadow-lg shadow-cyan-500/20"
              title="اضغط مرة واحدة للسماح للمتصفح ببث الصوت التلقائي"
            >
              <Volume2 className="w-4 h-4 text-cyan-300" />
              <span>تفعيل الصوت التلقائي للشاشة</span>
            </button>
          )}

          {/* Audio Mute & Volume */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl px-3 py-2">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="w-6 h-6 text-rose-500" /> : <Volume2 className="w-6 h-6 text-cyan-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 sm:w-24 accent-cyan-400 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={toggleFullScreen}
            className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="ملء الشاشة"
          >
            <Maximize className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate(`/clinic/${clinicId}/dashboard`)}
            className="px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
          >
            لوحة الإدارة
          </button>
        </div>
      </header>

      {/* Connection & Authorization Alerts */}
      {connectionStatus === 'reconnecting' && (
        <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-center text-sm font-bold flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>جاري إعادة الاتصال بالسحابة بالزمن الفعلي...</span>
        </div>
      )}

      {connectionStatus === 'offline' && (
        <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-center text-sm font-bold flex items-center justify-center gap-2">
          <WifiOff className="w-5 h-5 animate-pulse text-amber-400" />
          <span>انقطع اتصال الإنترنت. الشاشة تعرض آخر أرقام مسجلة محلياً حتى عودة الاتصال.</span>
        </div>
      )}

      {connectionStatus === 'permission_denied' && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-center text-sm font-bold flex items-center justify-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>خطأ في أذونات السحابة: يرجى التأكد من نشر قواعد أمان Firestore للقراءة العامة للبروجكشن.</span>
        </div>
      )}

      {connectionStatus === 'not_found' && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-center text-sm font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>العيادة غير موجودة أو لم يتم نشر بياناتها العامة بعد.</span>
        </div>
      )}

      {/* CENTER: GIANT CURRENT-SERVING NUMBER */}
      <main className="flex-1 flex flex-col items-center justify-center text-center my-6">
        <motion.div
          key={currentNum}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          className="relative"
        >
          {/* Radial Neon Backlight */}
          <div className="absolute inset-0 bg-cyan-500/25 blur-[120px] rounded-full pointer-events-none" />

          <span className="text-xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-widest text-cyan-400 drop-shadow-md mb-2 block">
            {t('displayNowServing')}
          </span>

          <div className="text-[130px] sm:text-[220px] lg:text-[280px] font-black leading-none tracking-tight text-white drop-shadow-[0_0_80px_rgba(6,182,212,0.6)] font-mono">
            <AnimatedNumber value={currentNum} />
          </div>

          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-sm sm:text-base mt-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>تفضل بالدخول إلى غرفة الكشف</span>
          </motion.div>
        </motion.div>
      </main>

      {/* FOOTER: UPCOMING NUMBERS ROW + SYNQRA WATERMARK */}
      <footer className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Next numbers queued (strictly numbers only, zero patient names) */}
        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
            {t('upcomingNumbers')}:
          </span>
          <div className="flex items-center gap-3">
            {upcomingQueueNumbers.length === 0 ? (
              <span className="text-sm font-semibold text-slate-500">لا توجد أرقام أخرى تالية</span>
            ) : (
              upcomingQueueNumbers.map((num, i) => (
                <div
                  key={i}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-xl sm:text-2xl font-mono font-black text-slate-200 shadow-md"
                >
                  {num}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Permanent SYNQRA Watermark Badge */}
        <div className="flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
          <SynqraLogo size="sm" showTagline={false} />
          <span className="text-xs font-bold text-slate-400 tracking-wider">
            SYNQRA LIVE DISPLAY OS
          </span>
        </div>
      </footer>
    </div>
  );
};
