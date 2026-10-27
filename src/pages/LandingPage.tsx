import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { InteractiveBackground } from '../components/ui/InteractiveBackground';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { SynqraLogo } from '../components/ui/SynqraLogo';
import { audio } from '../lib/audio';
import { 
  Users, 
  Stethoscope, 
  ArrowLeft, 
  ArrowRight, 
  Tv, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  CheckCircle2, 
  MessageCircle, 
  Activity, 
  HeartPulse, 
  Radio, 
  Volume2, 
  Building2, 
  ExternalLink,
  Lock,
  Ticket
} from 'lucide-react';
import { subscribeQueueEntry } from '../lib/firebase';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { t, isRtl, language } = useI18n();
  const [isClinicModalOpen, setIsClinicModalOpen] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [hasTestedAudio, setHasTestedAudio] = useState(false);

  // Active Patient Ticket on Home Page (Auto-disappears when turn arrives: 'called' or 'completed')
  const [activeTicket, setActiveTicket] = useState<{ clinicId: string; entryId: string; ticketNum?: number } | null>(null);
  const [isTicketWaiting, setIsTicketWaiting] = useState(false);
  const [liveTicketNumber, setLiveTicketNumber] = useState<number | null>(null);

  // Futuristic Live Call Simulator state
  const [simulatedTurn, setSimulatedTurn] = useState<number>(14);
  const [isSimulatingCall, setIsSimulatingCall] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('dawrak_last_active_ticket');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (!parsed.clinicId || !parsed.entryId) return;
      setActiveTicket(parsed);
      if (parsed.ticketNum) setLiveTicketNumber(parsed.ticketNum);

      // Subscribe to real-time status:
      // When turn arrives ('called') or is done ('completed' / 'no_show'), automatically disappear!
      const unsub = subscribeQueueEntry(parsed.clinicId, parsed.entryId, (entry) => {
        if (!entry) return;
        if (entry.status === 'called' || entry.status === 'completed' || entry.status === 'no_show') {
          setIsTicketWaiting(false);
          setActiveTicket(null);
          try {
            localStorage.removeItem('dawrak_last_active_ticket');
          } catch {}
        } else if (entry.status === 'waiting') {
          setIsTicketWaiting(true);
          setLiveTicketNumber(entry.queueNumber);
        }
      });
      return () => unsub();
    } catch {
      setActiveTicket(null);
      setIsTicketWaiting(false);
    }
  }, []);

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const handleTestChime = (e: React.MouseEvent) => {
    e.stopPropagation();
    audio.playChime();
    setHasTestedAudio(true);
    setTimeout(() => setHasTestedAudio(false), 3000);
  };

  const handleSimulateTurnCall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSimulatingCall(true);
    const nextNum = simulatedTurn >= 20 ? 12 : simulatedTurn + 1;
    setSimulatedTurn(nextNum);
    audio.playChime();
    setTimeout(() => {
      audio.announceNumber(nextNum);
      setIsSimulatingCall(false);
    }, 450);
  };

  const benefits = [
    { text: t('benefit1'), icon: Tv },
    { text: t('benefit2'), icon: Zap },
    { text: t('benefit3'), icon: Smartphone },
    { text: t('benefit4'), icon: Activity },
  ];

  const steps = [
    {
      num: '01',
      title: t('step1Title'),
      desc: t('step1Desc'),
      icon: Users,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      num: '02',
      title: t('step2Title'),
      desc: t('step2Desc'),
      icon: Clock,
      color: 'from-teal-500 to-emerald-500'
    },
    {
      num: '03',
      title: t('step3Title'),
      desc: t('step3Desc'),
      icon: Sparkles,
      color: 'from-blue-500 to-indigo-500'
    }
  ];

  const trustBadges = [
    {
      title: t('trustSecurity'),
      desc: t('trustSecurityDesc'),
      icon: ShieldCheck
    },
    {
      title: t('trustRealtime'),
      desc: t('trustRealtimeDesc'),
      icon: Zap
    },
    {
      title: t('trustFree'),
      desc: t('trustFreeDesc'),
      icon: Smartphone
    }
  ];

  return (
    <div className="relative min-h-screen pt-20 overflow-hidden">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-12">
        {/* Real-time Active Patient Ticket Alert Banner (Disappears automatically when turn is called!) */}
        <AnimatePresence>
          {activeTicket && isTicketWaiting && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95, transition: { duration: 0.35 } }}
              onClick={() => onNavigate(`/live/${activeTicket.clinicId}/${activeTicket.entryId}`)}
              className="max-w-xl mx-auto mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-cyan-950/80 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)] backdrop-blur-xl flex items-center justify-between gap-4 cursor-pointer hover:border-emerald-400 hover:scale-[1.01] transition-all"
            >
              <div className="flex items-center gap-3 text-start">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg">
                  <Ticket className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-400 font-mono tracking-wider">
                      تذكرتك الطبية في الانتظار
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-sm font-black text-white">
                    دورك المخصص: <span className="font-mono text-cyan-300 text-base font-black">#{liveTicketNumber || activeTicket.ticketNum || '..'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    تختفي هذه البطاقة تلقائياً بمجرد استدعاء دورك للدخول
                  </div>
                </div>
              </div>

              <Button
                variant="glow"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 font-bold shrink-0 text-xs shadow-md"
              >
                <span>متابعة الدور</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center max-w-3xl mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block mb-4"
          >
            <Badge variant="live" className="text-xs sm:text-sm px-4 py-1.5 font-bold shadow-lg shadow-cyan-500/10 border border-cyan-500/30">
              <HeartPulse className="w-4 h-4 text-cyan-500 animate-pulse" />
              {t('heroBadge')}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-6"
          >
            <span>{t('heroTitle1')} </span>
            <span className="text-gradient drop-shadow-sm">{t('heroTitleHighlight')}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal"
          >
            {t('heroSubtitle')}
          </motion.p>
        </div>

        {/* FUTURISTIC SYNQRA LIVE TELEMETRY CORE (Replacing the isolated 3D model) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="w-full max-w-4xl mx-auto mb-14"
        >
          <div className="relative rounded-3xl p-6 sm:p-8 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.18)] overflow-hidden">
            {/* Ambient cyber grid scanline */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.15),_transparent_70%)] pointer-events-none" />
            
            {/* Header Radar Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800 relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </div>
                <div className="text-start">
                  <div className="text-xs font-black tracking-wider text-cyan-400 font-mono flex items-center gap-1.5 uppercase">
                    <Radio className="w-3.5 h-3.5" />
                    <span>SYNQRA MEDICAL INTELLIGENCE CORE</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    مزامنة فورية مشفرة بالزمن الفعلي • Zero Waiting Friction
                  </div>
                </div>
              </div>

              {/* Interactive Demo Simulator Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Live Turn Simulator with Arabic Voice */}
                <button
                  onClick={handleSimulateTurnCall}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                    isSimulatingCall
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse'
                      : 'bg-indigo-950/60 border-indigo-500/40 hover:border-indigo-400 text-indigo-300 hover:text-white'
                  }`}
                  title="محاكاة فورية لاستدعاء المريض بالصوت العربي ورقم الشاشة"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>
                    {isSimulatingCall 
                      ? `جاري نداء رقم ${simulatedTurn}...` 
                      : `محاكاة استدعاء رقم (${simulatedTurn}) بالصوت`}
                  </span>
                </button>

                {/* 2. Live Audio Chime Test */}
                <button
                  onClick={handleTestChime}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    hasTestedAudio
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-800/80 border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-white'
                  }`}
                  title="استمع لنغمة الاستدعاء بالعيادة"
                >
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{hasTestedAudio ? 'تم الرنين ⚡' : 'نغمة الرنين'}</span>
                </button>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 relative z-10 text-start">
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">سرعة التحديث</div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono flex items-baseline gap-1">
                  <span>0.04</span>
                  <span className="text-xs text-cyan-400 font-normal">ثانية</span>
                </div>
                <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>WebSocket دائم</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">توفير وقت الانتظار</div>
                <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono flex items-baseline gap-1">
                  <span>78%</span>
                </div>
                <div className="text-[10px] text-cyan-300 mt-1">تتبع حر من المنزل</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">دقة الإشعارات</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono flex items-baseline gap-1">
                  <span>99.8%</span>
                </div>
                <div className="text-[10px] text-emerald-300 mt-1">تنبيه ذكي قبل دورين</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">جاهزية التلفزيون</div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono flex items-baseline gap-1">
                  <span>4K TV</span>
                </div>
                <div className="text-[10px] text-indigo-300 mt-1">استدعاء صوتي استوديو</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* PRIMARY CTA — SPLIT-CHOICE HIGH-END INTERACTIVE PANELS */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-20">
          {/* Patient Choice Panel */}
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              audio.playClickSound();
              onNavigate('/clinics');
            }}
            className="group relative rounded-3xl p-8 sm:p-10 cursor-pointer overflow-hidden border-2 border-cyan-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-xl hover:shadow-[0_0_50px_rgba(6,182,212,0.35)] transition-all duration-300"
          >
            {/* Iridescent Corner Accent */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-cyan-400/20 via-teal-400/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:rotate-6 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                {language === 'ar' ? 'فوري بدون تسجيل' : 'Instant • No Login'}
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>{t('ctaPatientTitle')}</span>
              <ArrowIcon className="w-7 h-7 text-cyan-500 transform group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform" />
            </h3>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-8 leading-relaxed font-medium">
              {t('ctaPatientDesc')}
            </p>

            <div className="flex items-center gap-2 mb-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>رقم حجز مباشر</span>
              <span>•</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>تتبع حي من الموبايل</span>
            </div>

            <Button
              variant="glow"
              size="lg"
              className="w-full text-base font-black shadow-lg shadow-cyan-500/30"
            >
              <span>{t('ctaPatientBtn')}</span>
              <ArrowIcon className="w-5 h-5" />
            </Button>
          </motion.div>

          {/* Clinic Choice Panel */}
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              audio.playClickSound();
              setIsClinicModalOpen(true);
            }}
            className="group relative rounded-3xl p-8 sm:p-10 cursor-pointer overflow-hidden border-2 border-blue-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-xl hover:shadow-[0_0_50px_rgba(59,130,246,0.35)] transition-all duration-300"
          >
            {/* Iridescent Corner Accent */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-blue-500/20 via-indigo-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />

            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:-rotate-6 transition-transform">
                <Stethoscope className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                {language === 'ar' ? 'للأطباء والعيادات' : 'For Doctors & Clinics'}
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3 flex items-center justify-between">
              <span>{t('ctaClinicTitle')}</span>
              <ArrowIcon className="w-7 h-7 text-blue-500 transform group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform" />
            </h3>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-8 leading-relaxed font-medium">
              {t('ctaClinicDesc')}
            </p>

            <div className="flex items-center gap-2 mb-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>شاشة تلفزيون 4K</span>
              <span>•</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>داشبورد سكرتيرة ذكي</span>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full text-base font-black border-blue-500/40 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 shadow-lg shadow-blue-500/10"
            >
              <span>{t('ctaClinicBtn')}</span>
              <MessageCircle className="w-5 h-5 text-emerald-500" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200/80 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="neutral" className="mb-3 font-bold uppercase tracking-wider text-xs">
            {language === 'ar' ? 'سلاسة وسرعة' : 'Seamless & Fast'}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
            {t('howItWorksTitle')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            {t('howItWorksSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
              >
                <Card className="h-full relative overflow-hidden group hover:border-cyan-500/40">
                  <span className="absolute top-4 end-6 text-5xl font-black text-slate-200 dark:text-slate-800 pointer-events-none select-none font-mono">
                    {step.num}
                  </span>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${step.color} text-white flex items-center justify-center mb-6 shadow-md shadow-cyan-500/20`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {step.desc}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trustBadges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className="p-6 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                      {badge.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <SynqraLogo size="sm" />

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
            {/* Replay Cinematic Intro Trigger */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('synqra:replay-intro'));
                }
              }}
              className="hover:text-cyan-500 transition-colors flex items-center gap-1.5 text-cyan-400 cursor-pointer"
              title="إعادة مشاهدة الدخلة السينمائية للمنظومة"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>العرض السينمائي (Intro)</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveLegalModal('privacy')}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              {t('privacyPolicy')}
            </button>
            <span>•</span>
            <button
              onClick={() => setActiveLegalModal('terms')}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              {t('termsOfService')}
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('/master')}
              className="hover:text-cyan-500 transition-colors flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 cursor-pointer"
              title="لوحة الإدارة المركزية (سينقرا كنترول)"
            >
              <Lock className="w-3 h-3" />
              <span>التحكم العام</span>
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {t('rightsReserved')}
          </span>
        </div>
      </footer>

      {/* Clinic Partnership WhatsApp Modal - Accessible strictly via 'أنا عيادة / طبيب' */}
      <Modal
        isOpen={isClinicModalOpen}
        onClose={() => setIsClinicModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-cyan-500" />
            <span>{t('clinicModalTitle')}</span>
          </div>
        }
        maxWidth="lg"
      >
        <div className="flex flex-col gap-6">
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('clinicModalPitch')}
          </p>

          <div className="flex flex-col gap-3">
            {benefits.map((b, idx) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: isRtl ? 15 : -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60"
                >
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                    {b.text}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Dedicated WhatsApp Subscription Button strictly for Clinic/Doctor */}
          <a
            href={`https://wa.me/201225161076?text=${encodeURIComponent(
              "⚡ ⟦ ＳＹＮＱＲＡ™ ⟧ ⚡\nمنظومة دورك لايف (Dawrak Live) — الحل الطبي الذكي لإدارة الطوابير\n──────────────────────\nالسلام عليكم، أود تفعيل اشتراك منظومة دورك لايف لعيادتي:\n▫️ اسم المركز / الطبيب: \n▫️ التخصص الطبي: \n▫️ المدينة / العنوان: \n▫️ رقم التواصل: \n──────────────────────\nيرجى إرسال باقات الاشتراك وتجهيز المنظومة فورياً."
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{t('clinicWhatsAppCta')} (01225161076)</span>
          </a>
        </div>
      </Modal>

      {/* Privacy Policy / Terms Modal */}
      <Modal
        isOpen={activeLegalModal !== null}
        onClose={() => setActiveLegalModal(null)}
        title={activeLegalModal === 'privacy' ? t('privacyPolicy') : t('termsOfService')}
        maxWidth="lg"
      >
        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {activeLegalModal === 'privacy' ? (
            <>
              <p className="font-semibold text-slate-800 dark:text-white">
                {language === 'ar' ? 'التزام سينقرا الكامل بحماية بيانات المرضى والعيادات:' : 'SYNQRA Commitment to Patient & Clinic Privacy:'}
              </p>
              <p>
                {language === 'ar'
                  ? '١. الخصوصية المطلقة للأفراد: لا يتم عرض أسماء المرضى أو أرقام هواتفهم على أي شاشات عامة أو شاشات انتظار تلفزيونية إطلاقاً. يتم التعامل مع كافة الحالات عبر أرقام طابور مشفرة ومجهولة الهوية.'
                  : '1. Absolute Individual Privacy: Patient names and contact numbers are never broadcast on waiting room TVs or public endpoints. All patients are identified by anonymized sequential tickets.'}
              </p>
              <p>
                {language === 'ar'
                  ? '٢. التخزين الآمن: تُحفظ بيانات العيادات والحجوزات وفق أعلى معايير التشفير السحابي والتحكم الصارم في الصلاحيات بواسطة قواعد أمان Firestore المعزولة.'
                  : '2. Secure Cloud Storage: All clinical queue documents are protected by strict Zero-Trust security rules and encrypted transport.'}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-800 dark:text-white">
                {language === 'ar' ? 'شروط وأحكام استخدام منصة دورك لايف:' : 'Dawrak Live Terms of Service:'}
              </p>
              <p>
                {language === 'ar'
                  ? '١. اشتراكات العيادات: تقدم الخدمة للمراكز والعيادات الطبية بموجب اشتراك دوري معتمد يتم تجديده وإدارته حصرياً من خلال فريق سينقرا المعتمد.'
                  : '1. Clinic Subscriptions: Dawrak Live services are provisioned on active subscription terms issued and managed exclusively by SYNQRA.'}
              </p>
              <p>
                {language === 'ar'
                  ? '٢. إخلاء المسؤولية الطبية: دورك لايف نظام لإدارة وتنظيم الطوابير بالزمن الفعلي ولا يقدم استشارات أو تشخيصات طبية.'
                  : '2. Medical Disclaimer: Dawrak Live is a real-time queuing management platform and does not provide clinical or diagnostic medical advice.'}
              </p>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
