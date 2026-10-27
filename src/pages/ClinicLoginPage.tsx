import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { 
  seedDemoClinic, 
  isDemoClinicLocked, 
  subscribeDemoClinicLock, 
  auth, 
  hashPin, 
  getClinic, 
  db 
} from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { SynqraLogo } from '../components/ui/SynqraLogo';
import { 
  Lock, 
  Phone, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  Sparkles,
  Building2,
  CheckCircle2,
  QrCode
} from 'lucide-react';

interface ClinicLoginPageProps {
  onNavigate: (path: string) => void;
}

export const ClinicLoginPage: React.FC<ClinicLoginPageProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const { setWorld } = useTheme();

  // Set world theme to clinic command center
  useEffect(() => {
    setWorld('clinic');
    return () => setWorld('patient');
  }, [setWorld]);

  // Support both clinic slug/code (e.g. demo-clinic-cairo) AND phone number (e.g. 01099887766)
  const [identifier, setIdentifier] = useState('demo-clinic-cairo');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasErrorShake, setHasErrorShake] = useState(false);
  const [isDemoLocked, setIsDemoLocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first PIN input box on mount & seed demo clinic & subscribe to demo lock
  useEffect(() => {
    seedDemoClinic().catch((e) => console.warn('Demo clinic seed check:', e));
    const unsubLock = subscribeDemoClinicLock((locked) => {
      setIsDemoLocked(locked);
    });
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
    return () => unsubLock();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    if (errorMsg) setErrorMsg('');

    // Accept only numeric digit
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned) {
      const next = [...pinDigits];
      next[index] = '';
      setPinDigits(next);
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);

    // Auto-advance focus to next box
    if (index < 3 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all 4 boxes are filled -> Auto-attempt login
    const fullPin = next.join('');
    if (fullPin.length === 4) {
      attemptLogin(identifier, fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 4);
    if (!pastedData) return;

    const next = ['', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      next[i] = pastedData[i];
    }
    setPinDigits(next);

    const nextFocusIndex = Math.min(3, pastedData.length);
    inputRefs.current[nextFocusIndex]?.focus();

    if (pastedData.length === 4) {
      attemptLogin(identifier, pastedData);
    }
  };

  const attemptLogin = async (identifierInput: string, pinInput: string) => {
    const raw = identifierInput.trim();
    if (!raw || pinInput.length !== 4) return;

    setIsVerifying(true);
    setErrorMsg('');

    try {
      // 1. Try server endpoint first
      try {
        const response = await fetch('/api/clinic-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: raw, pin: pinInput })
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.success && data.clinicId) {
            if (data.customToken) {
              await signInWithCustomToken(auth, data.customToken).catch(() => {});
            }
            sessionStorage.setItem(`synqra_staff_auth_${data.clinicId}`, 'true');
            onNavigate(`/clinic/${data.clinicId}/dashboard`);
            return;
          }
        }
      } catch (srvErr) {
        console.warn('Server login skipped, proceeding to resilient direct auth:', srvErr);
      }

      // 2. Resilient Direct Verification (Demo clinic fast-path)
      if (
        (raw === 'demo-clinic-cairo' || raw === 'demo-clinic' || raw === '01012345678') &&
        pinInput === '1234'
      ) {
        await seedDemoClinic().catch(() => {});
        sessionStorage.setItem('synqra_staff_auth_demo-clinic-cairo', 'true');
        onNavigate('/clinic/demo-clinic-cairo/dashboard');
        return;
      }

      // 3. Resilient Direct Verification by clinic slug / ID
      const hashedInput = await hashPin(pinInput);
      const clinic = await getClinic(raw);
      if (clinic) {
        if (clinic.pinHash === hashedInput || (clinic.id === 'demo-clinic-cairo' && pinInput === '1234')) {
          sessionStorage.setItem(`synqra_staff_auth_${clinic.id}`, 'true');
          onNavigate(`/clinic/${clinic.id}/dashboard`);
          return;
        }
      }

      // 4. Resilient Direct Verification by phone number query
      if (/^[0-9+]+$/.test(raw)) {
        const qClinics = query(collection(db, 'clinics'), where('phoneNumber', '==', raw));
        const qSnap = await getDocs(qClinics);
        if (!qSnap.empty) {
          const matchedDoc = qSnap.docs[0];
          const matchedData = matchedDoc.data();
          if (matchedData.pinHash === hashedInput || (matchedDoc.id === 'demo-clinic-cairo' && pinInput === '1234')) {
            sessionStorage.setItem(`synqra_staff_auth_${matchedDoc.id}`, 'true');
            onNavigate(`/clinic/${matchedDoc.id}/dashboard`);
            return;
          }
        }
      }

      throw new Error('رمز الدخول (PIN) أو كود العيادة غير صحيح');
    } catch (err: unknown) {
      console.warn('Login verification failed:', err);
      setIsVerifying(false);
      const msg = err instanceof Error ? err.message : t('invalidCredentials');
      setErrorMsg(msg);
      setHasErrorShake(true);
      setTimeout(() => setHasErrorShake(false), 500);

      // Clear PIN boxes for retry
      setPinDigits(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptLogin(identifier, pinDigits.join(''));
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] py-6 sm:py-10 px-4 sm:px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-5">
          <SynqraLogo size="md" className="justify-center mb-3" />
          <Badge variant="live" className="mb-2 font-bold text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>بوابة الإدارة والتحكم الطبي</span>
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {t('staffLoginTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('staffLoginSubtitle')}
          </p>
        </div>

        {/* Demo Fast-Access Helper Banner */}
        <div className={`mb-6 p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md backdrop-blur-md ${
          isDemoLocked
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
        }`}>
          <div className="flex items-center gap-2 text-start">
            {isDemoLocked ? <Lock className="w-4 h-4 text-rose-400 shrink-0" /> : <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span>
              {isDemoLocked 
                ? 'العيادة التجريبية مقفلة وممنوعة من الدخول (الوضع التجاري مفعّل)' 
                : <span>متاح الدخول بـ <strong className="text-white">كود العيادة</strong> أو <strong className="text-white">رقم الهاتف</strong> (الرمز السري: <strong className="text-cyan-300 font-mono font-bold text-sm">1234</strong>)</span>}
            </span>
          </div>
          {!isDemoLocked && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                بيئة تجريبية جاهزة ✓
              </span>
            </div>
          )}
        </div>

        {/* Login Card */}
        <Card elevation="raised" className="border-slate-300 dark:border-slate-700/80 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dual Identifier Input: Clinic Code OR Phone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span>كود العيادة أو رقم الهاتف المعتمد</span>
                </label>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-full">
                  متاح الطريقتين
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="مثال: demo-clinic-cairo أو 01099887766"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all pl-10 text-left"
                  required
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  {identifier.startsWith('01') || /^[0-9+]+$/.test(identifier) ? (
                    <Phone className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Building2 className="w-4 h-4 text-cyan-500" />
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                يمكن لموظفي العيادة أو الطبيب الدخول بكود العيادة (Slug) أو رقم الهاتف المسجل لدى الإدارة.
              </p>
            </div>

            {/* STRICT AUTO-ADVANCING MULTI-BOX PIN INPUT */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-start flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{t('enterPin')}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">٤ أرقام سرية</span>
              </label>

              <motion.div
                animate={hasErrorShake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-center gap-3 sm:gap-4 my-2"
                dir="ltr"
              >
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={pinDigits[index]}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={`w-14 h-16 sm:w-16 sm:h-18 rounded-2xl text-center text-2xl font-black font-mono transition-all duration-200 outline-none select-none bg-slate-900/90 text-white border-2 shadow-inner ${
                      errorMsg
                        ? 'border-rose-500 ring-4 ring-rose-500/20'
                        : pinDigits[index]
                        ? 'border-cyan-400 ring-4 ring-cyan-500/20 bg-slate-800'
                        : 'border-slate-700 hover:border-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20'
                    }`}
                  />
                ))}
              </motion.div>

              {errorMsg && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mt-1 justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isVerifying}
              disabled={isVerifying || !identifier.trim() || pinDigits.join('').length !== 4}
              className="w-full font-black text-base py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl shadow-cyan-600/30 border border-cyan-400/50 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-5 h-5 text-white" />
              <span>{isVerifying ? t('loggingIn') : t('loginBtn')}</span>
            </Button>

            {/* Quick Demo Fill Shortcut Buttons */}
            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-2.5 text-center">
              <button
                type="button"
                onClick={() => {
                  setIdentifier('demo-clinic-cairo');
                  setPinDigits(['1', '2', '3', '4']);
                  attemptLogin('demo-clinic-cairo', '1234');
                }}
                className="text-xs font-bold text-cyan-200 hover:text-white bg-slate-800/90 hover:bg-cyan-600 border border-slate-700 hover:border-cyan-400 p-3 rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4 text-cyan-400 group-hover:text-white" />
                <span>تجربة بكود العيادة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('01099887766');
                  setPinDigits(['1', '2', '3', '4']);
                  attemptLogin('01099887766', '1234');
                }}
                className="text-xs font-bold text-emerald-200 hover:text-white bg-slate-800/90 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-400 p-3 rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400 group-hover:text-white" />
                <span>تجربة برقم الهاتف</span>
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
