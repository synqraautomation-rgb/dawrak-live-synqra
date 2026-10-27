import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../../lib/i18n';
import { soundEngine } from '../../lib/audio';
import { SynqraLogo } from './SynqraLogo';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { subscribeQueueEntry } from '../../lib/firebase';
import { Menu, X, Building2, Home, Ticket, Sparkles } from 'lucide-react';

interface GlobalNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  variant?: 'full' | 'compact';
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

export const GlobalNav: React.FC<GlobalNavProps> = ({
  currentPath,
  onNavigate,
  variant = 'full'
}) => {
  const { t, language } = useI18n();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [ripples, setRipples] = useState<Record<string, Ripple[]>>({});
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Real-time patient active waiting ticket
  const [lastTicket, setLastTicket] = useState<{ clinicId: string; entryId: string; ticketNum?: number } | null>(null);
  const [isTicketWaiting, setIsTicketWaiting] = useState<boolean>(false);
  const [liveTicketNumber, setLiveTicketNumber] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check and subscribe to patient's active booking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('dawrak_last_active_ticket');
    if (!saved) {
      setIsTicketWaiting(false);
      setLastTicket(null);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (!parsed.clinicId || !parsed.entryId) {
        setIsTicketWaiting(false);
        setLastTicket(null);
        return;
      }
      setLastTicket(parsed);
      if (parsed.ticketNum) setLiveTicketNumber(parsed.ticketNum);

      // Subscribe in real-time to check patient's active ticket
      const unsub = subscribeQueueEntry(parsed.clinicId, parsed.entryId, (entry) => {
        if (!entry) return; // Do NOT clear ticket during initial network handshakes

        if (entry.status === 'completed' || entry.status === 'no_show') {
          setIsTicketWaiting(false);
          setLastTicket(null);
          try {
            localStorage.removeItem('dawrak_last_active_ticket');
          } catch {}
        } else if (entry.status === 'waiting' || entry.status === 'called') {
          setIsTicketWaiting(true);
          setLiveTicketNumber(entry.queueNumber);
        }
      });

      return () => unsub();
    } catch {
      setIsTicketWaiting(false);
      setLastTicket(null);
    }
  }, [currentPath]);

  // Clean, focused public navigation: Home and Clinics Directory only
  // (Clinic Portal & Demo buttons removed from public header as requested)
  const navLinks = [
    { 
      path: '/', 
      label: t('navHome'), 
      icon: Home,
      fullName: language === 'ar' ? 'الرئيسية • بوابة دورك لايف (Home Portal)' : 'Home • Central Patient Portal'
    },
    { 
      path: '/clinics', 
      label: t('navClinics'), 
      icon: Building2,
      fullName: language === 'ar' ? 'دليل المراكز والعيادات وحجز المواعيد (Clinics Directory)' : 'Clinics Directory & Live Booking'
    },
  ];

  // Helper to spawn subtle ripple waves
  const triggerRipple = (e: React.MouseEvent<HTMLElement>, key: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const newRipple: Ripple = { x, y, size, id: Date.now() };

    setRipples((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newRipple]
    }));

    setTimeout(() => {
      setRipples((prev) => ({
        ...prev,
        [key]: (prev[key] || []).filter((r) => r.id !== newRipple.id)
      }));
    }, 600);
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLButtonElement>, path: string) => {
    triggerRipple(e, path);
    soundEngine.playTransitionWhoosh();
    onNavigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'py-2.5 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-md'
            : 'py-4 bg-white/70 dark:bg-slate-950/60 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo Mark + Wordmark */}
          <div 
            onClick={(e) => {
              triggerRipple(e, 'logo');
              soundEngine.playTransitionWhoosh();
              onNavigate('/');
            }}
            className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden rounded-2xl"
          >
            {ripples['logo']?.map((r) => (
              <motion.span
                key={r.id}
                initial={{ scale: 0, opacity: 0.3 }}
                animate={{ scale: 1, opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
                className="absolute rounded-full bg-cyan-400/25 pointer-events-none z-20"
              />
            ))}
            <SynqraLogo size="sm" showTagline={!isScrolled} />
          </div>

          {/* Desktop Navigation Links with Sliding Active Pill & Ripple & Tooltip */}
          {variant === 'full' && (
            <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-inner">
              {navLinks.map((link) => {
                const isActive = currentPath === link.path || (link.path !== '/' && currentPath.startsWith(link.path));
                const Icon = link.icon;
                return (
                  <div key={link.path} className="relative">
                    <button
                      type="button"
                      aria-label={link.fullName}
                      onMouseEnter={() => setHoveredButton(link.path)}
                      onMouseLeave={() => setHoveredButton(null)}
                      onClick={(e) => handleLinkClick(e, link.path)}
                      className="relative overflow-hidden px-4 py-1.5 rounded-full text-xs font-bold transition-colors select-none flex items-center gap-1.5 cursor-pointer"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNavPill"
                          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200/60 dark:border-slate-700"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}

                      {/* Click Ripple Effect Waves */}
                      {ripples[link.path]?.map((r) => (
                        <motion.span
                          key={r.id}
                          initial={{ scale: 0, opacity: 0.4 }}
                          animate={{ scale: 1, opacity: 0 }}
                          transition={{ duration: 0.55, ease: 'easeOut' }}
                          style={{
                            left: r.x,
                            top: r.y,
                            width: r.size,
                            height: r.size,
                          }}
                          className="absolute rounded-full bg-cyan-400/35 pointer-events-none z-20"
                        />
                      ))}

                      <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                      <span className={`relative z-10 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                        {link.label}
                      </span>
                    </button>

                    {/* Hover-based Tooltip for Navigation Button */}
                    <AnimatePresence>
                      {hoveredButton === link.path && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.94 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.94 }}
                          transition={{ duration: 0.15 }}
                          role="tooltip"
                          className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-cyan-500/30 shadow-2xl backdrop-blur-md pointer-events-none whitespace-nowrap z-50 text-[11px] font-bold flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>{link.fullName}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* SMART PATIENT ACTIVE TICKET: Displays ONLY while patient is waiting; disappears when called or completed */}
              <AnimatePresence>
                {lastTicket && isTicketWaiting && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.85, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)', transition: { duration: 0.3 } }}
                    className="relative"
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredButton('ticket')}
                      onMouseLeave={() => setHoveredButton(null)}
                      onClick={(e) => {
                        triggerRipple(e, 'ticket');
                        soundEngine.playTransitionWhoosh();
                        onNavigate(`/live/${lastTicket.clinicId}/${lastTicket.entryId}`);
                      }}
                      className="relative overflow-hidden px-3.5 py-1.5 rounded-full text-xs font-black transition-all bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
                    >
                      {ripples['ticket']?.map((r) => (
                        <motion.span
                          key={r.id}
                          initial={{ scale: 0, opacity: 0.4 }}
                          animate={{ scale: 1, opacity: 0 }}
                          transition={{ duration: 0.55 }}
                          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
                          className="absolute rounded-full bg-emerald-400/40 pointer-events-none z-20"
                        />
                      ))}
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <Ticket className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>
                        {language === 'ar' 
                          ? `تذكرتي النشطة (#${liveTicketNumber || lastTicket.ticketNum || '..'})` 
                          : `My Ticket (#${liveTicketNumber || lastTicket.ticketNum || '..'})`}
                      </span>
                    </button>

                    <AnimatePresence>
                      {hoveredButton === 'ticket' && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.94 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.94 }}
                          transition={{ duration: 0.15 }}
                          role="tooltip"
                          className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-emerald-500/40 shadow-2xl backdrop-blur-md pointer-events-none whitespace-nowrap z-50 text-[11px] font-bold flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{language === 'ar' ? 'أنت في قائمة الانتظار حالياً • اضغط لمتابعة دورك' : 'You are currently in queue • Click to view live turn'}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </nav>
          )}

          {/* Actions: Theme Toggle, Language Switcher & Mobile Menu Trigger with Ripples & Tooltips */}
          <div className="flex items-center gap-2.5">
            {/* Language Toggle with Ripple & Tooltip */}
            <div 
              className="relative"
              onMouseEnter={() => setHoveredButton('lang')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={(e) => triggerRipple(e, 'lang')}
            >
              <div className="relative overflow-hidden rounded-full">
                {ripples['lang']?.map((r) => (
                  <motion.span
                    key={r.id}
                    initial={{ scale: 0, opacity: 0.4 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 0.55 }}
                    style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
                    className="absolute rounded-full bg-cyan-400/40 pointer-events-none z-20"
                  />
                ))}
                <LanguageToggle />
              </div>

              <AnimatePresence>
                {hoveredButton === 'lang' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.94 }}
                    transition={{ duration: 0.15 }}
                    role="tooltip"
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700 shadow-xl backdrop-blur-md pointer-events-none whitespace-nowrap z-50 text-[10px] font-bold"
                  >
                    <span>{language === 'ar' ? 'تبديل لغة الواجهة (Switch Language)' : 'Switch Language (عربي)'}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle with Ripple & Tooltip */}
            <div 
              className="relative"
              onMouseEnter={() => setHoveredButton('theme')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={(e) => triggerRipple(e, 'theme')}
            >
              <div className="relative overflow-hidden rounded-full">
                {ripples['theme']?.map((r) => (
                  <motion.span
                    key={r.id}
                    initial={{ scale: 0, opacity: 0.4 }}
                    animate={{ scale: 1, opacity: 0 }}
                    transition={{ duration: 0.55 }}
                    style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
                    className="absolute rounded-full bg-amber-400/40 pointer-events-none z-20"
                  />
                ))}
                <ThemeToggle />
              </div>

              <AnimatePresence>
                {hoveredButton === 'theme' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.94 }}
                    transition={{ duration: 0.15 }}
                    role="tooltip"
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700 shadow-xl backdrop-blur-md pointer-events-none whitespace-nowrap z-50 text-[10px] font-bold"
                  >
                    <span>{language === 'ar' ? 'تبديل المظهر الليلي/النهاري' : 'Toggle Theme'}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Replay Intro Trigger with Tooltip */}
            <div 
              className="relative hidden sm:block"
              onMouseEnter={() => setHoveredButton('intro')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  soundEngine.playClickSound();
                  window.dispatchEvent(new CustomEvent('synqra:replay-intro'));
                }}
                className="p-2 rounded-full text-slate-500 hover:text-cyan-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-cyan-500/10 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                aria-label="Replay intro"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </motion.button>

              <AnimatePresence>
                {hoveredButton === 'intro' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.94 }}
                    transition={{ duration: 0.15 }}
                    role="tooltip"
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700 shadow-xl backdrop-blur-md pointer-events-none whitespace-nowrap z-50 text-[10px] font-bold"
                  >
                    <span>{language === 'ar' ? 'عرض المقدمة السينمائية (Replay Intro)' : 'Replay Intro'}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Hamburger Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                soundEngine.playClickSound();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Mobile Full-Screen Overlay Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-[60px] z-30 md:hidden bg-white/98 dark:bg-slate-950/98 backdrop-blur-2xl p-6 flex flex-col justify-between overflow-y-auto"
          >
            <div className="flex flex-col gap-3 pt-4">
              {navLinks.map((link) => {
                const isActive = currentPath === link.path;
                const Icon = link.icon;
                return (
                  <motion.button
                    key={link.path}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => handleLinkClick(e, link.path)}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl text-base font-bold text-start transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/80 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-500 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span>{link.label}</span>
                  </motion.button>
                );
              })}

              {/* Active Ticket in Mobile Menu */}
              {lastTicket && isTicketWaiting && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    handleLinkClick(e, `/live/${lastTicket.clinicId}/${lastTicket.entryId}`);
                  }}
                  className="flex items-center gap-3.5 p-4 rounded-2xl text-base font-black text-start transition-all border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/80 shadow-sm cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-500 shrink-0">
                    <Ticket className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <span>{language === 'ar' ? 'تذكرتي النشطة حالياً' : 'My Active Ticket'}</span>
                    <span className="text-xs font-mono opacity-80">#{liveTicketNumber || lastTicket.ticketNum} (في الانتظار)</span>
                  </div>
                </motion.button>
              )}
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {t('rightsReserved')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
