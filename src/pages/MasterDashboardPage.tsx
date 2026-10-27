import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { 
  Clinic, 
  AuditLog, 
  subscribeClinics, 
  createClinic, 
  updateClinic, 
  hashPin, 
  logAudit,
  subscribeAuditLogs,
  seedDemoClinic,
  auth,
  toggleDemoClinicVisibility,
  subscribeDemoClinicLock,
  resetDemoClinicQueue,
  deleteClinic,
  verifyMasterPassword,
  updateMasterPassword
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { SynqraLogo } from '../components/ui/SynqraLogo';
import { 
  ShieldAlert, 
  Lock, 
  Unlock,
  Building2, 
  Plus, 
  Copy, 
  Check, 
  Download, 
  Calendar, 
  RefreshCw, 
  PauseCircle, 
  PlayCircle, 
  KeyRound, 
  History, 
  Search, 
  Clock, 
  Share2, 
  MessageCircle, 
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Edit,
  Eye,
  EyeOff,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Stethoscope,
  Tv,
  Users,
  LayoutDashboard,
  Trash2,
  QrCode,
  Smartphone,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

export const SECRET_MASTER_SLUG = 'k8x9m2q8v4p1w5z0c3j6n8r2y';
const AUTHORIZED_OWNER_EMAIL = 'saga.studio666@gmail.com';

export interface ClinicThemeMix {
  id: string;
  name: string;
  nameEn: string;
  primaryColor: string;
  secondaryColor: string;
  accentBg: string;
  borderClass: string;
  badge: string;
  description: string;
}

export const CLINIC_THEME_MIXES: ClinicThemeMix[] = [
  {
    id: 'gold-obsidian',
    name: 'الأسود والأصفر الذهبي الملكي',
    nameEn: 'Obsidian & Gold',
    primaryColor: '#f59e0b',
    secondaryColor: '#090d16',
    accentBg: 'from-amber-500/20 via-slate-900 to-black',
    borderClass: 'border-amber-500/40 hover:border-amber-400',
    badge: 'الأكثر فخامة',
    description: 'تباين أوبسيديان داكن فاخر مع توهج ذهبي جذاب للمراكز الراقية'
  },
  {
    id: 'cyber-cyan',
    name: 'سايبر نيون تيركواز المستقبلي',
    nameEn: 'Cyber Neon Cyan',
    primaryColor: '#06b6d4',
    secondaryColor: '#041624',
    accentBg: 'from-cyan-500/20 via-slate-900 to-black',
    borderClass: 'border-cyan-500/40 hover:border-cyan-400',
    badge: 'طبي مستقبلي',
    description: 'إشعاع تقني ذكي متطور لعيادات العيون والأسنان الحديثة'
  },
  {
    id: 'surgical-emerald',
    name: 'الزمرد الجراحي الطبي المعتمد',
    nameEn: 'Surgical Emerald',
    primaryColor: '#10b981',
    secondaryColor: '#032117',
    accentBg: 'from-emerald-500/20 via-slate-900 to-black',
    borderClass: 'border-emerald-500/40 hover:border-emerald-400',
    badge: 'طبي موثوق',
    description: 'هدوء نفسي وموثوقية عالية مستوحاة من غرف الجراحة الراقية'
  },
  {
    id: 'royal-amethyst',
    name: 'الجمشت البنفسجي الفاخر',
    nameEn: 'Royal Amethyst',
    primaryColor: '#8b5cf6',
    secondaryColor: '#170b2e',
    accentBg: 'from-purple-500/20 via-slate-900 to-black',
    borderClass: 'border-purple-500/40 hover:border-purple-400',
    badge: 'تجميل وجلدية',
    description: 'لمسة رفيعة ملكية مخصصة لمراكز التجميل والجلدية والليزر'
  },
  {
    id: 'sunset-amber',
    name: 'العنبر الشمسي الدافئ',
    nameEn: 'Sunset Amber',
    primaryColor: '#f97316',
    secondaryColor: '#260c05',
    accentBg: 'from-orange-500/20 via-slate-900 to-black',
    borderClass: 'border-orange-500/40 hover:border-orange-400',
    badge: 'طاقة وحيوية',
    description: 'دفء وحميمية مريحة لعيادات الأطفال والباطنة والتغذية'
  },
  {
    id: 'rose-ruby',
    name: 'روز كوارتز وياقوت متألق',
    nameEn: 'Rose Quartz Ruby',
    primaryColor: '#f43f5e',
    secondaryColor: '#280713',
    accentBg: 'from-rose-500/20 via-slate-900 to-black',
    borderClass: 'border-rose-500/40 hover:border-rose-400',
    badge: 'عصري وناعم',
    description: 'أناقة عصرية لافتة للأنظار وإشراق مريح للمرضى'
  },
  {
    id: 'electric-cobalt',
    name: 'الكوبالت التيتانيوم السحابي',
    nameEn: 'Electric Cobalt',
    primaryColor: '#3b82f6',
    secondaryColor: '#081735',
    accentBg: 'from-blue-500/20 via-slate-900 to-black',
    borderClass: 'border-blue-500/40 hover:border-blue-400',
    badge: 'تقني قياسي',
    description: 'المظهر القياسي العالمي المعتمد لأكبر المستشفيات والمجمعات'
  },
  {
    id: 'phosphor-lime',
    name: 'الليموني الفوسفوري العصري',
    nameEn: 'Phosphor Lime',
    primaryColor: '#84cc16',
    secondaryColor: '#132104',
    accentBg: 'from-lime-500/20 via-slate-900 to-black',
    borderClass: 'border-lime-500/40 hover:border-lime-400',
    badge: 'حداثة ونشاط',
    description: 'طاقة عصرية شبابية لعيادات العلاج الطبيعي والتأهيل والتغذية'
  }
];

interface MasterDashboardPageProps {
  onNavigate: (path: string) => void;
}

export const MasterDashboardPage: React.FC<MasterDashboardPageProps> = ({ onNavigate }) => {
  const { t, formatNumber } = useI18n();
  const { setWorld } = useTheme();

  useEffect(() => {
    setWorld('master');
    return () => setWorld('patient');
  }, [setWorld]);

  // Auth State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [emailInput, setEmailInput] = useState('saga.studio666@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Master Auth State
  const [isLocalMasterAuth, setIsLocalMasterAuth] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('synqra_master_session') === 'true';
    }
    return false;
  });
  const [activeMasterUsername, setActiveMasterUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('synqra_master_username') || 'synqra-master';
    }
    return 'synqra-master';
  });

  // Master Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newMasterUsername, setNewMasterUsername] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('synqra_master_username') || 'synqra-master';
    }
    return 'synqra-master';
  });
  const [currentMasterPass, setCurrentMasterPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmMasterPass, setConfirmMasterPass] = useState('');
  const [passChangeError, setPassChangeError] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState('');
  const [isSavingMasterPass, setIsSavingMasterPass] = useState(false);

  // Clinics & Filter State
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'paused' | 'expiring'>('all');
  const [quickAccessClinicId, setQuickAccessClinicId] = useState<string>('');

  // "Add Clinic" Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCustomSlug, setNewCustomSlug] = useState('');
  const [newCustomPin, setNewCustomPin] = useState('');
  const [newAvgConsultMinutes, setNewAvgConsultMinutes] = useState(10);
  const [newSubscriptionDays, setNewSubscriptionDays] = useState(7);
  const [newBrandColor, setNewBrandColor] = useState('#0ea5e9');
  const [isCreatingClinic, setIsCreatingClinic] = useState(false);

  // "Edit Clinic" Modal State
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [editClinicName, setEditClinicName] = useState('');
  const [editDoctorName, setEditDoctorName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvgMinutes, setEditAvgMinutes] = useState(10);
  const [editBrandColor, setEditBrandColor] = useState('#0ea5e9');
  const [editStatus, setEditStatus] = useState<'trial' | 'active' | 'paused'>('active');
  const [editCustomPin, setEditCustomPin] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Onboarding / Delivery Package Modal
  const [onboardingPackage, setOnboardingPackage] = useState<{
    clinicId: string;
    clinicName: string;
    doctorName?: string;
    phone: string;
    plainPin: string;
    bookingUrl: string;
  } | null>(null);

  // Audit Logs Modal
  const [selectedAuditClinic, setSelectedAuditClinic] = useState<Clinic | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Regenerated PIN alert
  const [regeneratedPinInfo, setRegeneratedPinInfo] = useState<{ clinicName: string; pin: string } | null>(null);

  // WhatsApp Kit Modal
  const [whatsAppModalClinic, setWhatsAppModalClinic] = useState<Clinic | null>(null);

  // Delete Clinic Modal State
  const [deletingClinic, setDeletingClinic] = useState<Clinic | null>(null);
  const [isDeletingClinic, setIsDeletingClinic] = useState(false);

  // View Mode: Table vs Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Floating Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Copy feedback tracking
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Poster Canvas Ref
  const posterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Subscribe to all clinics
  useEffect(() => {
    seedDemoClinic().catch(() => {});
    const unsub = subscribeClinics((data) => {
      setClinics(data);
    });
    return () => unsub();
  }, []);

  // Demo Clinic Reference & Lock State
  const [demoLockedState, setDemoLockedState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('synqra_demo_clinic_locked') === 'true';
    }
    return false;
  });

  const demoClinic = clinics.find((c) => c.isDemo || c.id === 'demo-clinic-cairo' || c.id === 'demo-clinic');
  const isDemoClinicLocked = demoLockedState || Boolean(demoClinic?.isDemoHidden || demoClinic?.isPaused || demoClinic?.subscriptionStatus === 'paused');

  useEffect(() => {
    const unsub = subscribeDemoClinicLock((locked) => {
      setDemoLockedState(locked);
    });
    return () => unsub();
  }, []);

  // Listen to audit logs for selected clinic
  useEffect(() => {
    if (!selectedAuditClinic) return;
    const unsub = subscribeAuditLogs(selectedAuditClinic.id, (logs) => {
      setAuditLogs(logs);
    });
    return () => unsub();
  }, [selectedAuditClinic]);

  // Handle Master Login (Fast, Easy, and Secure with Default Passkey and Sync)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');

    const inputUser = emailInput.trim();
    const inputPass = passwordInput.trim();

    try {
      // 1. Direct master passkey / synced custom hash verification
      const isPassValid = await verifyMasterPassword(inputPass);
      const isIdentifierMatch = 
        inputUser.toLowerCase() === AUTHORIZED_OWNER_EMAIL.toLowerCase() ||
        inputUser.toLowerCase() === 'synqra-master' ||
        inputUser.toLowerCase() === activeMasterUsername.toLowerCase();

      if (isPassValid && isIdentifierMatch) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('synqra_master_session', 'true');
        }
        setIsLocalMasterAuth(true);
        // Also attempt background Firebase Auth session if possible
        if (inputUser.includes('@')) {
          signInWithEmailAndPassword(auth, inputUser, inputPass).catch(() => {});
        }
        return;
      }

      // 2. Fallback: Firebase Auth check if user entered an email
      if (inputUser.includes('@')) {
        try {
          const cred = await signInWithEmailAndPassword(auth, inputUser, inputPass);
          if (cred.user.email === AUTHORIZED_OWNER_EMAIL) {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('synqra_master_session', 'true');
            }
            setIsLocalMasterAuth(true);
            return;
          } else {
            await signOut(auth);
            setAuthError('حساب غير مصرح له بالدخول للوحة التحكم الرئيسية للمالك');
            return;
          }
        } catch (firebaseErr: unknown) {
          console.warn('Firebase auth check note:', firebaseErr);
        }
      }

      setAuthError('بيانات الدخول غير صحيحة. كلمة المرور الافتراضية للتحكم العام: SynqraMaster2026!');
    } catch (err: unknown) {
      setAuthError(`خطأ في تسجيل الدخول: ${(err as Error)?.message || 'يرجى إعادة المحاولة'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('synqra_master_session');
    }
    setIsLocalMasterAuth(false);
    try {
      await signOut(auth);
    } catch {}
  };

  const isAuthorized = Boolean((currentUser && currentUser.email === AUTHORIZED_OWNER_EMAIL) || isLocalMasterAuth);

  // Copy with feedback
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Master Password & Username Update with full synchronization (Firestore + LocalStorage + Auth)
  const handleUpdateMasterPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError('');
    setPassChangeSuccess('');

    if (newMasterPass.length < 4) {
      setPassChangeError('كلمة المرور الجديدة يجب أن تكون 4 خانات على الأقل');
      return;
    }

    if (newMasterPass !== confirmMasterPass) {
      setPassChangeError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    // Verify current password first
    const isCurrentValid = await verifyMasterPassword(currentMasterPass);
    if (!isCurrentValid) {
      setPassChangeError('كلمة المرور الحالية غير صحيحة');
      return;
    }

    setIsSavingMasterPass(true);
    try {
      const updatedUser = newMasterUsername.trim() || activeMasterUsername;
      await updateMasterPassword(newMasterPass, updatedUser);
      setActiveMasterUsername(updatedUser);

      // Also sync to Firebase Auth if active Firebase user session exists
      if (auth.currentUser && auth.currentUser.email === AUTHORIZED_OWNER_EMAIL) {
        try {
          const credential = EmailAuthProvider.credential(auth.currentUser.email, currentMasterPass);
          await reauthenticateWithCredential(auth.currentUser, credential);
          await updatePassword(auth.currentUser, newMasterPass);
        } catch (firebaseErr) {
          console.warn('Firebase Auth password sync note:', firebaseErr);
        }
      }

      setPassChangeSuccess('تم تحديث وتشفير بيانات المالك ومزامنتها سحابياً ومحلياً بنجاح!');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setCurrentMasterPass('');
        setNewMasterPass('');
        setConfirmMasterPass('');
        setPassChangeSuccess('');
      }, 1800);
    } catch (err: unknown) {
      setPassChangeError((err as Error)?.message || 'حدث خطأ أثناء تحديث كلمة المرور');
    } finally {
      setIsSavingMasterPass(false);
    }
  };

  // Toggle Demo Clinic Visibility & Entry Lock
  const handleToggleDemoClinic = async () => {
    const nextLocked = !isDemoClinicLocked;
    setDemoLockedState(nextLocked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('synqra_demo_clinic_locked', String(nextLocked));
      window.dispatchEvent(new CustomEvent('synqra:demo-lock-change', { detail: { locked: nextLocked } }));
    }
    await toggleDemoClinicVisibility(nextLocked);
    if (demoClinic) {
      await logAudit(
        demoClinic.id,
        nextLocked ? 'LOCK_DEMO_CLINIC' : 'UNLOCK_DEMO_CLINIC',
        'MASTER_ADMIN',
        nextLocked ? 'Locked demo clinic and blocked entry (Commercial Mode)' : 'Unlocked demo clinic for public access'
      );
    }
  };

  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const handleResetDemo = async () => {
    setIsResettingDemo(true);
    try {
      await resetDemoClinicQueue();
      showToast('تم إعادة ضبط وتصفير قائمة الطابور للعيادة التجريبية بنجاح.', 'success');
    } catch (err) {
      console.error(err);
      showToast('فشل تصفير طابور العيادة التجريبية', 'error');
    } finally {
      setIsResettingDemo(false);
    }
  };

  const handleLaunchDemoStaff = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('synqra_staff_auth_demo-clinic-cairo', 'true');
    }
    onNavigate('/clinic/demo-clinic-cairo/dashboard');
  };

  // Create Clinic Flow
  const handleCreateClinicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicName.trim() || !newPhone.trim()) return;

    setIsCreatingClinic(true);
    try {
      // 1. Slug handling: use custom slug if provided, else generate
      let targetClinicId = newCustomSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      if (!targetClinicId) {
        const randomSuffix = Math.random().toString(36).substring(2, 9);
        targetClinicId = `clinic_${randomSuffix}`;
      }

      // 2. PIN handling: custom or random 4-digit
      const plainPin = newCustomPin.trim() || Math.floor(1000 + Math.random() * 9000).toString();
      const pinHash = await hashPin(plainPin);

      // 3. Subscription expiry
      const now = new Date();
      const trialEnd = new Date(now.getTime() + newSubscriptionDays * 24 * 60 * 60 * 1000);

      const clinicPayload: Omit<Clinic, 'id'> = {
        clinicName: newClinicName.trim(),
        doctorName: newDoctorName.trim() || '',
        specialty: newSpecialty.trim() || 'عيادة طبية متخصصة',
        phoneNumber: newPhone.trim(),
        brandColor: newBrandColor,
        logoUrl: '/icon.svg',
        pinHash,
        currentServingNumber: 0,
        avgConsultMinutes: newAvgConsultMinutes || 10,
        subscriptionStatus: newSubscriptionDays <= 7 ? 'trial' : 'active',
        subscriptionEndsAt: trialEnd.toISOString(),
        isPaused: false,
        pauseReason: '',
        isDemo: false,
        createdAt: now.toISOString()
      };

      await createClinic(clinicPayload, targetClinicId);
      await logAudit(targetClinicId, 'CREATE_CLINIC', 'MASTER_ADMIN', `Created clinic: ${newClinicName.trim()} with PIN`);

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dawrak.live';
      const bookingUrl = `${origin}/book/${targetClinicId}`;

      // Open Onboarding Package
      setOnboardingPackage({
        clinicId: targetClinicId,
        clinicName: newClinicName.trim(),
        doctorName: newDoctorName.trim(),
        phone: newPhone.trim(),
        plainPin,
        bookingUrl
      });

      // Reset form
      setNewClinicName('');
      setNewDoctorName('');
      setNewSpecialty('');
      setNewPhone('');
      setNewCustomSlug('');
      setNewCustomPin('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Create clinic error:', err);
    } finally {
      setIsCreatingClinic(false);
    }
  };

  // Open Edit Clinic Modal
  const handleOpenEdit = (c: Clinic) => {
    setEditingClinic(c);
    setEditClinicName(c.clinicName);
    setEditDoctorName(c.doctorName || '');
    setEditSpecialty(c.specialty);
    setEditPhone(c.phoneNumber);
    setEditAvgMinutes(c.avgConsultMinutes || 10);
    setEditBrandColor(c.brandColor || '#0ea5e9');
    setEditStatus(c.subscriptionStatus);
    setEditCustomPin('');
  };

  // Save Edit Clinic
  const handleSaveClinicEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClinic) return;

    setIsSavingEdit(true);
    try {
      const updates: Partial<Clinic> = {
        clinicName: editClinicName.trim(),
        doctorName: editDoctorName.trim() || '',
        specialty: editSpecialty.trim(),
        phoneNumber: editPhone.trim(),
        avgConsultMinutes: editAvgMinutes,
        brandColor: editBrandColor,
        subscriptionStatus: editStatus
      };

      if (editCustomPin.trim()) {
        updates.pinHash = await hashPin(editCustomPin.trim());
      }

      await updateClinic(editingClinic.id, updates);
      await logAudit(editingClinic.id, 'EDIT_CLINIC_PROFILE', 'MASTER_ADMIN', 'Updated clinic settings from Master Dashboard');
      setEditingClinic(null);
    } catch (err) {
      console.error('Save edit clinic error:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick Actions
  const handleActivate = async (c: Clinic) => {
    try {
      await updateClinic(c.id, { 
        subscriptionStatus: 'active',
        isPaused: false,
        pauseReason: ''
      });
      if (c.isDemo || c.id === 'demo-clinic-cairo' || c.id === 'demo-clinic') {
        setDemoLockedState(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('synqra_demo_clinic_locked', 'false');
          window.dispatchEvent(new CustomEvent('synqra:demo-lock-change', { detail: { locked: false } }));
        }
      }
      await logAudit(c.id, 'ACTIVATE_SUBSCRIPTION', 'MASTER_ADMIN', 'Activated clinic subscription');
      showToast(`تم تفعيل اشتراك عيادة "${c.clinicName}" بنجاح`, 'success');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تفعيل الاشتراك', 'error');
    }
  };

  const handlePause = async (c: Clinic) => {
    try {
      await updateClinic(c.id, { 
        subscriptionStatus: 'paused',
        isPaused: true,
        pauseReason: 'تم الإيقاف بواسطة الإدارة المركزية'
      });
      if (c.isDemo || c.id === 'demo-clinic-cairo' || c.id === 'demo-clinic') {
        setDemoLockedState(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('synqra_demo_clinic_locked', 'true');
          window.dispatchEvent(new CustomEvent('synqra:demo-lock-change', { detail: { locked: true } }));
        }
      }
      await logAudit(c.id, 'PAUSE_SUBSCRIPTION', 'MASTER_ADMIN', 'Paused clinic subscription');
      showToast(`تم إيقاف اشتراك عيادة "${c.clinicName}" مؤقتاً`, 'info');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء إيقاف الاشتراك', 'error');
    }
  };

  const handleExtendDays = async (c: Clinic, days: number) => {
    try {
      const currentEnd = c.subscriptionEndsAt ? new Date(c.subscriptionEndsAt).getTime() : Date.now();
      const base = Math.max(Date.now(), currentEnd);
      const newEnd = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

      await updateClinic(c.id, { 
        subscriptionEndsAt: newEnd, 
        subscriptionStatus: 'active',
        isPaused: false
      });
      await logAudit(c.id, 'EXTEND_SUBSCRIPTION', 'MASTER_ADMIN', `Extended subscription by +${days} days`);
      showToast(`تم تمديد اشتراك "${c.clinicName}" لمدة +${days} يوماً بنجاح`, 'success');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تمديد الاشتراك', 'error');
    }
  };

  const handleRegeneratePin = async (c: Clinic) => {
    try {
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      const newHash = await hashPin(newPin);
      await updateClinic(c.id, { pinHash: newHash });
      await logAudit(c.id, 'REGENERATE_PIN', 'MASTER_ADMIN', `Regenerated PIN to: ${newPin}`);
      setRegeneratedPinInfo({ clinicName: c.clinicName, pin: newPin });
      showToast(`تم توليد وتشفير رمز PIN جديد: ${newPin}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('فشل توليد رمز PIN جديد', 'error');
    }
  };

  // Delete Clinic Handler
  const handleConfirmDeleteClinic = async () => {
    if (!deletingClinic) return;
    setIsDeletingClinic(true);
    const targetName = deletingClinic.clinicName;
    const targetId = deletingClinic.id;
    try {
      await deleteClinic(targetId);
      setClinics((prev) => prev.filter((item) => item.id !== targetId));
      showToast(`تم حذف عيادة "${targetName}" وكافة بياناتها نهائياً`, 'info');
      setDeletingClinic(null);
    } catch (err) {
      console.error('Delete clinic error:', err);
      showToast('حدث خطأ أثناء محاولة حذف العيادة من السحاب', 'error');
    } finally {
      setIsDeletingClinic(false);
    }
  };

  // Download High-Resolution Printable QR Poster
  const handleDownloadQrPoster = async (clinicData: { clinicName: string; bookingUrl: string }) => {
    const canvas = posterCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 1600;

    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1600);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.5, '#0b1329');
    bgGrad.addColorStop(1, '#030712');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1600);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 12;
    ctx.strokeRect(40, 40, 1120, 1520);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(clinicData.clinicName, 600, 180);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('احجز دورك الآن وتابع تقدم الطابور لحظياً من هاتفك', 600, 240);

    const qrDataUrl = await QRCode.toDataURL(clinicData.bookingUrl, {
      width: 600,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => { qrImg.onload = resolve; });

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(260, 360, 680, 680, 40);
    ctx.fill();

    ctx.drawImage(qrImg, 300, 400, 600, 600);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('امسح الرمز بكاميرا هاتفك للدخول الفوري', 600, 1160);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 28px sans-serif';
    ctx.fillText('لا حاجة لتحميل أي تطبيق • متوافق مع كافة الهواتف الذكية', 600, 1220);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(160, 1280, 880, 90, 20);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(clinicData.bookingUrl, 600, 1335);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('⚡ SYNQRA • DAWRAK LIVE ⚡', 600, 1470);

    const link = document.createElement('a');
    link.download = `Dawrak_Live_Poster_${clinicData.clinicName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // WhatsApp Kit Message Templates
  const getWhatsAppTemplates = (c: Clinic) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dawrak.live';
    const bookingUrl = `${origin}/book/${c.id}`;
    const staffLoginUrl = `${origin}/clinic/login`;
    const displayUrl = `${origin}/clinic/${c.id}/display`;

    return {
      welcome: 
`⚡ ⟦ ＳＹＮＱＲＡ™ ⟧ ⚡
منظومة دورك لايف (Dawrak Live) للحلول الطبية الذكية
──────────────────────
مرحباً دكتور / إدارة ${c.clinicName}،
يسعدنا تفعيل اشتراككم في المنظومة. إليكم بيانات الربط والتشغيل الرسمية:

📋 بيانات الدخول إلى لوحة تحكم السكرتارية:
• رابط الدخول: ${staffLoginUrl}
• رقم الهاتف المعتمد: ${c.phoneNumber}
• كود العيادة (Slug): ${c.id}
• رمز المرور السري (PIN): (مسجل لديكم في إشعار التفعيل)

🔗 رابط حجز المرضى العام الخاص بعيادتكم:
${bookingUrl}

📺 لتشغيل شاشة الانتظار التلفزيونية في صالة الانتظار:
${displayUrl}

──────────────────────
📞 الدعم الفني وإدارة المنظومة: 01225161076
مع تحيات فريق سينقرا للحلول السحابية.`,

      renewal:
`⚡ ⟦ ＳＹＮＱＲＡ™ ⟧ ⚡
تنبيه تجديد اشتراك دورك لايف:
مرحباً إدارة ${c.clinicName}،
نود إحاطتكم بأن اشتراك عيادتكم ينتهي بتاريخ ${new Date(c.subscriptionEndsAt || Date.now()).toLocaleDateString('ar-EG')}.
لضمان استمرار البث الصوتي والشاشات دون انقطاع، يرجى التواصل معنا عبر واتساب 01225161076 للتجديد الفوري.`,

      qrPoster:
`⚡ ⟦ ＳＹＮＱＲＡ™ ⟧ ⚡
رابط الحجز الإلكتروني المباشر لعيادة ${c.clinicName}:
${bookingUrl}
يمكنكم نشره للمرضى أو طباعة بوستر الـ QR المعتمد لتعليقه في مدخل العيادة.`
    };
  };

  // Expiring soon criteria: within 3 days
  const isExpiringSoon = (c: Clinic) => {
    if (c.isDemo || c.subscriptionStatus === 'paused') return false;
    if (!c.subscriptionEndsAt) return false;
    const diffDays = (new Date(c.subscriptionEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  };

  // Filtered Clinics
  const filteredClinics = clinics
    .filter((c) => {
      const matchSearch = 
        searchQuery === '' ||
        c.clinicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phoneNumber.includes(searchQuery) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'active') return c.subscriptionStatus === 'active';
      if (statusFilter === 'trial') return c.subscriptionStatus === 'trial';
      if (statusFilter === 'paused') return c.subscriptionStatus === 'paused';
      if (statusFilter === 'expiring') return isExpiringSoon(c);

      return true;
    })
    .sort((a, b) => {
      const aExp = isExpiringSoon(a) ? 1 : 0;
      const bExp = isExpiringSoon(b) ? 1 : 0;
      if (aExp !== bExp) return bExp - aExp;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  // Login Screen if Not Authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen py-10 px-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-6">
            <SynqraLogo size="md" className="justify-center mb-4" />
            <Badge variant="priority" className="mb-2 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>SYNQRA ROOT COMMAND GATE</span>
            </Badge>
            <h1 className="text-2xl font-black text-white mt-1">
              تسجيل دخول التحكم العام للمالك
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              بوابة مشفرة للتحكم الشامل بجميع العيادات وتراخيص التشغيل.
            </p>
          </div>

          <Card elevation="raised" className="bg-[#0b0f19] border-slate-800 p-8 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <Input
                label="البريد الإلكتروني المعتمد أو اسم مستخدم المالك"
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="saga.studio666@gmail.com أو synqra-master"
                required
                dir="ltr"
                className="font-mono text-start"
              />

              <Input
                label="كلمة المرور المشفرة للتحكم العام"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                required
                autoFocus
              />

              {/* Master Credential Info Card with 1-Click Fast Fill */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>بيانات الدخول الافتراضية للمالك</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput(AUTHORIZED_OWNER_EMAIL);
                      setPasswordInput('SynqraMaster2026!');
                    }}
                    className="text-[11px] font-bold text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/30 px-2.5 py-1 rounded-lg border border-cyan-400/40 transition-colors cursor-pointer"
                  >
                    تعبئة تلقائية بنقرة واحدة
                  </button>
                </div>

                <div className="space-y-1 text-start text-[11px] text-slate-300 font-mono">
                  <div>المستخدم: <strong className="text-cyan-300">saga.studio666@gmail.com</strong> أو <strong className="text-cyan-300">synqra-master</strong></div>
                  <div>كلمة المرور: <strong className="text-amber-300">SynqraMaster2026!</strong></div>
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-cyan-500/20">
                  يمكنك تغيير اسم المستخدم وكلمة المرور بحرية من الداخل بعد تسجيل الدخول.
                </div>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isLoggingIn}
                className="w-full font-black text-base py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl shadow-cyan-600/30 border border-cyan-400/50 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <Lock className="w-5 h-5 text-white" />
                <span>دخول لوحة التحكم المركزية</span>
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hidden Canvas for QR Poster generation */}
      <canvas ref={posterCanvasRef} className="hidden" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0b0f19] border border-indigo-950/60 shadow-2xl mb-6">
        <div className="flex items-center gap-4">
          <SynqraLogo size="sm" showTagline={false} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                MASTER COMMAND
              </span>
              <span className="text-xs text-slate-400 font-mono">
                synqra-master (Root Admin)
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">{t('masterTitle')}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Master Password Settings Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPasswordModalOpen(true)}
            className="border-indigo-500/40 text-indigo-300 hover:text-white"
          >
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>تغيير كلمة المرور</span>
          </Button>

          <Button
            variant="glow"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            className="font-bold bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.4)]"
          >
            <Plus className="w-5 h-5" />
            <span>{t('addNewClinicBtn')}</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={handleLogout}>
            تسجيل خروج
          </Button>
        </div>
      </div>

      {/* SYNQRA MASTER EXCLUSIVE DEMO CLINIC LAUNCHPAD & LOCK GATEWAY */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-2xl mb-8 transition-all ${
        isDemoClinicLocked
          ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-[#0b0f19] border-rose-500/40'
          : 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-[#0b0f19] border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.15)]'
      }`}>
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          {/* Clinic Identity & Lock Status */}
          <div className="flex items-start sm:items-center gap-4 text-start">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center p-3 border shrink-0 shadow-lg ${
              isDemoClinicLocked
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
            }`}>
              {isDemoClinicLocked ? <Lock className="w-7 h-7 animate-pulse" /> : <Building2 className="w-7 h-7" />}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  MASTER LAUNCHPAD ONLY
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-sm ${
                  isDemoClinicLocked
                    ? 'bg-rose-500/25 text-rose-300 border-rose-500/50'
                    : 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isDemoClinicLocked ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
                  <span>{isDemoClinicLocked ? 'الوضع التجاري مفعّل (مقفلة من العرض العام وممنوعة من الدخول)' : 'مفتوحة ومتاحة للتجربة'}</span>
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>مركز الشفاء الطبي التخصصي (العيادة التجريبية الرسمية)</span>
                <span className="text-xs font-normal text-slate-400 font-mono">(demo-clinic-cairo)</span>
              </h2>

              <p className="text-xs text-slate-400 mt-1">
                تم إقصاء روابط العيادة التجريبية من الواجهة العامة للموقع وجعل الوصول إليها حصرياً من هذه البوابة للمعاينة والاختبار المباشر لجميع الأدوار.
              </p>
            </div>
          </div>

          {/* Master 1-Click Launch Action Suite */}
          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
            {/* 1. Launch Patient Booking */}
            <Button
              variant="glow"
              size="sm"
              onClick={() => onNavigate('/book/demo-clinic-cairo')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-600/30 border border-indigo-400/50"
              title="فتح صفحة حجز المريض التجريبي"
            >
              <Users className="w-4 h-4 text-cyan-300" />
              <span>دخول حجز مريض</span>
            </Button>

            {/* 2. Launch Staff Secretary Dashboard (Auto Auth) */}
            <Button
              variant="glow"
              size="sm"
              onClick={handleLaunchDemoStaff}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-600/30 border border-emerald-400/50"
              title="دخول مباشر إلى لوحة تحكم السكرتيرة للعيادة التجريبية"
            >
              <LayoutDashboard className="w-4 h-4 text-white" />
              <span>لوحة السكرتيرة (مباشر)</span>
            </Button>

            {/* 3. Launch Waiting Room Display */}
            <Button
              variant="glow"
              size="sm"
              onClick={() => onNavigate('/clinic/demo-clinic-cairo/display')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-purple-600/30 border border-purple-400/50"
              title="تشغيل شاشة تلفزيون صالة الانتظار"
            >
              <Tv className="w-4 h-4 text-purple-200" />
              <span>شاشة TV</span>
            </Button>

            {/* 4. Reset Demo Queue */}
            <Button
              variant="secondary"
              size="sm"
              loading={isResettingDemo}
              onClick={handleResetDemo}
              className="border-2 border-amber-500/50 bg-slate-900 text-amber-300 hover:bg-slate-800 hover:text-amber-200 font-bold text-xs px-3.5 py-2 rounded-xl shadow-md"
              title="إعادة ضبط وتصفير قائمة الطابور للعيادة التجريبية"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>تصفير الطابور</span>
            </Button>

            {/* 5. Master Commercial Lock Switch */}
            <Button
              variant={isDemoClinicLocked ? 'glow' : 'secondary'}
              size="sm"
              onClick={handleToggleDemoClinic}
              className={`font-black text-xs shadow-md transition-all px-3.5 py-2 rounded-xl ${
                isDemoClinicLocked
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/40 border border-emerald-300'
                  : 'border-2 border-rose-500/60 bg-rose-950/60 text-rose-200 hover:bg-rose-900/80 shadow-rose-900/40'
              }`}
              title={isDemoClinicLocked ? 'فتح العيادة التجريبية وإتاحة الدخول' : 'إقفال العيادة التجريبية ومنع الدخول'}
            >
              {isDemoClinicLocked ? (
                <>
                  <Unlock className="w-4 h-4 text-emerald-200" />
                  <span>فتح العيادة (إتاحة الدخول)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-rose-300" />
                  <span>إقفال العيادة (الوضع التجاري)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* UNIVERSAL CLINIC ACCESS PORTAL & QUICK LAUNCHER (بوابة الدخول السريع والتحكم لأي عيادة) */}
      <div className="p-5 sm:p-6 rounded-3xl border-2 border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-[#0b0f19] shadow-2xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400/50 text-cyan-300 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
              <KeyRound className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm">
                  UNIVERSAL CLINIC GATEWAY
                </span>
                <span className="text-xs text-slate-300 font-semibold">بوابة الدخول السريع المباشر للمالك</span>
              </div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>بوابة الدخول والتحكم السريع بأي عيادة</span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                اختر أي عيادة مسجلة في السحاب للدخول الفوري للوحة السكرتاريا، شاشة TV، أو صفحة تسجيل الدخول الرسمية.
              </p>
            </div>
          </div>

          {/* Selector & Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Dropdown Selector */}
            <div className="relative min-w-[220px]">
              <select
                value={quickAccessClinicId || (clinics[0]?.id || '')}
                onChange={(e) => setQuickAccessClinicId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 text-white border-2 border-indigo-500/50 text-xs font-bold outline-none focus:border-cyan-400 cursor-pointer shadow-lg"
              >
                {clinics.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white py-1">
                    {c.clinicName} {c.isDemo ? '(تجريبية)' : ''} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick 1-Click Launchers for Selected Clinic */}
            {(() => {
              const target = clinics.find((c) => c.id === (quickAccessClinicId || clinics[0]?.id)) || clinics[0];
              if (!target) return null;
              return (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="glow"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem(`synqra_staff_auth_${target.id}`, 'true');
                        const sessionToken = btoa(JSON.stringify({
                          clinicId: target.id,
                          identifier: target.phoneNumber || target.id,
                          timestamp: Date.now()
                        }));
                        localStorage.setItem('dawrak_clinic_session', sessionToken);
                      }
                      onNavigate(`/clinic/${target.id}/dashboard`);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-600/30 border border-indigo-400/50"
                    title="دخول مباشر فوري للوحة السكرتاريا دون طلب رمز PIN"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-white" />
                    <span>لوحة السكرتاريا</span>
                  </Button>

                  <Button
                    variant="glow"
                    size="sm"
                    onClick={() => onNavigate(`/clinic/${target.id}/display`)}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-purple-600/30 border border-purple-400/50"
                    title="فتح شاشة التلفزيون للعيادة"
                  >
                    <Tv className="w-3.5 h-3.5 text-purple-200" />
                    <span>شاشة TV</span>
                  </Button>

                  <Button
                    variant="glow"
                    size="sm"
                    onClick={() => onNavigate(`/book/${target.id}`)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-600/30 border border-emerald-400/50"
                    title="فتح صفحة حجز المريض"
                  >
                    <Users className="w-3.5 h-3.5 text-white" />
                    <span>حجز مريض</span>
                  </Button>

                  <Button
                    variant="glow"
                    size="sm"
                    onClick={() => onNavigate('/clinic/login')}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-cyan-600/30 border border-cyan-400/50"
                    title="الانتقال لصفحة تسجيل الدخول الرسمية"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-cyan-200" />
                    <span>بوابة الدخول الرسمية</span>
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card elevation="raised" className="bg-[#0b0f19] border-slate-800 text-center p-5">
          <span className="text-xs font-bold text-slate-400 block mb-1">{t('clinicsCount')}</span>
          <div className="text-4xl font-black text-white my-1 font-mono">
            {clinics.length}
          </div>
          <span className="text-[11px] text-slate-500">عيادة مسجلة في السحاب</span>
        </Card>

        <Card elevation="raised" className="bg-[#0b0f19] border-slate-800 text-center p-5">
          <span className="text-xs font-bold text-slate-400 block mb-1">{t('activeSubscriptions')}</span>
          <div className="text-4xl font-black text-emerald-400 my-1 font-mono">
            {clinics.filter((c) => c.subscriptionStatus === 'active' || c.subscriptionStatus === 'trial').length}
          </div>
          <span className="text-[11px] text-slate-500">اشتراك ساري المفعول</span>
        </Card>

        <Card elevation="raised" className="bg-[#0b0f19] border-slate-800 text-center p-5">
          <span className="text-xs font-bold text-slate-400 block mb-1">{t('expiringSoon')}</span>
          <div className="text-4xl font-black text-amber-400 my-1 font-mono">
            {clinics.filter((c) => isExpiringSoon(c)).length}
          </div>
          <span className="text-[11px] text-slate-500">عيادات تنتهي خلال ٣ أيام</span>
        </Card>
      </div>

      {/* Clinics Directory Header & Controls */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  دليل العيادات المركزية وإدارة السحاب
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                  {filteredClinics.length} من {clinics.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تحكم كامل في الاشتراكات، مفاتيح الدخول، وإجراءات كل عيادة في المنظومة
              </p>
            </div>
          </div>

          {/* View Mode Toggle: Table vs Cards */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض جدول مفصل"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>جدول مفصل</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض بطاقات ذكية"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>بطاقات تنفيذية</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم العيادة، الطبيب، الهاتف أو الكود..."
              className="w-full ps-10 pe-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/60 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 end-3 my-auto text-slate-500 hover:text-white text-xs"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'active', label: 'النشطة' },
              { id: 'trial', label: 'التجريبية (Trial)' },
              { id: 'paused', label: 'المتوقفة' },
              { id: 'expiring', label: 'تنتهي قريباً ⚠️' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Clinics View: Table or Cards */}
      {viewMode === 'table' ? (
        <Card elevation="raised" className="bg-[#0b0f19] border-slate-800 p-0 overflow-hidden shadow-2xl mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead className="bg-[#111625] text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-4 px-4 text-start">العيادة والتخصص</th>
                  <th className="py-4 px-4 text-start">المعرّف ورمز PIN</th>
                  <th className="py-4 px-4 text-start">التواصل وروابط البوابات</th>
                  <th className="py-4 px-4 text-start">حالة الاشتراك والصلاحية</th>
                  <th className="py-4 px-4 text-center">العمليات والتحكم المركزي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredClinics.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      لا توجد عيادات مطابقة للبحث أو التصفية الحالية.
                    </td>
                  </tr>
                ) : (
                  filteredClinics.map((clinic) => {
                    const expiring = isExpiringSoon(clinic);
                    const daysRemaining = clinic.subscriptionEndsAt 
                      ? Math.ceil((new Date(clinic.subscriptionEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <tr key={clinic.id} className="hover:bg-slate-850/40 transition-colors">
                        {/* 1. Clinic Name, Doctor, Specialty & Demo Badge */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-11 h-11 rounded-2xl flex items-center justify-center p-2.5 border border-slate-700 bg-slate-900 shadow-inner shrink-0 relative"
                              style={{ borderColor: clinic.brandColor ? `${clinic.brandColor}50` : undefined }}
                            >
                              <Building2 className="w-5 h-5" style={{ color: clinic.brandColor || '#818cf8' }} />
                              <span 
                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0b0f19]"
                                style={{ backgroundColor: clinic.subscriptionStatus === 'active' ? '#10b981' : clinic.subscriptionStatus === 'trial' ? '#06b6d4' : '#f43f5e' }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-white text-sm sm:text-base tracking-tight">
                                  {clinic.clinicName}
                                </span>
                                {clinic.isDemo ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                    {isDemoClinicLocked ? 'DEMO مقفلة' : 'DEMO تجريبية'}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                    PRO
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                {clinic.doctorName && (
                                  <span className="text-cyan-400 font-semibold">{clinic.doctorName} • </span>
                                )}
                                <span>{clinic.specialty}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Clinic Slug & PIN */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-indigo-300 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                                {clinic.id}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  handleCopy(clinic.id, `slug-${clinic.id}`);
                                  showToast('تم نسخ كود العيادة (Slug)', 'info');
                                }}
                                className="p-1 text-slate-400 hover:text-white"
                                title="نسخ كود العيادة"
                              >
                                {copiedKey === `slug-${clinic.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                              <span className="text-slate-500">PIN:</span>
                              <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                {clinic.isDemo ? '1234' : 'مشفر سحابياً'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Phone & Portals Quick Launch */}
                        <td className="py-4 px-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-300">{clinic.phoneNumber}</span>
                              <a
                                href={`https://wa.me/${clinic.phoneNumber.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                                title="مراسلة العيادة عبر واتساب"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Portals Quick Launcher Pills */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof window !== 'undefined') {
                                    sessionStorage.setItem(`synqra_staff_auth_${clinic.id}`, 'true');
                                  }
                                  onNavigate(`/clinic/${clinic.id}/dashboard`);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 cursor-pointer"
                                title="فتح لوحة تحكم السكرتاريا للعيادة"
                              >
                                <LayoutDashboard className="w-2.5 h-2.5" />
                                <span>السكرتاريا</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onNavigate(`/clinic/${clinic.id}/display`)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 cursor-pointer"
                                title="عرض شاشة التلفزيون للعيادة"
                              >
                                <Tv className="w-2.5 h-2.5" />
                                <span>الشاشة</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onNavigate(`/book/${clinic.id}`)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 cursor-pointer"
                                title="رابط حجز المرضى"
                              >
                                <Users className="w-2.5 h-2.5" />
                                <span>الحجز</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 4. Subscription & Expiry */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              {clinic.subscriptionStatus === 'active' ? (
                                <Badge variant="active">نشط</Badge>
                              ) : clinic.subscriptionStatus === 'trial' ? (
                                <Badge variant="priority">تجريبي (Trial)</Badge>
                              ) : (
                                <Badge variant="paused">متوقف</Badge>
                              )}
                              {expiring && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                                  قريب الانتهاء
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {clinic.subscriptionEndsAt 
                                ? new Date(clinic.subscriptionEndsAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
                                : 'غير محدد'}
                              {daysRemaining !== null && (
                                <span className={`mr-1 font-bold ${daysRemaining <= 3 ? 'text-amber-400' : 'text-slate-500'}`}>
                                  ({daysRemaining > 0 ? `متبقي ${daysRemaining} يوم` : 'منتهي'})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 5. Central Control & Actions Toolbar */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap max-w-[340px] mx-auto">
                            {/* Subscription Group */}
                            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                              {clinic.subscriptionStatus === 'paused' ? (
                                <button
                                  type="button"
                                  onClick={() => handleActivate(clinic)}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 cursor-pointer transition-all"
                                  title="تفعيل وإلغاء إيقاف الاشتراك"
                                >
                                  <PlayCircle className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handlePause(clinic)}
                                  className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 cursor-pointer transition-all"
                                  title="إيقاف مؤقت للاشتراك"
                                >
                                  <PauseCircle className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleExtendDays(clinic, 7)}
                                className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 text-[11px] font-bold cursor-pointer"
                                title="تمديد الاشتراك ٧ أيام"
                              >
                                +٧د
                              </button>

                              <button
                                type="button"
                                onClick={() => handleExtendDays(clinic, 30)}
                                className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 text-[11px] font-bold cursor-pointer"
                                title="تمديد الاشتراك ٣٠ يوماً"
                              >
                                +٣٠د
                              </button>
                            </div>

                            {/* Client Tools Group */}
                            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                              {/* Edit Clinic Profile */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(clinic)}
                                className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 cursor-pointer"
                                title="تعديل بيانات العيادة"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Export Credentials Kit */}
                              <button
                                type="button"
                                onClick={() => {
                                  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dawrak.live';
                                  setOnboardingPackage({
                                    clinicId: clinic.id,
                                    clinicName: clinic.clinicName,
                                    doctorName: clinic.doctorName,
                                    phone: clinic.phoneNumber,
                                    plainPin: clinic.isDemo ? '1234' : 'رمز PIN المشفر للمسؤول',
                                    bookingUrl: `${origin}/book/${clinic.id}`
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 cursor-pointer"
                                title="تصدير بيانات الدخول للعميل"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>

                              {/* WhatsApp Kit Modal */}
                              <button
                                type="button"
                                onClick={() => setWhatsAppModalClinic(clinic)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 cursor-pointer"
                                title="حقيبة قوالب رسائل واتساب"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              {/* Download QR Poster */}
                              <button
                                type="button"
                                onClick={() => {
                                  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dawrak.live';
                                  handleDownloadQrPoster({
                                    clinicName: clinic.clinicName,
                                    bookingUrl: `${origin}/book/${clinic.id}`
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 cursor-pointer"
                                title="تحميل بوستر QR للطباعة"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {/* Regenerate PIN */}
                              <button
                                type="button"
                                onClick={() => handleRegeneratePin(clinic)}
                                className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 cursor-pointer"
                                title="توليد وتحديث رمز مرور PIN جديد"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>

                              {/* Audit Logs */}
                              <button
                                type="button"
                                onClick={() => setSelectedAuditClinic(clinic)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                                title="سجل العمليات (Audit Log)"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>

                            {/* DELETE CLINIC BUTTON (حذف العيادة) */}
                            <button
                              type="button"
                              onClick={() => setDeletingClinic(clinic)}
                              className="p-2 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 hover:border-rose-500/50 cursor-pointer transition-all shadow-sm"
                              title="حذف العيادة نهائياً ومسح بياناتها"
                            >
                              <Trash2 className="w-4 h-4 text-rose-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Cards View - Redesigned Modern Executive Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredClinics.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 bg-[#0b0f19] border border-slate-800 rounded-3xl p-8">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">لا توجد عيادات مطابقة للبحث أو التصفية الحالية.</p>
              <p className="text-xs text-slate-500 mt-1">جرّب البحث باسم آخر أو إزالة معايير الفلترة.</p>
            </div>
          ) : (
            filteredClinics.map((clinic) => {
              const expiring = isExpiringSoon(clinic);
              const daysRemaining = clinic.subscriptionEndsAt 
                ? Math.ceil((new Date(clinic.subscriptionEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              const brandColor = clinic.brandColor || '#6366f1';

              return (
                <div 
                  key={clinic.id} 
                  className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0e1322] via-[#0b0f1a] to-[#070a12] border border-slate-800/80 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group p-6"
                >
                  {/* Top Dynamic Brand Color Accent Strip */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5"
                    style={{ 
                      background: `linear-gradient(90deg, transparent, ${brandColor}, transparent)` 
                    }} 
                  />

                  <div>
                    {/* Card Top Header: Icon + Title & Specialty + Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-13 h-13 rounded-2xl flex items-center justify-center p-3 border shadow-md relative shrink-0 transition-transform duration-300 group-hover:scale-105"
                          style={{ 
                            borderColor: `${brandColor}40`, 
                            backgroundColor: `${brandColor}15` 
                          }}
                        >
                          <Building2 className="w-6 h-6" style={{ color: brandColor }} />
                          {clinic.isDemo && (
                            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-cyan-500 text-white shadow-sm">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-white text-base tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                            {clinic.clinicName}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                            {clinic.doctorName && (
                              <span className="text-indigo-300 font-bold flex items-center gap-1">
                                <Stethoscope className="w-3 h-3 text-indigo-400" />
                                {clinic.doctorName}
                              </span>
                            )}
                            {clinic.doctorName && <span className="text-slate-600">•</span>}
                            <span className="text-slate-400 truncate">{clinic.specialty}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {clinic.subscriptionStatus === 'active' ? (
                          <Badge variant="active" className="text-[11px] shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                            <span>نشط</span>
                          </Badge>
                        ) : clinic.subscriptionStatus === 'trial' ? (
                          <Badge variant="priority" className="text-[11px] shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" />
                            <span>تجريبي</span>
                          </Badge>
                        ) : (
                          <Badge variant="paused" className="text-[11px] shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1" />
                            <span>متوقف</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Modern Metadata Box */}
                    <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-2.5 mb-4 text-xs font-mono shadow-inner">
                      {/* Slug with 1-Click Copy */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">كود العيادة (Slug):</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-300 font-bold font-mono text-xs">{clinic.id}</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleCopy(clinic.id, `card-slug-${clinic.id}`);
                              showToast('تم نسخ كود العيادة بنجاح', 'info');
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="نسخ كود العيادة"
                          >
                            {copiedKey === `card-slug-${clinic.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Phone with 1-Click Copy */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">رقم الدخول:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-200 font-mono text-xs">{clinic.phoneNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleCopy(clinic.phoneNumber, `card-phone-${clinic.id}`);
                              showToast('تم نسخ رقم الهاتف', 'info');
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="نسخ رقم الهاتف"
                          >
                            {copiedKey === `card-phone-${clinic.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Subscription Status & Duration */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="text-slate-400 text-[11px]">صلاحية الاشتراك:</span>
                        <div className="flex items-center gap-1.5 text-end">
                          <span className="text-slate-300 text-[11px]">
                            {clinic.subscriptionEndsAt 
                              ? new Date(clinic.subscriptionEndsAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })
                              : 'مفتوح'}
                          </span>
                          {daysRemaining !== null && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              daysRemaining <= 0
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : daysRemaining <= 3
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {daysRemaining > 0 ? `${daysRemaining} يوم متبقي` : 'منتهي'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick 1-Click Launchers Bar (السكرتاريا • شاشة TV • حجز دور) */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            sessionStorage.setItem(`synqra_staff_auth_${clinic.id}`, 'true');
                            const sessionToken = btoa(JSON.stringify({
                              clinicId: clinic.id,
                              identifier: clinic.phoneNumber || clinic.id,
                              timestamp: Date.now()
                            }));
                            localStorage.setItem('dawrak_clinic_session', sessionToken);
                          }
                          onNavigate(`/clinic/${clinic.id}/dashboard`);
                        }}
                        className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-500/60 flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer transition-all shadow-sm"
                        title="دخول مباشر إلى لوحة تحكم السكرتاريا"
                      >
                        <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                        <span>السكرتاريا</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate(`/clinic/${clinic.id}/display`)}
                        className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/60 flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer transition-all shadow-sm"
                        title="تشغيل شاشة تلفزيون صالة الانتظار"
                      >
                        <Tv className="w-4 h-4 text-cyan-400" />
                        <span>شاشة TV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate(`/book/${clinic.id}`)}
                        className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/60 flex flex-col items-center justify-center gap-1 text-[11px] font-bold cursor-pointer transition-all shadow-sm"
                        title="فتح رابط حجز المرضى المباشر"
                      >
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>حجز دور</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom Actions Bar with Subscription + Tools + Delete Button */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1 flex-wrap">
                    {/* Subscription Quick Toggles */}
                    <div className="flex items-center gap-1">
                      {clinic.subscriptionStatus === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => handleActivate(clinic)}
                          className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 cursor-pointer transition-all shadow-sm"
                          title="تفعيل وإلغاء إيقاف الاشتراك"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePause(clinic)}
                          className="p-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 cursor-pointer transition-all shadow-sm"
                          title="إيقاف مؤقت للاشتراك"
                        >
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleExtendDays(clinic, 7)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 text-xs font-bold cursor-pointer transition-all"
                        title="تمديد الاشتراك ٧ أيام"
                      >
                        +٧د
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExtendDays(clinic, 30)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 text-xs font-bold cursor-pointer transition-all"
                        title="تمديد الاشتراك ٣٠ يوماً"
                      >
                        +٣٠د
                      </button>
                    </div>

                    {/* Tools & Actions Group */}
                    <div className="flex items-center gap-1">
                      {/* Edit Clinic Profile */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(clinic)}
                        className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 cursor-pointer transition-all"
                        title="تعديل بيانات العيادة وألوانها"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* WhatsApp Kit */}
                      <button
                        type="button"
                        onClick={() => setWhatsAppModalClinic(clinic)}
                        className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 cursor-pointer transition-all"
                        title="حقيبة رسائل واتساب الجاهزة"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {/* Regenerate PIN */}
                      <button
                        type="button"
                        onClick={() => handleRegeneratePin(clinic)}
                        className="p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 cursor-pointer transition-all"
                        title="توليد وتشفير PIN جديد"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>

                      {/* DELETE CLINIC BUTTON (حذف العيادة نهائياً) */}
                      <button
                        type="button"
                        onClick={() => setDeletingClinic(clinic)}
                        className="p-2 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-500/60 cursor-pointer transition-all shadow-sm"
                        title="حذف العيادة نهائياً ومسح بياناتها"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MASTER PASSWORD CHANGE MODAL */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-indigo-400">
            <Lock className="w-5 h-5" />
            <span>تغيير كلمة مرور الإدارة المركزية (SYNQRA ROOT KEY)</span>
          </div>
        }
      >
        <form onSubmit={handleUpdateMasterPasswordSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            يمكنك تغيير اسم المستخدم وكلمة المرور المشفرة مع المزامنة السحابية والمحلية الفورية.
          </p>

          <Input
            label="اسم مستخدم التحكم العام (Master Username)"
            type="text"
            value={newMasterUsername}
            onChange={(e) => setNewMasterUsername(e.target.value)}
            placeholder="synqra-master"
            required
            dir="ltr"
            className="font-mono text-start"
          />

          <Input
            label="كلمة المرور الحالية"
            type="password"
            value={currentMasterPass}
            onChange={(e) => setCurrentMasterPass(e.target.value)}
            placeholder="أدخل كلمة المرور الحالية..."
            required
            autoFocus
          />

          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={newMasterPass}
            onChange={(e) => setNewMasterPass(e.target.value)}
            placeholder="كلمة مرور قوية (4 خانات على الأقل)..."
            required
          />

          <Input
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            value={confirmMasterPass}
            onChange={(e) => setConfirmMasterPass(e.target.value)}
            placeholder="أعد كتابة كلمة المرور الجديدة..."
            required
          />

          {passChangeError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
              {passChangeError}
            </div>
          )}

          {passChangeSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{passChangeSuccess}</span>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="glow"
              loading={isSavingMasterPass}
              className="bg-indigo-600 hover:bg-indigo-500 font-bold"
            >
              حفظ وتشفير كلمة المرور الجديدة
            </Button>
          </div>
        </form>
      </Modal>

      {/* "ADD NEW CLINIC" MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            <span>{t('addNewClinicBtn')}</span>
          </div>
        }
        maxWidth="lg"
      >
        <form onSubmit={handleCreateClinicSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="اسم العيادة أو المركز الطبي"
              value={newClinicName}
              onChange={(e) => setNewClinicName(e.target.value)}
              placeholder="مثال: مركز الأمل لجراحة العيون"
              required
              autoFocus
            />

            <Input
              label="اسم الطبيب المعالج (اختياري)"
              value={newDoctorName}
              onChange={(e) => setNewDoctorName(e.target.value)}
              placeholder="مثال: د. كريم محمود"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="التخصص الطبي"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              placeholder="مثال: طب وجراحة العيون، ليزك..."
              required
            />

            <Input
              label="رقم هاتف العيادة والواتساب (للدخول)"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="01012345678"
              dir="ltr"
              className="font-mono text-start"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="كود العيادة المخصص (Slug) - اختياري"
                value={newCustomSlug}
                onChange={(e) => setNewCustomSlug(e.target.value)}
                placeholder="مثال: dr-karim-eye"
                dir="ltr"
                className="font-mono text-start"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                إذا تركته فارغاً سيتم توليد كود عشوائي آمن تلقائياً.
              </span>
            </div>

            <div>
              <Input
                label="الرمز السري المخصص (PIN) - اختياري"
                type="text"
                value={newCustomPin}
                onChange={(e) => setNewCustomPin(e.target.value)}
                placeholder="مثال: 5566 أو 123456"
                dir="ltr"
                className="font-mono text-start"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                إذا تركته فارغاً سيتم توليد رمز PIN من 4 أرقام عشوائية.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 text-start">
              <label className="text-xs font-semibold text-slate-300">متوسط وقت الكشف (دقائق)</label>
              <input
                type="number"
                min="3"
                max="60"
                value={newAvgConsultMinutes}
                onChange={(e) => setNewAvgConsultMinutes(Number(e.target.value))}
                className="w-full rounded-xl py-2.5 px-4 text-sm font-medium bg-slate-800 text-white border border-slate-700 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1 text-start">
              <label className="text-xs font-semibold text-slate-300">مدة الاشتراك المبدئية</label>
              <select
                value={newSubscriptionDays}
                onChange={(e) => setNewSubscriptionDays(Number(e.target.value))}
                className="w-full rounded-xl py-2.5 px-4 text-sm font-medium bg-slate-800 text-white border border-slate-700 outline-none focus:border-indigo-500"
              >
                <option value={7}>٧ أيام (فترة تجريبية Trial)</option>
                <option value={30}>شهر كامل (٣٠ يوماً)</option>
                <option value={90}>٣ أشهر (ربع سنوي)</option>
                <option value={365}>سنة كاملة (اشتراك سنوي)</option>
              </select>
            </div>
          </div>

          {/* Creative Preset Color Mixes & Theme Selector */}
          <div className="space-y-2 text-start pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>ميكس ألوان وهوية الداشبورد (Clinic Theme Mix & Palette)</span>
              </label>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                {newBrandColor}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              اختر قالباً احترافياً جاهزاً لداشبورد السكرتاريا وشاشة TV، أو حدد لوناً مخصصاً:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {CLINIC_THEME_MIXES.map((mix) => {
                const isSelected = newBrandColor.toLowerCase() === mix.primaryColor.toLowerCase();
                return (
                  <button
                    key={mix.id}
                    type="button"
                    onClick={() => setNewBrandColor(mix.primaryColor)}
                    className={`p-2.5 rounded-2xl border text-start transition-all relative overflow-hidden cursor-pointer ${
                      isSelected
                        ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-slate-800 shadow-lg scale-[1.02]'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/90 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full shadow-md shrink-0 border border-white/20"
                          style={{ backgroundColor: mix.primaryColor }}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10"
                          style={{ backgroundColor: mix.secondaryColor }}
                        />
                      </div>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-white truncate">{mix.nameEn}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{mix.badge}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newBrandColor}
                  onChange={(e) => setNewBrandColor(e.target.value)}
                  className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer p-0.5"
                />
                <span className="text-xs text-slate-400 font-medium">لون حر مخصص:</span>
              </div>
              <span className="font-mono text-xs text-cyan-300 font-bold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                {newBrandColor}
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="glow"
              loading={isCreatingClinic}
              className="bg-indigo-600 hover:bg-indigo-500 font-bold"
            >
              إنشاء العيادة وتوليد حزمة الإطلاق
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT CLINIC PROFILE MODAL */}
      <Modal
        isOpen={editingClinic !== null}
        onClose={() => setEditingClinic(null)}
        title={
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-indigo-400" />
            <span>تعديل بيانات العيادة: {editingClinic?.clinicName}</span>
          </div>
        }
        maxWidth="lg"
      >
        {editingClinic && (
          <form onSubmit={handleSaveClinicEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="اسم العيادة"
                value={editClinicName}
                onChange={(e) => setEditClinicName(e.target.value)}
                required
              />

              <Input
                label="اسم الطبيب"
                value={editDoctorName}
                onChange={(e) => setEditDoctorName(e.target.value)}
                placeholder="د. ..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="التخصص الطبي"
                value={editSpecialty}
                onChange={(e) => setEditSpecialty(e.target.value)}
                required
              />

              <Input
                label="رقم الهاتف المسجل للدخول"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                dir="ltr"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 text-start">
                <label className="text-xs font-semibold text-slate-300">متوسط وقت الكشف (دقائق)</label>
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={editAvgMinutes}
                  onChange={(e) => setEditAvgMinutes(Number(e.target.value))}
                  className="w-full rounded-xl py-2.5 px-4 text-sm font-medium bg-slate-800 text-white border border-slate-700 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1 text-start">
                <label className="text-xs font-semibold text-slate-300">حالة الاشتراك</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
                  className="w-full rounded-xl py-2.5 px-4 text-sm font-medium bg-slate-800 text-white border border-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="active">نشط (Active)</option>
                  <option value="trial">تجريبي (Trial)</option>
                  <option value="paused">متوقف (Paused)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="تغيير رمز PIN للعيادة (اتركه فارغاً دون تغيير)"
                type="text"
                value={editCustomPin}
                onChange={(e) => setEditCustomPin(e.target.value)}
                placeholder="أدخل رمز جديد إن أردت تغييره..."
                dir="ltr"
                className="font-mono text-start"
              />

              <div className="col-span-full space-y-2 text-start pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>ميكس ألوان وهوية الداشبورد للعيادة (Clinic Theme Mix)</span>
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold">
                    {editBrandColor}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  اختر قالباً احترافياً عصرية للداشبورد والشاشات:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CLINIC_THEME_MIXES.map((mix) => {
                    const isSelected = editBrandColor.toLowerCase() === mix.primaryColor.toLowerCase();
                    return (
                      <button
                        key={mix.id}
                        type="button"
                        onClick={() => setEditBrandColor(mix.primaryColor)}
                        className={`p-2.5 rounded-2xl border text-start transition-all relative overflow-hidden cursor-pointer ${
                          isSelected
                            ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-slate-800 shadow-lg scale-[1.02]'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-900/90 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full shadow-md shrink-0 border border-white/20"
                              style={{ backgroundColor: mix.primaryColor }}
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10"
                              style={{ backgroundColor: mix.secondaryColor }}
                            />
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-white truncate">{mix.nameEn}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{mix.badge}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editBrandColor}
                      onChange={(e) => setEditBrandColor(e.target.value)}
                      className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer p-0.5"
                    />
                    <span className="text-xs text-slate-400 font-medium">لون حر مخصص:</span>
                  </div>
                  <span className="font-mono text-xs text-cyan-300 font-bold bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                    {editBrandColor}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingClinic(null)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="glow"
                loading={isSavingEdit}
                className="bg-indigo-600 hover:bg-indigo-500 font-bold"
              >
                حفظ التعديلات
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ONBOARDING PACKAGE / DELIVERABLE CREDENTIALS MODAL */}
      <Modal
        isOpen={onboardingPackage !== null}
        onClose={() => setOnboardingPackage(null)}
        title={
          <div className="flex items-center gap-2 text-emerald-400">
            <Sparkles className="w-5 h-5" />
            <span>بطاقة تسليم بيانات الدخول والتشغيل للعيادة</span>
          </div>
        }
        maxWidth="lg"
      >
        {onboardingPackage && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              تنبيه أمني هام: هذا الرمز السري (PIN) يظهر الآن فقط ولن يتم عرضه أو تخزينه نصياً مرة أخرى. يرجى نسخه فوراً.
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">كود العيادة (Clinic Slug):</span>
                  <span className="font-mono font-bold text-indigo-300 text-base">{onboardingPackage.clinicId}</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(onboardingPackage.clinicId, 'slug')}
                >
                  {copiedKey === 'slug' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'slug' ? t('copySuccess') : 'نسخ الكود'}</span>
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <div>
                  <span className="text-xs text-slate-400 block">رقم الدخول المعتمد:</span>
                  <span className="font-mono font-bold text-white text-base">{onboardingPackage.phone}</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(onboardingPackage.phone, 'phone')}
                >
                  {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'phone' ? t('copySuccess') : 'نسخ الرقم'}</span>
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <div>
                  <span className="text-xs text-slate-400 block">رمز المرور السري (PIN):</span>
                  <span className="font-mono font-black text-2xl text-amber-400">{onboardingPackage.plainPin}</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(onboardingPackage.plainPin, 'pin')}
                >
                  {copiedKey === 'pin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'pin' ? t('copySuccess') : 'نسخ PIN'}</span>
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <div className="truncate max-w-[280px]">
                  <span className="text-xs text-slate-400 block">رابط حجز المرضى المباشر:</span>
                  <span className="font-mono text-xs text-cyan-400 truncate">{onboardingPackage.bookingUrl}</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(onboardingPackage.bookingUrl, 'url')}
                >
                  {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'url' ? t('copySuccess') : 'نسخ الرابط'}</span>
                </Button>
              </div>
            </div>

            {/* Pre-written WhatsApp Message with Ornate SYNQRA Branding */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">رسالة التسليم الجاهزة للواتساب:</label>
              <textarea
                readOnly
                rows={7}
                value={`⚡ ⟦ ＳＹＮＱＲＡ™ ⟧ ⚡\nمنظومة دورك لايف (Dawrak Live) للحلول الطبية الذكية\n──────────────────────\nمرحباً دكتور / إدارة ${onboardingPackage.clinicName}،\nيسعدنا تسليمكم بيانات تشغيل منظومة دورك لايف:\n\n📋 بيانات دخول لوحة تحكم السكرتارية:\n• رابط الداشبورد: ${typeof window !== 'undefined' ? window.location.origin : 'https://dawrak.live'}/clinic/login\n• رقم الدخول: ${onboardingPackage.phone}\n• كود العيادة: ${onboardingPackage.clinicId}\n• الرمز السري (PIN): ${onboardingPackage.plainPin}\n\n🔗 رابط حجز المرضى المباشر:\n${onboardingPackage.bookingUrl}\n\n📺 شاشة التلفزيون لصالة الانتظار:\n${typeof window !== 'undefined' ? window.location.origin : 'https://dawrak.live'}/clinic/${onboardingPackage.clinicId}/display\n──────────────────────\n📞 الدعم المباشر: 01225161076`}
                className="w-full p-3 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700 outline-none"
              />
              <Button
                variant="glow"
                size="sm"
                onClick={() => {
                  const msg = `⚡ ⟦ ＳＹＮＱＲＡ™ ⟧ ⚡\nمنظومة دورك لايف (Dawrak Live) للحلول الطبية الذكية\n──────────────────────\nمرحباً دكتور / إدارة ${onboardingPackage.clinicName}،\nيسعدنا تسليمكم بيانات تشغيل منظومة دورك لايف:\n\n📋 بيانات دخول لوحة تحكم السكرتارية:\n• رابط الداشبورد: ${typeof window !== 'undefined' ? window.location.origin : 'https://dawrak.live'}/clinic/login\n• رقم الدخول: ${onboardingPackage.phone}\n• كود العيادة: ${onboardingPackage.clinicId}\n• الرمز السري (PIN): ${onboardingPackage.plainPin}\n\n🔗 رابط حجز المرضى المباشر:\n${onboardingPackage.bookingUrl}\n\n📺 شاشة التلفزيون لصالة الانتظار:\n${typeof window !== 'undefined' ? window.location.origin : 'https://dawrak.live'}/clinic/${onboardingPackage.clinicId}/display\n──────────────────────\n📞 الدعم المباشر: 01225161076`;
                  handleCopy(msg, 'whatsapp-onboard');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                <MessageCircle className="w-4 h-4" />
                <span>نسخ الرسالة المزخرفة كاملة لواتساب</span>
              </Button>
            </div>

            {/* Poster Download Action */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleDownloadQrPoster({
                clinicName: onboardingPackage.clinicName,
                bookingUrl: onboardingPackage.bookingUrl
              })}
              className="w-full font-bold"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>{t('downloadQrPoster')}</span>
            </Button>
          </div>
        )}
      </Modal>

      {/* WHATSAPP SHARING KIT MODAL */}
      <Modal
        isOpen={whatsAppModalClinic !== null}
        onClose={() => setWhatsAppModalClinic(null)}
        title="حقيبة قوالب رسائل واتساب المزخرفة - سينقرا"
        maxWidth="lg"
      >
        {whatsAppModalClinic && (
          <div className="space-y-6">
            {/* Template 1: Welcome Message */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>١. رسالة الترحيب والبيانات (Onboarding)</span>
                </h4>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(getWhatsAppTemplates(whatsAppModalClinic).welcome, 'wa-wel')}
                >
                  {copiedKey === 'wa-wel' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>نسخ القالب</span>
                </Button>
              </div>
              <textarea
                readOnly
                rows={5}
                value={getWhatsAppTemplates(whatsAppModalClinic).welcome}
                className="w-full p-2.5 rounded-lg bg-slate-900 text-xs font-mono text-slate-300 border border-slate-700"
              />
            </div>

            {/* Template 2: Renewal Reminder */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>٢. رسالة تذكير تجديد الاشتراك (Renewal Reminder)</span>
                </h4>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(getWhatsAppTemplates(whatsAppModalClinic).renewal, 'wa-ren')}
                >
                  {copiedKey === 'wa-ren' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>نسخ القالب</span>
                </Button>
              </div>
              <textarea
                readOnly
                rows={4}
                value={getWhatsAppTemplates(whatsAppModalClinic).renewal}
                className="w-full p-2.5 rounded-lg bg-slate-900 text-xs font-mono text-slate-300 border border-slate-700"
              />
            </div>

            {/* Template 3: Poster Share */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>٣. رسالة مشاركة رابط الحجز وبوستر الـ QR</span>
                </h4>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(getWhatsAppTemplates(whatsAppModalClinic).qrPoster, 'wa-pos')}
                >
                  {copiedKey === 'wa-pos' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>نسخ القالب</span>
                </Button>
              </div>
              <textarea
                readOnly
                rows={3}
                value={getWhatsAppTemplates(whatsAppModalClinic).qrPoster}
                className="w-full p-2.5 rounded-lg bg-slate-900 text-xs font-mono text-slate-300 border border-slate-700"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* REGENERATED PIN MODAL */}
      <Modal
        isOpen={regeneratedPinInfo !== null}
        onClose={() => setRegeneratedPinInfo(null)}
        title="تم توليد رمز مرور (PIN) جديد"
      >
        {regeneratedPinInfo && (
          <div className="space-y-4 text-center">
            <p className="text-xs text-slate-400">
              تم تحديث وتشفير رمز المرور لعيادة {regeneratedPinInfo.clinicName}.
            </p>
            <div className="p-6 rounded-2xl bg-slate-800 text-3xl font-black font-mono text-cyan-400 tracking-widest border border-slate-700">
              {regeneratedPinInfo.pin}
            </div>
            <Button
              variant="glow"
              size="md"
              onClick={() => handleCopy(regeneratedPinInfo.pin, 'regen-pin')}
              className="w-full font-bold"
            >
              {copiedKey === 'regen-pin' ? 'تم النسخ!' : 'نسخ الرمز الجديد'}
            </Button>
          </div>
        )}
      </Modal>

      {/* AUDIT LOG VIEWER MODAL */}
      <Modal
        isOpen={selectedAuditClinic !== null}
        onClose={() => setSelectedAuditClinic(null)}
        title={
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>سجل العمليات الإدارية: {selectedAuditClinic?.clinicName}</span>
          </div>
        }
        maxWidth="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-2">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">لا توجد عمليات مسجلة حتى الآن.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-mono">
                  <span className="font-bold text-indigo-400">{log.action}</span>
                  <span>{new Date(log.createdAt).toLocaleString('ar-EG')}</span>
                </div>
                <p className="text-white font-medium">{log.details}</p>
                <span className="text-[10px] text-slate-500 font-mono block">المسؤول: {log.actor}</span>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* DELETE CLINIC CONFIRMATION MODAL */}
      <Modal
        isOpen={deletingClinic !== null}
        onClose={() => !isDeletingClinic && setDeletingClinic(null)}
        title={
          <div className="flex items-center gap-2 text-rose-400">
            <Trash2 className="w-5 h-5" />
            <span>تأكيد حذف العيادة نهائياً ومسح بياناتها</span>
          </div>
        }
      >
        {deletingClinic && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>تحذير أمني: هذا الإجراء لا يمكن التراجع عنه!</span>
              </div>
              <p className="text-xs text-rose-300/90 leading-relaxed">
                أنت على وشك حذف عيادة <strong className="text-white font-black">{deletingClinic.clinicName}</strong> (كود: <span className="font-mono text-cyan-300">{deletingClinic.id}</span>). سيتم مسح قائمة الانتظار، سجلات المرضى، وكلمات المرور الخاصة بها فوراً.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">اسم العيادة:</span>
                <span className="font-bold text-white">{deletingClinic.clinicName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الطبيب:</span>
                <span className="text-cyan-300">{deletingClinic.doctorName || 'غير محدد'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الهاتف:</span>
                <span className="font-mono text-slate-300">{deletingClinic.phoneNumber}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={isDeletingClinic}
                onClick={() => setDeletingClinic(null)}
              >
                إلغاء التراجع
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={isDeletingClinic}
                onClick={handleConfirmDeleteClinic}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، احذف العيادة نهائياً</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 text-sm font-bold max-w-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300 shadow-emerald-500/20'
                : toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/50 text-rose-300 shadow-rose-500/20'
                : 'bg-indigo-950/95 border-indigo-500/50 text-indigo-300 shadow-indigo-500/20'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
