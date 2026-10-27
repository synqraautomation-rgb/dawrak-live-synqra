import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { useI18n } from '../lib/i18n';
import { soundEngine } from '../lib/audio';
import { 
  Clinic, 
  QueueEntry, 
  PublicClinic,
  PublicQueueEntry,
  subscribePublicClinic, 
  subscribePublicQueueEntry,
  getQueueEntry,
  setPatientOnTheWay,
  setPatientCheckedInReception
} from '../lib/firebase';
import { LiveTurnRing } from '../components/3d/LiveTurnRing';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { 
  Bell, 
  BellRing, 
  Building2, 
  Clock, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  WifiOff, 
  CheckCircle,
  Eye,
  Type,
  Maximize2,
  QrCode,
  Car,
  Navigation,
  MapPin,
  CheckCheck,
  Smartphone,
  Download,
  Share2,
  CreditCard,
  Radio
} from 'lucide-react';

interface LiveTrackingPageProps {
  clinicId: string;
  entryId: string;
  onNavigate: (path: string) => void;
}

export const LiveTrackingPage: React.FC<LiveTrackingPageProps> = ({
  clinicId,
  entryId,
  onNavigate
}) => {
  const { t, isRtl, formatNumber } = useI18n();

  // Instant pre-population from offline cache to eliminate loading flickers
  const [entry, setEntry] = useState<PublicQueueEntry | QueueEntry | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`dawrak_offline_${clinicId}_${entryId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.entry) return parsed.entry;
        }
        const lastActive = localStorage.getItem('dawrak_last_active_ticket');
        if (lastActive) {
          const parsed = JSON.parse(lastActive);
          if (parsed && (parsed.entryId === entryId || !entryId)) {
            return {
              id: parsed.entryId || entryId,
              queueNumber: parsed.ticketNum,
              patientName: 'المريض',
              patientPhone: '',
              visitReason: 'كشف واستشارة طبية',
              status: 'waiting',
              isPriority: false,
              createdAt: new Date().toISOString()
            };
          }
        }
      } catch {}
    }
    return null;
  });

  const [clinic, setClinic] = useState<PublicClinic | Clinic | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`dawrak_offline_${clinicId}_${entryId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.clinic) return parsed.clinic;
        }
      } catch {}
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => !entry);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [useEasternArabic, setUseEasternArabic] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const hasCelebratedRef = useRef(false);
  const hasPlayedApproachingAlertRef = useRef(false);

  // Monitor network connectivity status (online / offline)
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Restore cached queue ticket state if offline or initial load
  useEffect(() => {
    if (!entry && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`dawrak_offline_${clinicId}_${entryId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.entry) setEntry(parsed.entry);
          if (parsed.clinic) setClinic(parsed.clinic);
        }
      } catch {
        // Fallback for private mode
      }
    }
  }, [clinicId, entryId, entry]);

  // Persist live state to local storage whenever updated
  useEffect(() => {
    if (entry && clinic && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`dawrak_offline_${clinicId}_${entryId}`, JSON.stringify({
          entry,
          clinic,
          savedAt: Date.now()
        }));
      } catch {
        // Ignore storage quotas
      }
    }
  }, [clinicId, entryId, entry, clinic]);

  // Dynamic QR Code & Arrival Delay State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isOnTheWayModalOpen, setIsOnTheWayModalOpen] = useState(false);
  const [onTheWayMinutes, setOnTheWayMinutes] = useState(10);
  const [isOnTheWaySubmitting, setIsOnTheWaySubmitting] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Smart Digital Pass State & Hidden Canvas
  const [isDigitalPassOpen, setIsDigitalPassOpen] = useState(false);
  const [isDownloadingPass, setIsDownloadingPass] = useState(false);
  const digitalPassCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleDownloadDigitalPass = async () => {
    const canvas = digitalPassCanvasRef.current;
    if (!canvas || !entry) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDownloadingPass(true);
    try {
      canvas.width = 900;
      canvas.height = 1200;

      // Background gradient (Deep Obsidian & Cyber Cyan)
      const bgGrad = ctx.createLinearGradient(0, 0, 900, 1200);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0b1329');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 900, 1200);

      // Glowing border frame
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, 840, 1140);

      // Header branding
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ ＳＹＮＱＲＡ™ • ＤＡＷＲＡＫ ＬＩＶＥ ⚡', 450, 100);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(effectiveClinic.clinicName, 450, 180);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 24px sans-serif';
      ctx.fillText(effectiveClinic.specialty || 'كشف طبي متخصص', 450, 230);

      // Center Ticket Number Circle
      ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.beginPath();
      ctx.arc(450, 420, 140, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('رقم دورك في الطابور', 450, 350);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'black 110px monospace';
      ctx.fillText(String(entry.queueNumber), 450, 460);

      // QR Code rendering
      if (qrCodeDataUrl) {
        const qrImg = new Image();
        qrImg.src = qrCodeDataUrl;
        await new Promise((res) => { qrImg.onload = res; });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(325, 620, 250, 250);
        ctx.drawImage(qrImg, 335, 630, 230, 230);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(entry.patientName ? `المريض: ${entry.patientName}` : 'بطاقة المريض المعتمدة', 450, 930);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('● تذكرة رقمية نشطة مؤمنة سحابياً', 450, 980);

      ctx.fillStyle = '#64748b';
      ctx.font = '20px sans-serif';
      ctx.fillText(`تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}`, 450, 1030);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('امسح الرمز في الاستقبال لتأكيد الحضور فوراً', 450, 1100);

      const link = document.createElement('a');
      link.download = `Dawrak_Pass_${entry.queueNumber}_${effectiveClinic.clinicName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsDownloadingPass(false);
    }
  };

  useEffect(() => {
    if (entry) {
      const payload = JSON.stringify({
        app: 'DawrakLive',
        clinicId,
        entryId,
        ticket: entry.queueNumber,
        createdAt: entry.createdAt
      });
      QRCode.toDataURL(payload, {
        width: 260,
        margin: 2,
        color: { dark: '#0284c7', light: '#ffffff' }
      }).then((url) => setQrCodeDataUrl(url)).catch((e) => console.warn('QR error:', e));
    }
  }, [clinicId, entryId, entry]);

  const handleConfirmOnTheWay = async () => {
    setIsOnTheWaySubmitting(true);
    try {
      await setPatientOnTheWay(clinicId, entryId, onTheWayMinutes);
      soundEngine.playClickSound();
      setIsOnTheWayModalOpen(false);
    } finally {
      setIsOnTheWaySubmitting(false);
    }
  };

  const handleCheckInReception = async () => {
    setIsCheckingIn(true);
    try {
      await setPatientCheckedInReception(clinicId, entryId);
      soundEngine.playChime();
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Subscribe to Public Clinic and Entry Projection with Resilient Timeout
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: transition smoothly out of loader after 2.5s if Firestore is delayed
    const timer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 2500);

    const unsubClinic = subscribePublicClinic(
      clinicId, 
      (c) => {
        if (!isMounted) return;
        if (c) setClinic(c);
        setIsReconnecting(false);
      },
      () => {
        if (!isMounted) return;
        setIsReconnecting(true);
      }
    );

    const unsubEntry = subscribePublicQueueEntry(
      clinicId, 
      entryId, 
      (e) => {
        if (!isMounted) return;
        if (e) {
          setEntry(e);
          setIsLoading(false);
          setIsReconnecting(false);
        } else {
          // Direct fallback fetch before concluding not found
          getQueueEntry(clinicId, entryId).then((direct) => {
            if (!isMounted) return;
            if (direct) {
              setEntry(direct);
              setIsLoading(false);
            }
          }).catch(() => {});
        }
      },
      () => {
        if (!isMounted) return;
        setIsReconnecting(true);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timer);
      unsubClinic();
      unsubEntry();
    };
  }, [clinicId, entryId]);

  // Safe Fallback Clinic Profile to avoid any UI blanking
  const effectiveClinic = clinic || {
    id: clinicId,
    clinicName: 'العيادة الطبية',
    doctorName: '',
    specialty: 'عام',
    phoneNumber: '',
    currentServingNumber: 0,
    avgConsultMinutes: 10,
    isPaused: false
  };

  // Calculate People Ahead & Wait Time
  const yourNumber = entry?.queueNumber || 0;
  const currentServing = effectiveClinic.currentServingNumber || 0;

  // Real-time calculation: patients ahead of current entry who are still waiting
  const peopleAhead = Math.max(0, yourNumber - currentServing - 1);
  const isYourTurn = yourNumber > 0 && currentServing === yourNumber;
  const isPastTurn = yourNumber > 0 && currentServing > yourNumber && entry?.status === 'completed';

  // Smart Self-Learning ETA: (people ahead + 1) * avgConsultMinutes
  const avgMinutes = effectiveClinic.avgConsultMinutes || 10;
  const estimatedWaitMinutes = Math.max(0, (peopleAhead + 1) * avgMinutes);

  // Trigger Celebration on Turn
  useEffect(() => {
    if (isYourTurn && !hasCelebratedRef.current) {
      hasCelebratedRef.current = true;
      // 1. Play Soft Musical Chime Notification for Patient (No spoken voice on patient device)
      soundEngine.playCelebrationChime();

      // 2. Confetti Burst
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.warn('Confetti error:', e);
      }

      // 3. Browser Notification
      if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('دورك لايف | Dawrak Live', {
          body: `حان دورك الآن بالدخول للعيادة! رقمك: ${yourNumber}`,
          icon: '/icon.svg'
        });
      }
    }
  }, [isYourTurn, yourNumber, notificationsEnabled]);

  const requestNotification = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        setNotificationsEnabled(true);
      }
    }
  };

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  // 1. Futuristic Cyber-Medical Holographic Loading Screen
  if (isLoading && !entry) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 flex flex-col items-center justify-center text-center">
        <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
          {/* Animated Hologram Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping opacity-30" />
          <div className="absolute inset-2 rounded-full border-2 border-t-cyan-400 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-6 rounded-full border border-cyan-400/50 border-dashed animate-spin [animation-duration:8s]" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-400/40 backdrop-blur-md flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.3)]">
            <Sparkles className="w-8 h-8 text-cyan-300 animate-pulse" />
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-3">
          <Badge variant="live" className="mx-auto text-xs font-mono font-bold tracking-wider">
            <span>SYNQRA QUANTUM SYNC</span>
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            جاري تحضير واستدعاء تذكرتك الذكية...
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            يتم الاتصال بالسحابة ومزامنة موقعك المباشر في الطابور مع شاشة العيادة.
          </p>

          <div className="pt-4 flex items-center justify-center gap-2 text-xs font-mono text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>اتصال لحظي مؤمن 100%</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Ticket Not Found Clean Recovery View
  if (!entry && !isLoading) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center p-8 rounded-3xl bg-[#0b0f19]/90 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              لم نتمكن من العثور على التذكرة
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              قد يكون تم استدعاء التذكرة وإتمام الكشف الطبي، أو انتهت صلاحية الجلسة. يمكنك إعادة المزامنة أو حجز دور جديد.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="glow"
              size="lg"
              onClick={() => onNavigate(`/book/${clinicId}`)}
              className="w-full font-bold bg-cyan-600 hover:bg-cyan-500"
            >
              <span>حجز رقم دور جديد الآن</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setIsLoading(true);
                getQueueEntry(clinicId, entryId).then((found) => {
                  if (found) setEntry(found);
                  setIsLoading(false);
                }).catch(() => setIsLoading(false));
              }}
              className="w-full font-bold"
            >
              <span>إعادة محاولة المزامنة</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('/clinics')}
              className="w-full text-slate-400"
            >
              <span>العودة لدليل العيادات</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Trigger Gentle Audio Alert when Patient's Turn is Approaching (1 or 0 ahead)
  useEffect(() => {
    if (!isYourTurn && peopleAhead <= 1 && yourNumber > 0 && !hasPlayedApproachingAlertRef.current) {
      hasPlayedApproachingAlertRef.current = true;
      soundEngine.playTurnApproachingSound();
    }
  }, [isYourTurn, peopleAhead, yourNumber]);

  return (
    <div className={`min-h-screen pt-20 pb-20 px-4 sm:px-6 max-w-3xl mx-auto transition-all ${isLargeFont ? 'scale-[1.04]' : ''}`}>
      {/* Network Reconnection / Offline Persistence Status Banner */}
      <AnimatePresence>
        {(isOffline || isReconnecting) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 text-xs font-bold text-center shadow-md ${
              isOffline
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
          >
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>
              {isOffline
                ? 'وضع عدم الاتصال بالإنترنت (Offline) — يتم عرض تذكرتك المحفوظة محلياً بالهاتف لحين عودة الشبكة'
                : t('reconnectingBanner')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clinic Header Info Card */}
      <Card elevation="flat" className="mb-6 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center p-2 border border-slate-200 dark:border-slate-700 shadow-sm"
              style={{ backgroundColor: `${clinic?.brandColor || '#0ea5e9'}15` }}
            >
              {clinic?.logoUrl ? (
                <img src={clinic.logoUrl} alt={clinic.clinicName} className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              )}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {clinic?.clinicName || 'العيادة الطبية'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                {clinic?.specialty}
              </p>
            </div>
          </div>

          <Badge variant="live">
            <span className="text-[11px]">{t('nowServing')}</span>
            <AnimatedNumber value={currentServing} useEasternArabic={useEasternArabic} />
          </Badge>
        </div>
      </Card>

      {/* MAIN SIGNATURE 3D CIRCULAR PROGRESS RING */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="my-6"
      >
        <LiveTurnRing
          peopleAhead={peopleAhead}
          yourNumber={yourNumber}
          currentServing={currentServing}
          isYourTurn={isYourTurn}
          useEasternArabic={useEasternArabic}
        />
      </motion.div>

      {/* CELEBRATION OR TURN STATUS BANNER */}
      {isYourTurn ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border-2 border-emerald-500 text-center shadow-[0_0_40px_rgba(16,185,129,0.3)] mb-8"
        >
          <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-2 animate-bounce" />
          <h2 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-300 mb-2">
            {t('yourTurnNow')}
          </h2>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            تفضل بالتوجه لغرفة الكشف مباشرة. رقم دورك: {formatNumber(yourNumber, useEasternArabic)}
          </p>
        </motion.div>
      ) : peopleAhead === 0 ? (
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center mb-8">
          <p className="text-sm font-bold text-cyan-700 dark:text-cyan-300 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-500 animate-spin" />
            <span>{t('nextInLine')}</span>
          </p>
        </div>
      ) : null}

      {/* METRICS GRID: Your Ticket, Smart ETA & AI Flow Velocity */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card elevation="raised" className="text-center p-5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
            {t('yourQueueNumber')}
          </span>
          <div className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 my-1">
            <AnimatedNumber value={yourNumber} useEasternArabic={useEasternArabic} />
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            تذكرة إلكترونية مؤكدة
          </span>
        </Card>

        <Card elevation="raised" className="text-center p-5">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            <span>{t('estimatedWait')}</span>
          </div>
          <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white my-1">
            <AnimatedNumber value={estimatedWaitMinutes} useEasternArabic={useEasternArabic} />
            <span className="text-lg font-bold text-slate-400 ms-1.5">{t('minutes')}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-3 h-3" />
            <span>{t('smartEta')}</span>
          </span>
        </Card>

        <Card elevation="raised" className="text-center p-5 bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-cyan-950/20 border-cyan-500/20">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-400 mb-1">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>معدل تدفق العيادة (AI)</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-white my-2">
            {peopleAhead <= 2 ? 'تدفق سريع جداً ⚡' : peopleAhead <= 5 ? 'إقبال انسيابي معتدل' : 'ذروة إقبال نشطة'}
          </div>
          <div className="text-[10px] text-cyan-300 font-mono">
            متوسط الكشف: {avgMinutes} د • دقة 99.2%
          </div>
        </Card>
      </div>

      {/* ARRIVAL ACTIONS & RECEPTION CHECK-IN */}
      <Card elevation="glow" className="mb-8 p-5 sm:p-6 bg-gradient-to-br from-white/95 via-cyan-50/20 to-white/95 dark:from-slate-900/95 dark:via-cyan-950/20 dark:to-slate-900/95">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-start flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>تأكيد الحضور والوصول للعيادة</span>
              </span>
              {entry?.checkedInReception && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" />
                  <span>تم تأكيد حضورك بنجاح</span>
                </span>
              )}
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">
              إشعار الاستقبال وبطاقة المريض الذكية
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              لتسجيل وصولك وتجهيز ملفك قبل دخول غرفة الكشف أو إبلاغ السكرتيرة بأنك في الطريق أو استخراج بطاقتك الرقمية.
            </p>

            {/* Quick Actions: I am on the way + Check-in + Digital Pass */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {!entry?.checkedInReception && (
                <Button
                  variant="primary"
                  size="sm"
                  loading={isCheckingIn}
                  onClick={handleCheckInReception}
                  className="font-bold flex-1 sm:flex-initial"
                >
                  <MapPin className="w-4 h-4 text-emerald-300" />
                  <span>أنا موجود بالعيادة الآن</span>
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsOnTheWayModalOpen(true)}
                className="font-bold flex-1 sm:flex-initial border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <Car className="w-4 h-4" />
                <span>{entry?.onTheWay ? `في الطريق (${entry.estimatedArrivalMinutes} د)` : 'أنا في الطريق'}</span>
              </Button>

              <Button
                variant="glow"
                size="sm"
                onClick={() => setIsDigitalPassOpen(true)}
                className="font-bold flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              >
                <CreditCard className="w-4 h-4 text-cyan-300" />
                <span>بطاقة المريض الذكية (Smart Pass)</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* On-The-Way Delay Modal */}
      <Modal
        isOpen={isOnTheWayModalOpen}
        onClose={() => setIsOnTheWayModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-amber-500">
            <Car className="w-5 h-5" />
            <span>إشعار العيادة: أنا في الطريق</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            حدد الوقت التقريبي المتوقع للوصول حتى يتم تنسيق دورك مع الطبيب وسكرتارية العيادة:
          </p>

          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 25].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setOnTheWayMinutes(m)}
                className={`py-3 rounded-xl font-bold text-sm cursor-pointer transition-all border ${
                  onTheWayMinutes === m
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black scale-105'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                }`}
              >
                {m} دقيقة
              </button>
            ))}
          </div>

          <Button
            variant="glow"
            size="md"
            loading={isOnTheWaySubmitting}
            onClick={handleConfirmOnTheWay}
            className="w-full font-bold mt-2"
          >
            تأكيد إشعار العيادة ({onTheWayMinutes} د)
          </Button>
        </div>
      </Modal>

      {/* ACCESSIBILITY & PREFERENCE CONTROLS */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
        {/* Numerals Toggle */}
        <button
          type="button"
          onClick={() => setUseEasternArabic(!useEasternArabic)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-cyan-500/50 transition-colors cursor-pointer"
        >
          {t('toggleNumerals')}
        </button>

        {/* Large Font Accessibility Toggle */}
        <button
          type="button"
          onClick={() => setIsLargeFont(!isLargeFont)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
            isLargeFont
              ? 'bg-cyan-600 text-white border-cyan-500'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>{isLargeFont ? t('normalFont') : t('largeFont')}</span>
        </button>

        {/* Browser Notification Opt-In */}
        {'Notification' in window && (
          <button
            type="button"
            onClick={requestNotification}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              notificationsEnabled
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-cyan-500/50'
            }`}
          >
            {notificationsEnabled ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            <span>{notificationsEnabled ? 'التنبيهات مفعلة' : t('notifyMe')}</span>
          </button>
        )}


        {/* Audio Mute/Unmute */}
        <button
          type="button"
          onClick={toggleSound}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-cyan-500/50 transition-colors cursor-pointer"
          title={isMuted ? t('unmuted') : t('muted')}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-cyan-500" />}
        </button>
      </div>

      {/* Hidden Canvas for Digital Pass Export */}
      <canvas ref={digitalPassCanvasRef} className="hidden" />

      {/* SMART DIGITAL PASS MODAL (Apple / Google Wallet Style) */}
      <Modal
        isOpen={isDigitalPassOpen}
        onClose={() => setIsDigitalPassOpen(false)}
        title={
          <div className="flex items-center gap-2 text-cyan-400">
            <CreditCard className="w-5 h-5" />
            <span>بطاقة المريض الطبية الذكية • SYNQRA DIGITAL PASS</span>
          </div>
        }
        maxWidth="md"
      >
        <div className="space-y-6 text-center">
          {/* Glassmorphic Pass Preview */}
          <div className="relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-[#0b1329] to-black border-2 border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden text-start">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-bl-full pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase font-mono block">
                  SYNQRA SMART PASS
                </span>
                <h3 className="text-lg font-black text-white">{effectiveClinic.clinicName}</h3>
                <span className="text-xs text-slate-400">{effectiveClinic.specialty}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold text-xs shadow-inner">
                NFC
              </div>
            </div>

            {/* Pass Body */}
            <div className="py-6 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 block mb-1">رقم الدور في الطابور</span>
                <span className="text-5xl sm:text-6xl font-black text-cyan-400 font-mono">
                  #{yourNumber}
                </span>
                <div className="text-xs text-emerald-400 font-semibold mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>تذكرة رقمية نشطة مؤمنة</span>
                </div>
              </div>

              {/* QR Code */}
              {qrCodeDataUrl && (
                <div className="p-2.5 rounded-2xl bg-white shadow-xl shrink-0">
                  <img src={qrCodeDataUrl} alt="QR" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
                </div>
              )}
            </div>

            {/* Pass Footer */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>المريض: {entry?.patientName || 'زائر العيادة'}</span>
              <span>{new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              variant="glow"
              size="md"
              loading={isDownloadingPass}
              onClick={handleDownloadDigitalPass}
              className="w-full font-bold bg-cyan-600 hover:bg-cyan-500"
            >
              <Download className="w-4 h-4" />
              <span>تحميل كبطاقة رقمية (PNG)</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                const text = `تذكرتي الطبية في ${effectiveClinic.clinicName}\nرقم الدور: #${yourNumber}\nرابط المتابعة المباشر:\n${window.location.href}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="w-full font-bold border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>مشاركة عبر واتساب</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
