import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { 
  Clinic, 
  PublicClinic,
  QueueEntry, 
  bookQueueEntry, 
  subscribePublicClinic,
  getClinic,
  isDemoClinicLocked
} from '../lib/firebase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { 
  User, 
  Phone, 
  FileText, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle, 
  Building2, 
  Clock, 
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Lock
} from 'lucide-react';

interface BookingPageProps {
  clinicId: string;
  onNavigate: (path: string) => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({ clinicId, onNavigate }) => {
  const { t, isRtl, formatNumber } = useI18n();
  const [clinic, setClinic] = useState<PublicClinic | Clinic | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);

  // Form State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [visitReason, setVisitReason] = useState<string>('كشف واستشارة طبية');
  const [customReason, setCustomReason] = useState<string>('');
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  
  // Validation & Submission State
  const [phoneError, setPhoneError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [duplicateEntry, setDuplicateEntry] = useState<QueueEntry | null>(null);

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  const BackArrowIcon = isRtl ? ArrowRight : ArrowLeft;

  useEffect(() => {
    let isMounted = true;
    const unsub = subscribePublicClinic(clinicId, (data) => {
      if (!isMounted) return;
      if (data) {
        setClinic(data);
        setLoadingClinic(false);
      } else {
        getClinic(clinicId).then((c) => {
          if (!isMounted) return;
          if (c) setClinic(c);
          setLoadingClinic(false);
        }).catch(() => {
          if (isMounted) setLoadingClinic(false);
        });
      }
    }, () => {
      if (!isMounted) return;
      getClinic(clinicId).then((c) => {
        if (!isMounted) return;
        if (c) setClinic(c);
        setLoadingClinic(false);
      }).catch(() => {
        if (isMounted) setLoadingClinic(false);
      });
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [clinicId]);

  const reasonOptions = [
    { label: t('reasonCheckup'), value: 'كشف واستشارة طبية' },
    { label: t('reasonFollowup'), value: 'متابعة / إعادة كشف' },
    { label: t('reasonUrgent'), value: 'حالة عاجلة / ألم حاد' },
    { label: t('reasonCustom'), value: 'other' }
  ];

  const handleStep1Next = () => {
    const effectiveReason = visitReason === 'other' ? customReason.trim() : visitReason;
    if (!effectiveReason) return;
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (patientName.trim().length < 3) {
      setNameError(isRtl ? 'يرجى إدخال اسم ثلاثي صالح (٣ أحرف على الأقل)' : 'Please enter a valid patient name');
      return;
    }
    setNameError('');
    setCurrentStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = patientPhone.trim().replace(/\s+/g, '');
    
    // Strict phone format validation (digits, 8-15 chars)
    if (!/^[0-9+]{8,15}$/.test(cleanPhone)) {
      setPhoneError(isRtl ? 'يرجى إدخال رقم هاتف صحيح (مثال: 01012345678)' : 'Please enter a valid phone number');
      return;
    }
    setPhoneError('');
    setIsSubmitting(true);

    try {
      const effectiveReason = visitReason === 'other' ? (customReason.trim() || 'كشف طبي') : visitReason;
      const res = await bookQueueEntry(clinicId, {
        patientName: patientName.trim(),
        patientPhone: cleanPhone,
        visitReason: effectiveReason
      });

      // Save active ticket in local storage for navigation shortcut
      if (typeof window !== 'undefined') {
        localStorage.setItem('dawrak_last_active_ticket', JSON.stringify({
          clinicId,
          entryId: res.entryId,
          ticketNum: res.queueNumber
        }));
      }

      // Navigate to live tracker
      onNavigate(`/live/${clinicId}/${res.entryId}`);
    } catch (err: any) {
      console.error('Booking failed:', err);
      setIsSubmitting(false);

      if (err.duplicate && err.existingTicket) {
        setDuplicateEntry({
          id: err.existingTicket.entryId,
          queueNumber: err.existingTicket.queueNumber,
          patientName: patientName.trim(),
          patientPhone: cleanPhone,
          visitReason: visitReason === 'other' ? customReason.trim() : visitReason,
          status: 'waiting',
          isPriority: false,
          createdAt: new Date().toISOString()
        });
        return;
      }

      setPhoneError(err.message || (isRtl ? 'حدث خطأ أثناء حجز الدور، يرجى المحاولة ثانية' : 'Booking error, please retry'));
    }
  };

  if (loadingClinic) {
    return (
      <div className="min-h-screen pt-28 px-4 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500">جاري تحميل بيانات العيادة...</p>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen pt-28 px-4 max-w-xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">العيادة غير موجودة</h2>
        <Button onClick={() => onNavigate('/clinics')}>العودة لدليل العيادات</Button>
      </div>
    );
  }

  // Strict Demo Clinic Lock Gate
  if (isDemoClinicLocked(clinic)) {
    return (
      <div className="min-h-screen pt-28 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center p-8 rounded-3xl bg-slate-900 border border-rose-500/40 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">
            العيادة التجريبية مقفلة وممنوعة من الدخول
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            تم إقفال استقبال الحجوزات للعيادة التجريبية وتفعيل الوضع التجاري الصارم بواسطة الإدارة المركزية (سينقرا). لا يمكن للمرضى الحجز حتى يتم فتحها مجدداً من لوحة التحكم العامة.
          </p>
          <Button variant="glow" onClick={() => onNavigate('/clinics')} className="w-full font-bold">
            العودة لدليل العيادات المتاحة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 max-w-2xl mx-auto">
      {/* Clinic Header Banner */}
      <Card elevation="raised" className="mb-8">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center p-3 border border-slate-200 dark:border-slate-700 shadow-md shrink-0"
            style={{ backgroundColor: `${clinic.brandColor || '#0ea5e9'}15` }}
          >
            {clinic.logoUrl ? (
              <img src={clinic.logoUrl} alt={clinic.clinicName} className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="verified">{t('verifiedBadge')}</Badge>
              <Badge variant="live">
                <span>{t('nowServing')}</span>
                <span className="font-bold font-mono">{formatNumber(clinic.currentServingNumber || 0)}</span>
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
              {clinic.clinicName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {clinic.specialty}
            </p>
          </div>
        </div>
      </Card>

      {/* Clinic Paused Banner Notice */}
      {clinic.isPaused && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-start gap-3"
        >
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm mb-1">{t('clinicPausedNotice')}</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {clinic.pauseReason || 'العيادة في استراحة مؤقتة، يمكنك المحاولة لاحقاً.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Anti-Spam Duplicate Found Modal / Banner */}
      <AnimatePresence>
        {duplicateEntry && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 rounded-3xl bg-cyan-500/10 border-2 border-cyan-500/40 text-cyan-950 dark:text-cyan-100"
          >
            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 text-cyan-500 shrink-0" />
              <div>
                <h3 className="text-lg font-bold mb-1">{t('duplicateBookingTitle')}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                  {t('duplicateBookingDesc')}
                </p>
                <Button
                  variant="glow"
                  size="md"
                  onClick={() => onNavigate(`/live/${clinicId}/${duplicateEntry.id}`)}
                  className="font-bold"
                >
                  <span>{t('goToExistingLive')}</span>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-Step Booking Form Card */}
      {!duplicateEntry && (
        <Card elevation="raised" className="relative overflow-hidden">
          {/* Animated Step Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              <span className={currentStep >= 1 ? 'text-cyan-600 dark:text-cyan-400' : ''}>
                ١. {t('stepVisitReason')}
              </span>
              <span className={currentStep >= 2 ? 'text-cyan-600 dark:text-cyan-400' : ''}>
                ٢. {t('stepPatientName')}
              </span>
              <span className={currentStep >= 3 ? 'text-cyan-600 dark:text-cyan-400' : ''}>
                ٣. {t('stepPatientPhone')}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                animate={{ width: `${(currentStep / 3) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* STEP 1: VISIT REASON */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                {t('stepVisitReason')}
              </h2>

              <div className="grid grid-cols-1 gap-2.5">
                {reasonOptions.map((opt) => (
                  <motion.button
                    key={opt.value}
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setVisitReason(opt.value)}
                    className={`p-4 rounded-xl text-start text-sm font-bold border transition-all cursor-pointer flex items-center justify-between ${
                      visitReason === opt.value
                        ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-600 dark:text-cyan-300 ring-2 ring-cyan-500/20'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-cyan-500/40'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      visitReason === opt.value
                        ? 'border-cyan-500 bg-cyan-500 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {visitReason === opt.value && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </motion.button>
                ))}
              </div>

              {visitReason === 'other' && (
                <div className="pt-2">
                  <Input
                    label="اكتب سبب الزيارة باختصار"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="مثال: تبديل ضمادة، استلام تحليل..."
                    autoFocus
                  />
                </div>
              )}

              <div className="pt-6 flex justify-end">
                <Button
                  variant="glow"
                  size="md"
                  onClick={handleStep1Next}
                  disabled={visitReason === 'other' && !customReason.trim()}
                >
                  <span>{t('btnNext')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: PATIENT NAME */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('stepPatientName')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                تنبيه خصوصية: لن يظهر اسمك على شاشة الانتظار التلفزيونية إطلاقاً، بل يستخدم من قبل الطبيب في غرفة الكشف فقط.
              </p>

              <Input
                icon={<User className="w-4 h-4" />}
                placeholder={t('namePlaceholder')}
                value={patientName}
                onChange={(e) => {
                  setPatientName(e.target.value);
                  if (nameError) setNameError('');
                }}
                error={nameError}
                autoFocus
              />

              <div className="pt-6 flex items-center justify-between">
                <Button variant="ghost" size="md" onClick={() => setCurrentStep(1)}>
                  <BackArrowIcon className="w-4 h-4" />
                  <span>{t('btnBack')}</span>
                </Button>
                <Button variant="glow" size="md" onClick={handleStep2Next}>
                  <span>{t('btnNext')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PHONE NUMBER & ATOMIC CONFIRMATION */}
          {currentStep === 3 && (
            <motion.form
              onSubmit={handleFinalSubmit}
              initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {t('stepPatientPhone')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {t('phoneHint')}
              </p>

              <Input
                icon={<Phone className="w-4 h-4" />}
                placeholder={t('phonePlaceholder')}
                type="tel"
                value={patientPhone}
                onChange={(e) => {
                  setPatientPhone(e.target.value);
                  if (phoneError) setPhoneError('');
                }}
                error={phoneError}
                autoFocus
                dir="ltr"
                className="text-start font-mono"
              />

              <div className="pt-6 flex items-center justify-between">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="md" 
                  onClick={() => setCurrentStep(2)}
                  disabled={isSubmitting}
                >
                  <BackArrowIcon className="w-4 h-4" />
                  <span>{t('btnBack')}</span>
                </Button>
                <Button
                  type="submit"
                  variant="glow"
                  size="lg"
                  loading={isSubmitting}
                  disabled={isSubmitting || clinic.isPaused}
                  className="font-black"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>{t('btnConfirmBooking')}</span>
                </Button>
              </div>
            </motion.form>
          )}
        </Card>
      )}
    </div>
  );
};
