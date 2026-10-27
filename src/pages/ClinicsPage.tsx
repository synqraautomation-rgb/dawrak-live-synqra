import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { 
  Clinic, 
  PublicClinic,
  subscribePublicClinics, 
  subscribeClinics, 
  seedDemoClinic, 
  isDemoClinicLocked, 
  subscribeDemoClinicLock 
} from '../lib/firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Skeleton } from '../components/ui/Skeleton';
import { 
  Search, 
  Filter, 
  ArrowLeft, 
  ArrowRight, 
  Building2, 
  SlidersHorizontal, 
  Sparkles, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  Lock
} from 'lucide-react';

interface ClinicsPageProps {
  onNavigate: (path: string) => void;
}

export const ClinicsPage: React.FC<ClinicsPageProps> = ({ onNavigate }) => {
  const { t, isRtl, formatNumber } = useI18n();
  const [clinics, setClinics] = useState<(Clinic | PublicClinic)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'alpha' | 'leastCrowded' | 'newest'>('leastCrowded');
  const [openOnly, setOpenOnly] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [lockNoticeModal, setLockNoticeModal] = useState<string | null>(null);
  const [demoLockedLocal, setDemoLockedLocal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('synqra_demo_clinic_locked') === 'true';
    }
    return false;
  });

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  // Real-time reactive Demo Clinic lock subscription
  useEffect(() => {
    const unsubLock = subscribeDemoClinicLock((locked) => {
      setDemoLockedLocal(locked);
    });
    return () => unsubLock();
  }, []);

  // Initialize and subscribe to public clinics in real-time
  useEffect(() => {
    // Ensure Demo clinic is seeded if DB is empty
    seedDemoClinic().catch((e) => console.warn('Demo clinic seed check:', e));

    const unsubscribe = subscribePublicClinics((data) => {
      if (data.length > 0) {
        // Filter out paused clinics
        const validClinics = data.filter((c) => {
          if (!c.isDemo && c.subscriptionStatus === 'paused') return false;
          return true;
        });
        setClinics(validClinics);
        setLoading(false);
      } else {
        // Fallback to fetch from /api/public-clinics or private if admin
        fetch('/api/public-clinics')
          .then((res) => res.json())
          .then((json) => {
            if (json.clinics && json.clinics.length > 0) {
              setClinics(json.clinics);
            }
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      }
    }, () => {
      // If public subscription hits an error, fallback to /api/public-clinics
      fetch('/api/public-clinics')
        .then((res) => res.json())
        .then((json) => {
          if (json.clinics) setClinics(json.clinics);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });

    return () => unsubscribe();
  }, []);

  // Synchronize with URL Query Parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('q');
      const specialty = params.get('specialty');
      const sort = params.get('sort');
      const open = params.get('openOnly');

      if (search) setSearchQuery(search);
      if (specialty) setSelectedSpecialty(specialty);
      if (sort === 'alpha' || sort === 'leastCrowded' || sort === 'newest') setSortBy(sort);
      if (open === 'true') setOpenOnly(true);
    }
  }, []);

  // Update URL Query Parameters
  const updateQueryParams = (newQuery: string, newSpec: string, newSort: string, newOpen: boolean) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams();
      if (newQuery) params.set('q', newQuery);
      if (newSpec !== 'all') params.set('specialty', newSpec);
      if (newSort !== 'leastCrowded') params.set('sort', newSort);
      if (newOpen) params.set('openOnly', 'true');
      
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  };

  // Dynamic Specialties extracted from active clinics
  const dynamicSpecialties = useMemo(() => {
    const set = new Set<string>();
    clinics.forEach((c) => {
      if (c.specialty) set.add(c.specialty);
    });
    return Array.from(set);
  }, [clinics]);

  // Filtered & Sorted Clinics
  const filteredClinics = useMemo(() => {
    let result = clinics.filter((c) => {
      // Exclude demo clinic completely if locked/hidden in commercial mode
      const isLocked = isDemoClinicLocked(c) || (c.isDemo && demoLockedLocal);
      if (c.isDemo && isLocked) return false;

      // Search Match
      const matchesSearch = 
        searchQuery.trim() === '' ||
        c.clinicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.specialty.toLowerCase().includes(searchQuery.toLowerCase());

      // Specialty Match
      const matchesSpecialty = 
        selectedSpecialty === 'all' || c.specialty === selectedSpecialty;

      // Open Only Match
      const matchesOpen = !openOnly || !c.isPaused;

      return matchesSearch && matchesSpecialty && matchesOpen;
    });

    // Sorting
    if (sortBy === 'alpha') {
      result.sort((a, b) => a.clinicName.localeCompare(b.clinicName));
    } else if (sortBy === 'leastCrowded') {
      result.sort((a, b) => (a.currentServingNumber || 0) - (b.currentServingNumber || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return result;
  }, [clinics, searchQuery, selectedSpecialty, sortBy, openOnly]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('all');
    setSortBy('leastCrowded');
    setOpenOnly(false);
    updateQueryParams('', 'all', 'leastCrowded', false);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Page Header Frosted Glass Banner (بانر شفاف) */}
      <div className="relative text-center max-w-3xl mx-auto mb-10 p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-3"
          >
            <Badge variant="live" className="font-bold text-xs">
              <Building2 className="w-3.5 h-3.5" />
              <span>{t('clinicsTitle')}</span>
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mb-3"
          >
            {t('clinicsTitle')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto"
          >
            {t('clinicsSubtitle')}
          </motion.p>
        </div>
      </div>

      {/* SMART STICKY FILTER BAR */}
      <div className="sticky top-20 z-30 mb-8 p-3 sm:p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl transition-all">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
          {/* Live Search Input with Instant Feedback */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute inset-y-0 start-4 my-auto text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                updateQueryParams(e.target.value, selectedSpecialty, sortBy, openOnly);
              }}
              placeholder={t('searchPlaceholder')}
              className="w-full ps-12 pe-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/90 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 border border-transparent focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
            />
          </div>

          {/* Quick Filter Controls */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {/* Open Now Toggle Chip */}
            <button
              type="button"
              onClick={() => {
                const next = !openOnly;
                setOpenOnly(next);
                updateQueryParams(searchQuery, selectedSpecialty, sortBy, next);
              }}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
                openOnly
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-emerald-500/50'
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${openOnly ? 'text-white' : 'text-emerald-400'}`} />
              <span>{t('openOnly')}</span>
            </button>

            {/* Smart Sort Segmented Controls */}
            <div className="shrink-0 flex items-center gap-1.5 bg-slate-900/90 rounded-xl p-1.5 border border-slate-700/80 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setSortBy('leastCrowded');
                  updateQueryParams(searchQuery, selectedSpecialty, 'leastCrowded', openOnly);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  sortBy === 'leastCrowded'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
              >
                <span>⚡</span>
                <span>{t('sortShortestQueue')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortBy('alpha');
                  updateQueryParams(searchQuery, selectedSpecialty, 'alpha', openOnly);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'alpha'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
              >
                <span>{t('sortAlphabetical')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortBy('newest');
                  updateQueryParams(searchQuery, selectedSpecialty, 'newest', openOnly);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'newest'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
              >
                <span>{t('sortNewest')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Specialty Chips Bar */}
        {dynamicSpecialties.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setSelectedSpecialty('all');
                updateQueryParams(searchQuery, 'all', sortBy, openOnly);
              }}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedSpecialty === 'all'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700'
              }`}
            >
              {t('allSpecialties')}
            </button>
            {dynamicSpecialties.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => {
                  setSelectedSpecialty(spec);
                  updateQueryParams(searchQuery, spec, sortBy, openOnly);
                }}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedSpecialty === spec
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30 ring-2 ring-cyan-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result Count Status */}
      <div className="flex items-center justify-between mb-6 px-1">
        <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-white font-mono">{filteredClinics.length}</strong> {t('clinicsAvailable')}
        </span>
        {(searchQuery || selectedSpecialty !== 'all' || openOnly || sortBy !== 'leastCrowded') && (
          <button
            onClick={resetFilters}
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{t('resetFilters')}</span>
          </button>
        )}
      </div>

      {/* Clinics Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} className="h-64 flex flex-col justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      ) : filteredClinics.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 px-4 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t('noClinicsFound')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            جرب تعديل كلمات البحث أو إزالة الفلاتر المحددة لعرض كافة العيادات المعتمدة.
          </p>
          <Button variant="secondary" onClick={resetFilters}>
            <RefreshCw className="w-4 h-4" />
            <span>{t('resetFilters')}</span>
          </Button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredClinics.map((clinic, index) => {
              const isLocked = isDemoClinicLocked(clinic) || (clinic.isDemo && demoLockedLocal);

              return (
                <motion.div
                  key={clinic.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                >
                  <Card
                    interactive
                    elevation="raised"
                    className={`h-full flex flex-col justify-between group transition-all duration-300 ${
                      isLocked
                        ? 'border-rose-500/40 bg-slate-900/40 opacity-90 hover:border-rose-500/70 hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]'
                        : 'hover:border-cyan-500/50'
                    }`}
                    onClick={() => {
                      if (isLocked) {
                        setLockNoticeModal('العيادة التجريبية مقفلة حالياً وممنوعة من الدخول بأمر الإدارة المركزية (الوضع التجاري مفعّل للعيادات الحقيقية فقط). يمكن فتحها مجدداً في أي وقت من لوحة التحكم العامة.');
                      } else {
                        onNavigate(`/book/${clinic.id}`);
                      }
                    }}
                  >
                    <div>
                      {/* Header: Verified / Locked / Live Serving Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="verified">
                          {t('verifiedBadge')}
                        </Badge>
                        
                        {isLocked ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                            <Lock className="w-3.5 h-3.5" />
                            <span>مقفلة وممنوعة من الدخول</span>
                          </span>
                        ) : clinic.isPaused ? (
                          <Badge variant="paused">
                            {t('clinicPausedTag')}
                          </Badge>
                        ) : (
                          <Badge variant="live">
                            <span>{t('nowServing')}</span>
                            <AnimatedNumber value={clinic.currentServingNumber || 0} />
                          </Badge>
                        )}
                      </div>

                      {/* Clinic Name & Specialty */}
                      <div className="flex items-start gap-4 mb-6">
                        <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-md p-2.5 overflow-hidden"
                          style={{ backgroundColor: `${clinic.brandColor || '#0ea5e9'}15` }}
                        >
                          {clinic.logoUrl ? (
                            <img
                              src={clinic.logoUrl}
                              alt={clinic.clinicName}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Building2 className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                            {clinic.clinicName}
                          </h3>
                          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {clinic.specialty}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between mt-auto">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
                        <span>متوسط الكشف: {formatNumber(clinic.avgConsultMinutes || 10)} د</span>
                      </span>

                      <Button
                        variant={isLocked ? 'secondary' : clinic.isPaused ? 'secondary' : 'glow'}
                        size="sm"
                        className={`pointer-events-none ${isLocked ? 'border-rose-500/40 text-rose-400 bg-rose-500/10' : ''}`}
                      >
                        <span>{isLocked ? 'ممنوعة من الدخول 🔒' : t('bookNow')}</span>
                        {!isLocked && <ArrowIcon className="w-4 h-4 transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Lock Notice Modal */}
      <Modal
        isOpen={lockNoticeModal !== null}
        onClose={() => setLockNoticeModal(null)}
        title={
          <div className="flex items-center gap-2 text-rose-400">
            <Lock className="w-5 h-5" />
            <span>العيادة مقفلة بأمر الإدارة</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            {lockNoticeModal}
          </p>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            حالة النظام: الوضع التجاري الصارم مفعّل لحماية بيانات واشتراكات العيادات الحقيقية.
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setLockNoticeModal(null)}>
              فهمت ذلك
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
