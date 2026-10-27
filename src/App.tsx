/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeProvider } from './lib/theme';
import { I18nProvider } from './lib/i18n';
import { GlobalNav } from './components/ui/GlobalNav';
import { CinematicIntro } from './components/ui/CinematicIntro';
import { ThreeGlobalBackground } from './components/3d/ThreeGlobalBackground';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ClinicsPage } from './pages/ClinicsPage';
import { BookingPage } from './pages/BookingPage';
import { LiveTrackingPage } from './pages/LiveTrackingPage';
import { ClinicLoginPage } from './pages/ClinicLoginPage';
import { ClinicDashboardPage } from './pages/ClinicDashboardPage';
import { WaitingRoomDisplayPage } from './pages/WaitingRoomDisplayPage';
import { MasterDashboardPage, SECRET_MASTER_SLUG } from './pages/MasterDashboardPage';

/**
 * Normalizes URL path supporting both standard pushState paths and hash routing
 * (e.g. #/clinics or /clinics) for maximum host portability (Netlify, Vercel, Apache, Localhost).
 */
function getActiveRoute(): string {
  if (typeof window === 'undefined') return '/';

  // Support hash routing fallback if present
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    const hashPath = window.location.hash.slice(1);
    return hashPath || '/';
  }

  // Support query param fallback (?page=...)
  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get('page');
  if (pageParam) {
    return pageParam.startsWith('/') ? pageParam : `/${pageParam}`;
  }

  // Standard pathname
  const pathname = window.location.pathname;
  if (!pathname || pathname === '') return '/';
  
  // Strip trailing slashes (except root)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function MainApp() {
  const [currentPath, setCurrentPath] = useState<string>(() => getActiveRoute());

  // Cinematic Intro Splash State - only show on first visit to the main landing page
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const initialRoute = getActiveRoute();
    const isHome = initialRoute === '/' || initialRoute === '/home' || initialRoute === '';
    if (!isHome) return false;
    return sessionStorage.getItem('synqra_intro_seen') !== 'true';
  });

  const handleIntroComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('synqra_intro_seen', 'true');
    }
    setShowIntro(false);
  }, []);

  // Replay Intro Listener
  useEffect(() => {
    const handleReplay = () => setShowIntro(true);
    window.addEventListener('synqra:replay-intro', handleReplay);
    return () => window.removeEventListener('synqra:replay-intro', handleReplay);
  }, []);

  // Listen for browser forward/backward navigation and hash change
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(getActiveRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const [isNavigating, setIsNavigating] = useState(false);

  // Universal navigation handler with smooth visual transition
  const handleNavigate = useCallback((path: string) => {
    const clean = path.startsWith('/') ? path : `/${path}`;
    if (clean === currentPath) return;

    setIsNavigating(true);
    try {
      window.history.pushState({}, '', clean);
    } catch {
      // Fallback for sandboxed frames where pushState might be restricted
      window.location.hash = clean;
    }

    setTimeout(() => {
      setCurrentPath(clean);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        setIsNavigating(false);
      }, 150);
    }, 100);
  }, [currentPath]);

  // Route Resolution
  const routeContent = useMemo(() => {
    // 1. Root / Landing Page
    if (currentPath === '/' || currentPath === '/home' || currentPath === '') {
      return <LandingPage onNavigate={handleNavigate} />;
    }

    // 2. Clinics Directory
    if (currentPath === '/clinics') {
      return <ClinicsPage onNavigate={handleNavigate} />;
    }

    // 3. Master Admin Dashboard (Secret slug, /master, or /admin)
    if (
      currentPath === '/master' ||
      currentPath === '/admin' ||
      currentPath.startsWith('/master/') ||
      currentPath.includes(SECRET_MASTER_SLUG)
    ) {
      return <MasterDashboardPage onNavigate={handleNavigate} />;
    }

    // 4. Clinic Staff Login Portal
    if (currentPath === '/clinic/login' || currentPath === '/login') {
      return <ClinicLoginPage onNavigate={handleNavigate} />;
    }

    // 5. Patient Booking Flow: /book/:clinicId
    if (currentPath.startsWith('/book/')) {
      const parts = currentPath.split('/');
      const clinicId = parts[2] || 'demo-clinic-cairo';
      return <BookingPage clinicId={clinicId} onNavigate={handleNavigate} />;
    }

    // 6. Patient Live Tracking Ticket: /live/:clinicId/:entryId or /track/:clinicId/:entryId or /live
    if (currentPath === '/live' || currentPath === '/track' || currentPath.startsWith('/live/') || currentPath.startsWith('/track/')) {
      const parts = currentPath.split('/');
      let clinicId = parts[2] || '';
      let entryId = parts[3] || '';

      // Auto-recover last active ticket if path is /live or missing parameters
      if ((!entryId || !clinicId) && typeof window !== 'undefined') {
        try {
          const lastActive = localStorage.getItem('dawrak_last_active_ticket');
          if (lastActive) {
            const parsed = JSON.parse(lastActive);
            if (parsed.entryId) {
              clinicId = clinicId || parsed.clinicId || 'demo-clinic-cairo';
              entryId = entryId || parsed.entryId;
            }
          }
        } catch {}
      }

      return <LiveTrackingPage clinicId={clinicId || 'demo-clinic-cairo'} entryId={entryId} onNavigate={handleNavigate} />;
    }

    // 7. Waiting Room TV Display Screen: /clinic/:clinicId/display or /display/:clinicId
    if (currentPath.startsWith('/clinic/') && currentPath.endsWith('/display')) {
      const parts = currentPath.split('/');
      const clinicId = parts[2] || 'demo-clinic-cairo';
      return <WaitingRoomDisplayPage clinicId={clinicId} onNavigate={handleNavigate} />;
    }
    if (currentPath.startsWith('/display/')) {
      const parts = currentPath.split('/');
      const clinicId = parts[2] || 'demo-clinic-cairo';
      return <WaitingRoomDisplayPage clinicId={clinicId} onNavigate={handleNavigate} />;
    }

    // 8. Clinic Command Dashboard: /clinic/:clinicId/dashboard or /clinic/:clinicId
    if (currentPath.startsWith('/clinic/')) {
      const parts = currentPath.split('/');
      const clinicId = parts[2] || 'demo-clinic-cairo';
      return <ClinicDashboardPage clinicId={clinicId} onNavigate={handleNavigate} />;
    }

    // 9. 404 Fallback -> Gracefully route to Landing
    return <LandingPage onNavigate={handleNavigate} />;
  }, [currentPath, handleNavigate]);

  // Determine whether to display the public top GlobalNav
  // (Hidden on TV Waiting Room Display and on Clinic Staff Dashboard for pure focus)
  const isHomePage = currentPath === '/' || currentPath === '/home' || currentPath === '';
  const isDisplayKiosk = currentPath.endsWith('/display') || currentPath.startsWith('/display/');
  const isClinicDashboard = currentPath.startsWith('/clinic/') && currentPath !== '/clinic/login';
  const isMasterDashboard = currentPath === '/master' || currentPath === '/admin' || currentPath.includes(SECRET_MASTER_SLUG);
  const showGlobalNav = !isDisplayKiosk && !isClinicDashboard && !isMasterDashboard;

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#030712] dark:text-slate-100 font-sans selection:bg-cyan-500 selection:text-white transition-colors duration-300">
      {/* 3D Interactive Three.js Background across entire application */}
      <ThreeGlobalBackground />

      {/* Selective Translucent Backdrop Banner:
          Prominently and vibrantly clear on the Home Page, while gracefully applying a sleek,
          semi-transparent frosted banner overlay on all subpages (Clinics, Booking, Login, Tracking)
          so the 3D particles and animations flow gently underneath while buttons, text, and cards stay crystal clear. */}
      {!isHomePage && (
        <div 
          className="fixed inset-0 z-[1] bg-slate-900/35 dark:bg-[#030712]/45 backdrop-blur-[3px] pointer-events-none transition-all duration-500" 
          aria-hidden="true"
        />
      )}

      {/* Cinematic Intro Splash Entrance */}
      <AnimatePresence>
        {showIntro && (
          <CinematicIntro onComplete={handleIntroComplete} />
        )}
      </AnimatePresence>

      {showGlobalNav && (
        <GlobalNav currentPath={currentPath} onNavigate={handleNavigate} />
      )}
      <main className={`relative z-10 ${showGlobalNav ? 'pt-16 sm:pt-20' : ''}`}>
        {isNavigating ? (
          <div className="min-h-[60vh] flex items-center justify-center p-8">
            <LoadingSpinner size="lg" text="جاري تحميل الصفحة..." />
          </div>
        ) : (
          <motion.div
            key={currentPath}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {routeContent}
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <MainApp />
      </I18nProvider>
    </ThemeProvider>
  );
}
