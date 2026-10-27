import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { soundEngine } from '../lib/audio';
import { 
  Clinic, 
  QueueEntry, 
  DailyStats,
  subscribeClinic, 
  subscribeQueue, 
  callNextPatient, 
  completePatient, 
  noShowPatient, 
  insertPriorityPatient,
  updateClinic,
  logAudit,
  setPatientSmsNotified,
  setPatientOnTheWay,
  db,
  auth
} from '../lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { smsService, SmsNotification } from '../lib/smsService';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { SynqraLogo } from '../components/ui/SynqraLogo';
import QRCode from 'qrcode';
import { QueueEfficiencyGauge } from '../components/charts/QueueEfficiencyGauge';
import { FlyingPatientAlert, FlyingAlertData } from '../components/ui/FlyingPatientAlert';
import { 
  Users, 
  BarChart3, 
  Settings, 
  PhoneCall, 
  CheckCircle2, 
  XCircle, 
  PauseCircle, 
  PlayCircle, 
  AlertTriangle, 
  Tv, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  Volume2, 
  Calendar, 
  Share2, 
  Download, 
  LogOut,
  Building2,
  ShieldCheck,
  MessageCircle,
  MessageSquare,
  Send,
  Smartphone,
  MapPin,
  CheckCheck,
  Activity,
  Plus,
  Car,
  Radio,
  X,
  BellRing,
  Navigation,
  QrCode,
  Upload,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';

interface ClinicDashboardPageProps {
  clinicId: string;
  onNavigate: (path: string) => void;
}

export const ClinicDashboardPage: React.FC<ClinicDashboardPageProps> = ({ clinicId, onNavigate }) => {
  const { t, isRtl, formatNumber } = useI18n();
  const { setWorld } = useTheme();

  useEffect(() => {
    setWorld('clinic');
    return () => setWorld('patient');
  }, [setWorld]);

  // Auth protection for clinic staff
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const isStaffSession = sessionStorage.getItem(`synqra_staff_auth_${clinicId}`) === 'true';
      if (!user && !isStaffSession && clinicId !== 'demo-clinic-cairo') {
        onNavigate('/clinic/login');
      }
    });
    return () => unsub();
  }, [clinicId, onNavigate]);

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'queue' | 'stats' | 'settings'
  const [activeTab, setActiveTab] = useState<'queue' | 'stats' | 'settings'>('queue');

  // Emergency Modal
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('ألم حاد / حالة عاجلة');
  const [isSubmittingEmergency, setIsSubmittingEmergency] = useState(false);

  // Pause Modal
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReasonInput, setPauseReasonInput] = useState('استراحة مؤقتة');

  // Settings State
  const [editName, setEditName] = useState('');
  const [editDoctorName, setEditDoctorName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('/icon.svg');
  const [editBrandColor, setEditBrandColor] = useState('#0ea5e9');
  const [editAvgMinutes, setEditAvgMinutes] = useState(10);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Action Calling State
  const [isCallingNext, setIsCallingNext] = useState(false);

  // EOD Summary Card Canvas Ref
  const summaryCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 7-Day Patient Flow Chart Type
  const [flowChartType, setFlowChartType] = useState<'area' | 'bar'>('area');

  // Smart Voice Isolation State (Sound plays on TV Screen by default, muted on Secretary Dashboard)
  const [playVoiceOnDashboard, setPlayVoiceOnDashboard] = useState<boolean>(false);

  // State-based Simulated Notification System
  const [patientNotifyStates, setPatientNotifyStates] = useState<Record<string, {
    status: 'idle' | 'sending' | 'delivered' | 'simulated';
    sentAt?: string;
    channel?: 'sms' | 'whatsapp';
    auto?: boolean;
  }>>({});
  const [autoNotifyApproaching, setAutoNotifyApproaching] = useState<boolean>(true);
  const [notificationToast, setNotificationToast] = useState<{
    patientName: string;
    queueNumber: number;
    message: string;
  } | null>(null);

  // Dedicated Clinic Booking QR Code & Printable Flyer
  const [bookingQrDataUrl, setBookingQrDataUrl] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [copiedBookingUrl, setCopiedBookingUrl] = useState<boolean>(false);
  const posterPrintCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Logo file upload state
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string>('');
  const [logoUploadSuccess, setLogoUploadSuccess] = useState<string>('');

  // Smart Flying Notifications for Patients "On The Way" & Reception Arrival (إشعارات متطايرة ذكية)
  const [flyingAlert, setFlyingAlert] = useState<FlyingAlertData | null>(null);
  const prevOnTheWayMapRef = useRef<Record<string, boolean>>({});
  const prevCheckedInMapRef = useRef<Record<string, boolean>>({});
  const isInitialQueueLoadRef = useRef<boolean>(true);
  const flyingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerFlyingAlert = (alertData: FlyingAlertData) => {
    soundEngine.playSmsChime();
    if (flyingTimerRef.current) clearTimeout(flyingTimerRef.current);
    setFlyingAlert(alertData);
    flyingTimerRef.current = setTimeout(() => {
      setFlyingAlert(null);
    }, 7000);
  };

  // Generate Booking QR Code
  useEffect(() => {
    if (typeof window !== 'undefined' && clinicId) {
      const bookingUrl = `${window.location.origin}/book/${clinicId}`;
      QRCode.toDataURL(bookingUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0284c7', light: '#ffffff' }
      }).then(setBookingQrDataUrl).catch(console.warn);
    }
  }, [clinicId]);

  const handleCopyBookingUrl = () => {
    if (typeof window !== 'undefined') {
      const bookingUrl = `${window.location.origin}/book/${clinicId}`;
      navigator.clipboard.writeText(bookingUrl);
      setCopiedBookingUrl(true);
      soundEngine.playClickSound();
      setTimeout(() => setCopiedBookingUrl(false), 2500);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUploadError('');
    setLogoUploadSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setEditLogoUrl(dataUrl);
        setLogoUploadSuccess('تم تحميل اللوجو من جهازك بنجاح! احفظ التعديلات لتطبيقه.');
        soundEngine.playClickSound();
      }
    };
    reader.onerror = () => {
      setLogoUploadError('حدث خطأ أثناء قراءة ملف الصورة، يرجى المحاولة مرة أخرى');
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadBookingPoster = async () => {
    const canvas = posterPrintCanvasRef.current;
    if (!canvas || !clinic) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 1600;

    // Premium background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1600);
    bgGrad.addColorStop(0, '#050a18');
    bgGrad.addColorStop(0.4, '#0b1329');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1600);

    // Outer cyber border frame
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 10;
    ctx.strokeRect(36, 36, 1128, 1528);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, 1104, 1504);

    // Clinic Name & Doctor
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(clinic.clinicName, 600, 160);

    if (clinic.doctorName) {
      ctx.fillStyle = clinic.brandColor || '#38bdf8';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(clinic.doctorName, 600, 220);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 28px sans-serif';
    ctx.fillText(clinic.specialty, 600, clinic.doctorName ? 275 : 230);

    // QR container box
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(270, 340, 660, 660, 36);
    ctx.fill();

    // Draw the QR Code image
    const bookingUrl = `${window.location.origin}/book/${clinicId}`;
    const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
      width: 600,
      margin: 1,
      color: { dark: '#0b1329', light: '#ffffff' }
    });
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => { qrImg.onload = resolve; });
    ctx.drawImage(qrImg, 300, 370, 600, 600);

    // Call to Action
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('امسح الرمز بكاميرا هاتفك لحجز دورك', 600, 1080);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('وتتبع تقدم الطابور بالزمن الفعلي دون انتظار في العيادة', 600, 1140);

    // Direct booking URL box
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(140, 1220, 920, 90, 20);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(bookingUrl, 600, 1276);

    // Footer Watermark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('منظومة دورك لايف • DAWRAK LIVE', 600, 1420);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 22px sans-serif';
    ctx.fillText('نظام إدارة طوابير العيادات الطبية الذكي من سينقرا SYNQRA', 600, 1470);

    const link = document.createElement('a');
    link.download = `Dawrak_Live_Booking_QR_${clinic.clinicName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // SMS Notification Simulation State
  const [activeSmsPreview, setActiveSmsPreview] = useState<SmsNotification | null>(null);
  const [isSendingSms, setIsSendingSms] = useState<string | null>(null);
  const [smsHistory, setSmsHistory] = useState<SmsNotification[]>([]);

  useEffect(() => {
    return smsService.subscribe((list) => {
      setSmsHistory(list);
    });
  }, []);

  const handleNotifyPatient = async (patient: QueueEntry, isAutomated = false) => {
    if (!clinic) return;
    setIsSendingSms(patient.id);

    // Update local state to sending
    setPatientNotifyStates((prev) => ({
      ...prev,
      [patient.id]: { status: 'sending', channel: 'sms', auto: isAutomated }
    }));

    const peopleAhead = Math.max(0, patient.queueNumber - (clinic.currentServingNumber || 0) - 1);
    try {
      const notif = await smsService.sendTurnApproachingSms({
        patientPhone: patient.patientPhone,
        patientName: patient.patientName,
        queueNumber: patient.queueNumber,
        clinicName: clinic.clinicName,
        peopleAhead
      });

      // Play soft chime
      soundEngine.playSmsChime();

      // Update state to delivered
      const deliveredTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      setPatientNotifyStates((prev) => ({
        ...prev,
        [patient.id]: { 
          status: 'delivered', 
          channel: 'sms', 
          sentAt: deliveredTime,
          auto: isAutomated 
        }
      }));

      await setPatientSmsNotified(clinicId, patient.id);
      await logAudit(clinicId, 'SMS_NOTIFY', 'STAFF', `Sent approaching turn SMS to ${patient.patientName} (${patient.patientPhone}) [${isAutomated ? 'AUTOMATED' : 'MANUAL'}]`);
      
      if (!isAutomated) {
        setActiveSmsPreview(notif);
      } else {
        setNotificationToast({
          patientName: patient.patientName,
          queueNumber: patient.queueNumber,
          message: `تم إرسال إشعار آلي للمريض باقتراب الدور (${peopleAhead} متبقي أمامه)`
        });
        setTimeout(() => setNotificationToast(null), 4000);
      }
    } finally {
      setIsSendingSms(null);
    }
  };

  // Real-time Listeners
  useEffect(() => {
    const unsubClinic = subscribeClinic(clinicId, (data) => {
      setClinic(data);
      if (data) {
        setEditName(data.clinicName);
        setEditDoctorName(data.doctorName || '');
        setEditSpecialty(data.specialty);
        setEditPhone(data.phoneNumber || '');
        setEditLogoUrl(data.logoUrl || '/icon.svg');
        setEditBrandColor(data.brandColor || '#0ea5e9');
        setEditAvgMinutes(data.avgConsultMinutes || 10);
      }
      setLoading(false);
    });

    const unsubQueue = subscribeQueue(clinicId, (data) => {
      setQueue(data);

      // Detect newly marked "on-the-way" or "checked-in" patients
      if (!isInitialQueueLoadRef.current) {
        for (const item of data) {
          const wasOnTheWay = !!prevOnTheWayMapRef.current[item.id];
          const nowOnTheWay = !!item.onTheWay;

          if (!wasOnTheWay && nowOnTheWay) {
            triggerFlyingAlert({
              id: item.id,
              patientName: item.patientName,
              queueNumber: item.queueNumber,
              patientPhone: item.patientPhone,
              type: 'on_the_way',
              estimatedArrivalMinutes: item.estimatedArrivalMinutes || 10,
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            });
            break;
          }

          const wasCheckedIn = !!prevCheckedInMapRef.current[item.id];
          const nowCheckedIn = !!item.checkedInReception;
          if (!wasCheckedIn && nowCheckedIn) {
            triggerFlyingAlert({
              id: item.id,
              patientName: item.patientName,
              queueNumber: item.queueNumber,
              patientPhone: item.patientPhone,
              type: 'arrived_reception',
              timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            });
            break;
          }
        }
      } else {
        isInitialQueueLoadRef.current = false;
      }

      // Keep tracked maps
      const nextOnWayMap: Record<string, boolean> = {};
      const nextCheckMap: Record<string, boolean> = {};
      data.forEach((item) => {
        if (item.onTheWay) nextOnWayMap[item.id] = true;
        if (item.checkedInReception) nextCheckMap[item.id] = true;
      });
      prevOnTheWayMapRef.current = nextOnWayMap;
      prevCheckedInMapRef.current = nextCheckMap;
    });

    // Fetch daily stats
    const today = new Date().toISOString().split('T')[0];
    getDoc(doc(db, 'clinics', clinicId, 'dailyStats', today)).then((snap) => {
      if (snap.exists()) {
        setDailyStats({ id: snap.id, ...(snap.data() as Omit<DailyStats, 'id'>) });
      }
    });

    return () => {
      unsubClinic();
      unsubQueue();
      if (flyingTimerRef.current) clearTimeout(flyingTimerRef.current);
    };
  }, [clinicId]);

  // STRICT SUBSCRIPTION GATE
  // If subscriptionStatus is paused or expired, render ONLY full-screen lock
  if (!loading && clinic) {
    const isPaused = clinic.subscriptionStatus === 'paused';
    const isExpired = clinic.subscriptionEndsAt && new Date(clinic.subscriptionEndsAt).getTime() < Date.now();

    if (isPaused || isExpired) {
      return (
        <div className="min-h-screen pt-28 px-4 flex items-center justify-center">
          <div className="max-w-md w-full text-center p-8 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">{t('subscriptionInactive')}</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t('subscriptionInactiveDesc')}
            </p>
            <a
              href="https://wa.me/201225161076?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%AA%D8%AC%D8%AF%D9%8A%D8%AF%20%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83%20%D8%AF%D9%88%D8%B1%D9%83%20%D9%84%D8%A7%D9%8A%D9%81%20%D9%84%D8%B9%D9%8A%D8%A7%D8%AF%D8%AA%D9%8A"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{t('contactSynqraWhatsapp')} (01225161076)</span>
            </a>
          </div>
        </div>
      );
    }
  }

  // Handlers for Queue
  const handleCallNext = async () => {
    setIsCallingNext(true);
    try {
      const nextNum = await callNextPatient(clinicId);
      if (nextNum) {
        // Smart Audio Isolation: By default, dashboard is silent so secretary isn't disrupted;
        // The waiting room TV display screen receives Firestore real-time update and announces loudly!
        if (playVoiceOnDashboard) {
          soundEngine.announceNumber(nextNum);
        } else {
          soundEngine.playClickSound();
        }

        // Automated notification check for approaching patient (e.g. 2 places ahead)
        if (autoNotifyApproaching) {
          const upcoming = queue
            .filter((q) => q.status === 'waiting' && q.queueNumber > nextNum)
            .sort((a, b) => a.queueNumber - b.queueNumber);
          
          if (upcoming.length > 0) {
            const nextInLine = upcoming[0];
            const alreadyNotified = patientNotifyStates[nextInLine.id]?.status === 'delivered' || patientNotifyStates[nextInLine.id]?.status === 'simulated' || nextInLine.smsNotifiedAt;
            if (!alreadyNotified) {
              handleNotifyPatient(nextInLine, true);
            }
          }
        }
      }
    } finally {
      setIsCallingNext(false);
    }
  };

  const handleCallSpecific = async (entryId: string) => {
    const nextNum = await callNextPatient(clinicId, entryId);
    if (nextNum) {
      if (playVoiceOnDashboard) {
        soundEngine.announceNumber(nextNum);
      } else {
        soundEngine.playClickSound();
      }
    }
  };

  const handleComplete = async (entryId: string) => {
    await completePatient(clinicId, entryId);
  };

  const handleNoShow = async (entryId: string) => {
    await noShowPatient(clinicId, entryId);
  };

  const handleTogglePause = async () => {
    if (clinic?.isPaused) {
      await updateClinic(clinicId, { isPaused: false, pauseReason: '' });
      await logAudit(clinicId, 'RESUME_QUEUE', 'STAFF', 'Resumed queue booking');
    } else {
      setIsPauseModalOpen(true);
    }
  };

  const handleConfirmPause = async () => {
    await updateClinic(clinicId, { isPaused: true, pauseReason: pauseReasonInput });
    await logAudit(clinicId, 'PAUSE_QUEUE', 'STAFF', `Paused queue with reason: ${pauseReasonInput}`);
    setIsPauseModalOpen(false);
  };

  const handleTestFlyingAlert = () => {
    const samplePatient = waitingPatients[0] || {
      id: 'demo-patient-sample',
      patientName: 'م. أحمد الشناوي',
      queueNumber: (clinic?.currentServingNumber || 14) + 1,
      patientPhone: '01225161076',
      estimatedArrivalMinutes: 8
    };

    triggerFlyingAlert({
      id: samplePatient.id,
      patientName: samplePatient.patientName,
      queueNumber: samplePatient.queueNumber,
      patientPhone: samplePatient.patientPhone,
      type: 'on_the_way',
      estimatedArrivalMinutes: 8,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    });
  };

  const handleTogglePatientOnTheWay = async (patient: QueueEntry) => {
    try {
      const nextState = !patient.onTheWay;
      const entryRef = doc(db, 'clinics', clinicId, 'queue', patient.id);
      if (nextState) {
        await setPatientOnTheWay(clinicId, patient.id, 10);
      } else {
        await updateDoc(entryRef, {
          onTheWay: false
        });
      }
    } catch (err) {
      console.error('Failed to toggle onTheWay:', err);
    }
  };

  const handleCreateEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyName.trim()) return;
    setIsSubmittingEmergency(true);
    try {
      await insertPriorityPatient(clinicId, {
        patientName: emergencyName.trim(),
        visitReason: emergencyReason.trim()
      });
      await logAudit(clinicId, 'INSERT_EMERGENCY', 'STAFF', `Inserted emergency patient: ${emergencyName.trim()}`);
      setEmergencyName('');
      setIsEmergencyModalOpen(false);
    } finally {
      setIsSubmittingEmergency(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateClinic(clinicId, {
      clinicName: editName.trim(),
      doctorName: editDoctorName.trim() || undefined,
      specialty: editSpecialty.trim(),
      phoneNumber: editPhone.trim(),
      logoUrl: editLogoUrl.trim() || '/icon.svg',
      brandColor: editBrandColor,
      avgConsultMinutes: Number(editAvgMinutes)
    });
    await logAudit(clinicId, 'UPDATE_PROFILE', 'STAFF', 'Updated clinic profile, doctor name, logo and brand colors');
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  // Generate End-of-Day Branded Summary Card on Canvas
  const generateEodCanvas = () => {
    const canvas = summaryCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1080;

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
    bgGrad.addColorStop(0, '#0b1120');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Decorative Circuit Rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(540, 540, 420, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(540, 540, 320, 0, Math.PI * 2);
    ctx.stroke();

    // Top Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(clinic?.clinicName || 'التقرير اليومي للعيادة', 540, 140);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 28px sans-serif';
    ctx.fillText(`تقرير الأداء اليومي • ${new Date().toLocaleDateString('ar-EG')}`, 540, 190);

    // Metric 1: Total Served Patients
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(140, 270, 800, 200, 30);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 28px sans-serif';
    ctx.fillText('إجمالي الحالات المكتملة اليوم', 540, 330);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 84px sans-serif';
    const totalServed = dailyStats?.totalServed || queue.filter((q) => q.status === 'completed').length;
    ctx.fillText(String(totalServed), 540, 425);

    // Metric 2: Avg Wait Time
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(140, 510, 380, 180, 25);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px sans-serif';
    ctx.fillText('متوسط وقت الانتظار', 330, 565);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(`${dailyStats?.avgWaitMinutes || clinic?.avgConsultMinutes || 12} دقيقة`, 330, 640);

    // Metric 3: Peak Busy Hour
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(560, 510, 380, 180, 25);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px sans-serif';
    ctx.fillText('ساعة الذروة', 750, 565);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(`${dailyStats?.peakHour || 12}:00 م`, 750, 640);

    // SYNQRA Watermark Footer
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('SYNQRA • DAWRAK LIVE', 540, 960);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 22px sans-serif';
    ctx.fillText('نظام إدارة طوابير العيادات الطبية بالزمن الفعلي', 540, 1005);
  };

  const handleDownloadEodSummary = () => {
    generateEodCanvas();
    const canvas = summaryCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Dawrak_Live_Report_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShareEodWhatsApp = () => {
    generateEodCanvas();
    const totalServed = dailyStats?.totalServed || queue.filter((q) => q.status === 'completed').length;
    const avgWait = dailyStats?.avgWaitMinutes || clinic?.avgConsultMinutes || 12;
    const msg = encodeURIComponent(
      `📊 تقرير أداء ${clinic?.clinicName || 'العيادة'} اليوم عبر نظام دورك لايف من سينقرا:\n` +
      `✅ إجمالي الحالات التي تم فحصها: ${totalServed}\n` +
      `⏱️ متوسط وقت الانتظار: ${avgWait} دقيقة\n` +
      `✨ تم تنظيم الطابور بالكامل وبث الأدوار صوتياً بالزمن الفعلي.`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (loading || !clinic) {
    return (
      <div className="min-h-screen pt-28 px-4 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  const waitingPatients = queue.filter((q) => q.status === 'waiting');
  const calledPatients = queue.filter((q) => q.status === 'called');
  const completedPatients = queue.filter((q) => q.status === 'completed');

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
      {/* GLOBAL MOTION/REACT FLYING PATIENT ALERT TOAST (WORLD-CLASS EXIT ANIMATIONS) */}
      <FlyingPatientAlert
        alert={flyingAlert}
        onDismiss={() => setFlyingAlert(null)}
        onViewPatient={(patientId) => {
          setActiveTab('queue');
          setTimeout(() => {
            const el = document.getElementById(`patient-${patientId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }}
      />

      {/* Hidden Canvas for High-Resolution Printable Clinic Stand/Flyer */}
      <canvas ref={posterPrintCanvasRef} className="hidden" />

      {/* Top Clinic Command Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl mb-8">
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center p-2.5 border border-slate-700 shadow-inner shrink-0"
            style={{ backgroundColor: `${clinic.brandColor || '#0ea5e9'}20` }}
          >
            {clinic.logoUrl ? (
              <img src={clinic.logoUrl} alt={clinic.clinicName} className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-7 h-7 text-cyan-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                لوحة القيادة الطبية
              </span>
              {clinic.isPaused && (
                <Badge variant="paused">{t('clinicPausedTag')}</Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{clinic.clinicName}</h1>
            <p className="text-xs text-slate-400">{clinic.specialty}</p>
          </div>
        </div>

        {/* Action Shortcuts: Booking QR & Print + Flying Alert Test + TV Display Mode + Audio + Logout */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Booking QR Code & Flyer Modal Trigger */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsQrModalOpen(true)}
            className="border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-500/15"
            title="رمز QR المخصص لحجز العيادة وملصق الطباعة"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span className="font-bold">QR الحجز والطباعة</span>
          </Button>

          {/* Test Flying Alert Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestFlyingAlert}
            className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            title="تجربة الإشعار الطائر في الداشبورد"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">تجربة إشعار طائر</span>
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={() => onNavigate(`/clinic/${clinicId}/display`)}
            className="flex-1 sm:flex-initial shadow-[0_0_20px_rgba(6,182,212,0.35)]"
            title="فتح شاشة الانتظار للتلفزيون والتابلت"
          >
            <Tv className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span className="font-bold">شاشة العرض (TV)</span>
          </Button>

          {/* Smart Audio Isolation Toggle: Default is OFF for secretary, TV handles audio */}
          <Button
            variant={playVoiceOnDashboard ? 'glow' : 'secondary'}
            size="sm"
            onClick={() => {
              const next = !playVoiceOnDashboard;
              setPlayVoiceOnDashboard(next);
              if (next) {
                const current = clinic.currentServingNumber || 14;
                soundEngine.announceNumber(current);
              }
            }}
            className={`text-xs transition-colors ${
              playVoiceOnDashboard
                ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={
              playVoiceOnDashboard
                ? 'صوت النداء مفعّل محلياً في لوحة السكرتيرة'
                : 'صوت النداء موجه تلقائياً لشاشة التلفزيون (صامت بلوحة السكرتيرة لمنع الإزعاج)'
            }
          >
            <Volume2 className={`w-4 h-4 ${playVoiceOnDashboard ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">
              {playVoiceOnDashboard ? 'صوت اللوحة (مفعّل)' : 'صوت التلفزيون (نشط تلقائياً)'}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await signOut(auth);
              } catch {}
              sessionStorage.removeItem(`synqra_staff_auth_${clinicId}`);
              localStorage.removeItem('dawrak_clinic_session');
              onNavigate('/clinic/login');
            }}
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* DASHBOARD TABS NAVIGATION */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 mb-6 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('tabQueue')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
            {waitingPatients.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'stats'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t('tabStats')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t('tabSettings')}</span>
        </button>
      </div>

      {/* TAB 1: LIVE QUEUE COMMAND */}
      {activeTab === 'queue' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Simulated Notification Toast */}
          <AnimatePresence>
            {notificationToast && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="p-4 rounded-2xl bg-cyan-950/90 border border-cyan-400/50 text-cyan-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl shadow-cyan-950/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-cyan-300 block">
                      إشعار آلي باقتراب الدور:
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-white">
                      {notificationToast.message} ({notificationToast.patientName})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-300 bg-cyan-900/60 px-3 py-1 rounded-full border border-cyan-700/60">
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>تم التسليم بنجاح ✓</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smart Audio Broadcast Status Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white">البث الصوتي الذكي للأدوار:</span>
              <span className="text-slate-400">
                {playVoiceOnDashboard
                  ? 'مفعّل في لوحة السكرتيرة وشاشة العرض معاً'
                  : 'موجه تلقائياً لسماعات شاشة التلفزيون (TV) في صالة الانتظار — صامت بالسكرتيرة'}
              </span>
            </div>

            {/* Auto-Notify Toggle Switch */}
            <button
              type="button"
              onClick={() => setAutoNotifyApproaching(!autoNotifyApproaching)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                autoNotifyApproaching
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>الإشعار الآلي للمرضى: {autoNotifyApproaching ? 'مفعّل ✓' : 'معطّل'}</span>
            </button>
          </div>

          {/* Main Command Bar: Call Next Button + Pause Toggle + Emergency Insert */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card elevation="glow" className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 to-cyan-950/40">
              <div className="text-center sm:text-start">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                  الرقم جاري خدمته حالياً
                </span>
                <div className="text-5xl font-black text-white">
                  <AnimatedNumber value={clinic.currentServingNumber || 0} />
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  {waitingPatients.length} مريض في الانتظار
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full sm:w-auto">
                <Button
                  variant="glow"
                  size="lg"
                  loading={isCallingNext}
                  disabled={waitingPatients.length === 0 || isCallingNext}
                  onClick={handleCallNext}
                  className="font-black text-base shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                >
                  <PhoneCall className="w-5 h-5 animate-pulse" />
                  <span>{t('callNext')}</span>
                </Button>
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <Button
                variant={clinic.isPaused ? 'glow' : 'secondary'}
                size="md"
                onClick={handleTogglePause}
                className="w-full justify-between font-bold"
              >
                <div className="flex items-center gap-2">
                  {clinic.isPaused ? <PlayCircle className="w-4 h-4 text-emerald-400" /> : <PauseCircle className="w-4 h-4 text-amber-400" />}
                  <span>{clinic.isPaused ? t('resumeQueueBtn') : t('pauseQueueBtn')}</span>
                </div>
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsEmergencyModalOpen(true)}
                className="w-full justify-between font-bold border-amber-500/40 hover:bg-amber-500/10 text-amber-300"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>{t('emergencyInsertBtn')}</span>
                </div>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </Button>
            </div>
          </div>

          {/* REAL-TIME QUEUE EFFICIENCY GAUGE */}
          <QueueEfficiencyGauge
            waitTimeMinutes={dailyStats?.avgWaitMinutes || clinic.avgConsultMinutes || 12}
            avgConsultMinutes={clinic.avgConsultMinutes || 10}
            waitingCount={waitingPatients.length}
            totalServedToday={dailyStats?.totalServed || completedPatients.length}
          />

          {/* DEDICATED CLINIC BOOKING QR & PRINTABLE STAND CARD */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4 text-start">
              {bookingQrDataUrl ? (
                <div 
                  onClick={() => setIsQrModalOpen(true)}
                  className="p-2 rounded-2xl bg-white shadow-md border border-slate-700 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  title="اضغط لتكبير الرمز والطباعة"
                >
                  <img src={bookingQrDataUrl} alt="Booking QR" className="w-16 h-16 object-contain rounded-lg" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0">
                  <QrCode className="w-8 h-8 text-cyan-400" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-cyan-400 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>رمز QR ورابط الحجز المباشر المخصص للعيادة</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    يعمل حقيقي في أي وقت ومكان
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                  {typeof window !== 'undefined' ? `${window.location.origin}/book/${clinicId}` : `/book/${clinicId}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="secondary" size="sm" onClick={handleCopyBookingUrl}>
                {copiedBookingUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBookingUrl ? 'تم نسخ الرابط ✓' : 'نسخ رابط الحجز'}</span>
              </Button>
              <Button variant="glow" size="sm" onClick={() => setIsQrModalOpen(true)}>
                <Printer className="w-3.5 h-3.5" />
                <span>عرض وطباعة الملصق</span>
              </Button>
            </div>
          </div>

          {/* Currently Called / In-Consultation Patient Banner */}
          {calledPatients.length > 0 && (
            <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
              <h3 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">
                الحالة المستدعاة حالياً في غرفة الكشف:
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white text-2xl font-black font-mono flex items-center justify-center shrink-0">
                    {calledPatients[0].queueNumber}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      {calledPatients[0].patientName}
                    </h4>
                    <span className="text-xs text-slate-400 font-mono">
                      {calledPatients[0].patientPhone} • {calledPatients[0].visitReason}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleComplete(calledPatients[0].id)}
                    className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('markCompleted')}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNoShow(calledPatients[0].id)}
                    className="text-rose-400 hover:bg-rose-500/10"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{t('markNoShow')}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Waiting Patients List (Full Patient Names visible here only) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center justify-between">
              <span>قائمة الانتظار النشطة ({waitingPatients.length})</span>
              <span className="text-xs text-slate-500 font-normal">المرضى القادمون بالترتيب</span>
            </h3>

            {waitingPatients.length === 0 ? (
              <div className="text-center py-12 p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">{t('waitingPatientsEmpty')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {waitingPatients.map((patient) => (
                  <motion.div
                    key={patient.id}
                    id={`patient-${patient.id}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                      patient.isPriority
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-lg ${
                        patient.isPriority ? 'bg-amber-500 text-black' : 'bg-slate-800 text-white'
                      }`}>
                        {patient.queueNumber}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white">
                            {patient.patientName}
                          </span>
                          {patient.isPriority && (
                            <Badge variant="priority">{t('priorityTag')}</Badge>
                          )}
                          {patient.checkedInReception && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              <span>حاضر بالعيادة (QR)</span>
                            </span>
                          )}
                          {patient.onTheWay && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                              <span>🚗 في الطريق ({patient.estimatedArrivalMinutes || 10} د)</span>
                            </span>
                          )}
                          {patient.smsNotifiedAt && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                              <CheckCheck className="w-3 h-3 text-cyan-400" />
                              <span>أُرسل SMS</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {patient.patientPhone} • {patient.visitReason}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* State-Based Simulated 'Notify Patient' System */}
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={isSendingSms === patient.id}
                        disabled={isSendingSms === patient.id}
                        onClick={() => handleNotifyPatient(patient, false)}
                        className={`text-xs font-bold transition-all ${
                          patientNotifyStates[patient.id]?.status === 'delivered' || patientNotifyStates[patient.id]?.status === 'simulated' || patient.smsNotifiedAt
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10'
                        }`}
                        title="إرسال إشعار SMS آلي للمريض باقتراب دوره"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>
                          {patientNotifyStates[patient.id]?.status === 'delivered' || patientNotifyStates[patient.id]?.status === 'simulated' || patient.smsNotifiedAt
                            ? `تم الإشعار ✓ ${patientNotifyStates[patient.id]?.sentAt ? `(${patientNotifyStates[patient.id]?.sentAt})` : ''}`
                            : 'إشعار المريض'}
                        </span>
                      </Button>

                      {/* Call Specific Patient */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCallSpecific(patient.id)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
                        <span>استدعاء هذا الرقم</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB 2: STATS & EOD REPORT */}
      {activeTab === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card elevation="raised" className="text-center p-5 bg-slate-900 border-slate-800">
              <span className="text-xs text-slate-400 font-bold block mb-1">{t('todayServed')}</span>
              <div className="text-4xl font-black text-emerald-400 my-1">
                <AnimatedNumber value={dailyStats?.totalServed || completedPatients.length} />
              </div>
              <span className="text-[11px] text-slate-500">حالات كشف مكتملة</span>
            </Card>

            <Card elevation="raised" className="text-center p-5 bg-slate-900 border-slate-800">
              <span className="text-xs text-slate-400 font-bold block mb-1">{t('avgWait')}</span>
              <div className="text-4xl font-black text-cyan-400 my-1">
                <AnimatedNumber value={dailyStats?.avgWaitMinutes || clinic.avgConsultMinutes || 12} />
                <span className="text-base text-slate-400 ms-1">{t('minutes')}</span>
              </div>
              <span className="text-[11px] text-slate-500">متوسط وقت الانتظار اليوم</span>
            </Card>

            <Card elevation="raised" className="text-center p-5 bg-slate-900 border-slate-800">
              <span className="text-xs text-slate-400 font-bold block mb-1">{t('peakHour')}</span>
              <div className="text-4xl font-black text-amber-400 my-1 font-mono">
                {dailyStats?.peakHour || 12}:00
              </div>
              <span className="text-[11px] text-slate-500">ساعة الذروة المسجلة</span>
            </Card>
          </div>

          {/* REAL-TIME QUEUE EFFICIENCY GAUGE */}
          <QueueEfficiencyGauge
            waitTimeMinutes={dailyStats?.avgWaitMinutes || clinic.avgConsultMinutes || 12}
            avgConsultMinutes={clinic.avgConsultMinutes || 10}
            waitingCount={waitingPatients.length}
            totalServedToday={dailyStats?.totalServed || completedPatients.length}
          />

          {/* 7-Day Patient Flow Data Visualizer with Recharts */}
          <Card elevation="raised" className="p-6 sm:p-7 bg-slate-900 border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <span>معدل تدفق المرضى خلال آخر 7 أيام (Patient Flow)</span>
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  مقارنة يومية مباشرة بين إجمالي الوافدين (Arrivals) والكشوفات المكتملة (Completions)
                </p>
              </div>

              {/* Chart Mode Switcher: Area vs Bar */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFlowChartType('area')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    flowChartType === 'area'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  منحنى انسيابي (Area)
                </button>
                <button
                  type="button"
                  onClick={() => setFlowChartType('bar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    flowChartType === 'bar'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  أعمدة مقارنة (Bars)
                </button>
              </div>
            </div>

            {/* 7-Day Quick Metric Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
              <div>
                <span className="text-[11px] text-slate-400 block">إجمالي الوافدين 7 أيام</span>
                <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">433</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">الحالات المكتملة</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">417</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">نسبة الإنجاز الكلية</span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono">96.3%</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">يوم الذروة الأسبوعي</span>
                <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">الخميس (85)</span>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {flowChartType === 'area' ? (
                  <AreaChart
                    data={[
                      { day: 'السبت', date: '16 أكتوبر', arrivals: 42, completions: 40, avgWait: 11 },
                      { day: 'الأحد', date: '17 أكتوبر', arrivals: 58, completions: 55, avgWait: 14 },
                      { day: 'الإثنين', date: '18 أكتوبر', arrivals: 64, completions: 61, avgWait: 15 },
                      { day: 'الثلاثاء', date: '19 أكتوبر', arrivals: 51, completions: 49, avgWait: 12 },
                      { day: 'الأربعاء', date: '20 أكتوبر', arrivals: 73, completions: 70, avgWait: 16 },
                      { day: 'الخميس', date: '21 أكتوبر', arrivals: 85, completions: 82, avgWait: 18 },
                      {
                        day: 'اليوم',
                        date: '22 أكتوبر',
                        arrivals: Math.max(38, (dailyStats?.totalServed || completedPatients.length) + waitingPatients.length + 4),
                        completions: Math.max(26, dailyStats?.totalServed || completedPatients.length),
                        avgWait: dailyStats?.avgWaitMinutes || clinic.avgConsultMinutes || 12
                      }
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="flowGradArrivals" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="flowGradCompletions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as {
                            day: string;
                            date: string;
                            arrivals: number;
                            completions: number;
                            avgWait: number;
                          };
                          const rate = Math.round((data.completions / data.arrivals) * 100);
                          return (
                            <div className="p-3.5 rounded-2xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-xs space-y-1.5 font-sans">
                              <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                                <span>{data.day} ({data.date})</span>
                                <span className="text-[10px] text-cyan-400 font-mono">الإنجاز: {rate}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-cyan-300">
                                <span>الوافدون (Arrivals):</span>
                                <span className="font-mono font-bold text-white">{data.arrivals}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-emerald-300">
                                <span>المكتملة (Completions):</span>
                                <span className="font-mono font-bold text-white">{data.completions}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                                <span>متوسط الانتظار:</span>
                                <span className="font-mono text-cyan-400">{data.avgWait} دقيقة</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="arrivals"
                      name="إجمالي الوافدين (Arrivals)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#flowGradArrivals)"
                    />
                    <Area
                      type="monotone"
                      dataKey="completions"
                      name="الكشوفات المكتملة (Completions)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#flowGradCompletions)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={[
                      { day: 'السبت', date: '16 أكتوبر', arrivals: 42, completions: 40, avgWait: 11 },
                      { day: 'الأحد', date: '17 أكتوبر', arrivals: 58, completions: 55, avgWait: 14 },
                      { day: 'الإثنين', date: '18 أكتوبر', arrivals: 64, completions: 61, avgWait: 15 },
                      { day: 'الثلاثاء', date: '19 أكتوبر', arrivals: 51, completions: 49, avgWait: 12 },
                      { day: 'الأربعاء', date: '20 أكتوبر', arrivals: 73, completions: 70, avgWait: 16 },
                      { day: 'الخميس', date: '21 أكتوبر', arrivals: 85, completions: 82, avgWait: 18 },
                      {
                        day: 'اليوم',
                        date: '22 أكتوبر',
                        arrivals: Math.max(38, (dailyStats?.totalServed || completedPatients.length) + waitingPatients.length + 4),
                        completions: Math.max(26, dailyStats?.totalServed || completedPatients.length),
                        avgWait: dailyStats?.avgWaitMinutes || clinic.avgConsultMinutes || 12
                      }
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as {
                            day: string;
                            date: string;
                            arrivals: number;
                            completions: number;
                            avgWait: number;
                          };
                          const rate = Math.round((data.completions / data.arrivals) * 100);
                          return (
                            <div className="p-3.5 rounded-2xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl text-xs space-y-1.5 font-sans">
                              <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                                <span>{data.day} ({data.date})</span>
                                <span className="text-[10px] text-cyan-400 font-mono">الإنجاز: {rate}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-cyan-300">
                                <span>الوافدون (Arrivals):</span>
                                <span className="font-mono font-bold text-white">{data.arrivals}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-emerald-300">
                                <span>المكتملة (Completions):</span>
                                <span className="font-mono font-bold text-white">{data.completions}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                    />
                    <Bar
                      dataKey="arrivals"
                      name="إجمالي الوافدين (Arrivals)"
                      fill="#06b6d4"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="completions"
                      name="الكشوفات المكتملة (Completions)"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>

          {/* END-OF-DAY BRANDED SUMMARY CARD GENERATOR & WHATSAPP SHARE */}
          <Card elevation="glow" className="p-6 bg-slate-900 border-cyan-500/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>{t('eodSummaryCard')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  توليد بطاقة ختامية مرئية عالية الدقة لمشاركتها مباشرة مع الطبيب أو إداريي العيادة عبر واتساب.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button variant="secondary" size="sm" onClick={handleDownloadEodSummary}>
                  <Download className="w-4 h-4" />
                  <span>{t('downloadSummaryCard')}</span>
                </Button>
                <Button variant="glow" size="sm" onClick={handleShareEodWhatsApp} className="bg-emerald-600 hover:bg-emerald-500">
                  <MessageCircle className="w-4 h-4" />
                  <span>{t('shareSummaryWhatsApp')}</span>
                </Button>
              </div>
            </div>

            {/* Hidden Canvas for rendering */}
            <canvas ref={summaryCanvasRef} className="hidden" />
          </Card>
        </motion.div>
      )}

      {/* TAB 3: CLINIC SETTINGS & BRANDING */}
      {activeTab === 'settings' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Real-time Live Preview Card */}
          <Card elevation="glow" className="p-6 bg-slate-900 border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  معاينة مظهر العيادة الحي للمرضى والشاشات
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE PREVIEW
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-start">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center p-2 border shadow-lg shrink-0"
                  style={{
                    backgroundColor: `${editBrandColor}15`,
                    borderColor: `${editBrandColor}40`
                  }}
                >
                  <img
                    src={editLogoUrl || '/icon.svg'}
                    alt="Logo"
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{editName || 'اسم العيادة'}</h3>
                  <div className="flex items-center gap-2 text-xs mt-1">
                    {editDoctorName && (
                      <span className="font-bold" style={{ color: editBrandColor }}>
                        {editDoctorName} •
                      </span>
                    )}
                    <span className="text-slate-400">{editSpecialty || 'التخصص الطبي'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                    {editPhone ? `هاتف: ${editPhone}` : 'الرقم غير محدد'}
                  </div>
                </div>
              </div>

              <div className="text-end shrink-0">
                <span className="text-[10px] text-slate-400 block mb-1">الطاقة الاستيعابية التقديرية</span>
                <span className="text-xl font-black font-mono text-cyan-400">
                  ~{Math.round(60 / (editAvgMinutes || 10))} كشف/ساعة
                </span>
                <span className="text-[10px] text-slate-500 block">
                  (بمعدل {editAvgMinutes} دقيقة للحالة)
                </span>
              </div>
            </div>
          </Card>

          {/* Form Card */}
          <Card elevation="raised" className="p-6 sm:p-8 bg-slate-900 border-slate-800">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <span>{t('clinicProfile')}</span>
            </h2>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t('clinicNameLabel')}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="مثال: مجمع الشفاء التخصصي"
                  required
                />

                <Input
                  label="اسم الطبيب المعالج"
                  value={editDoctorName}
                  onChange={(e) => setEditDoctorName(e.target.value)}
                  placeholder="مثال: د. أحمد الشريف"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t('specialtyLabel')}
                  value={editSpecialty}
                  onChange={(e) => setEditSpecialty(e.target.value)}
                  placeholder="مثال: طب وجراحة العيون"
                  required
                />

                <Input
                  label="رقم الهاتف المسجل والتواصل"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="01012345678"
                  dir="ltr"
                />
              </div>

              {/* Logo Selection Presets */}
              <div className="space-y-2 text-start">
                <label className="text-xs font-semibold text-slate-300">
                  أيقونة وشعار العيادة (اختر قالباً طبياً أو ضع رابطاً مخصصاً)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: 'شعار المنظومة', url: '/icon.svg' },
                    {
                      label: 'عيون / بصريات',
                      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2306b6d4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z'/><circle cx='12' cy='12' r='3'/></svg>"
                    },
                    {
                      label: 'قلب / أوعية',
                      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23f43f5e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'/></svg>"
                    },
                    {
                      label: 'أسنان / فك',
                      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M8 2h8a4 4 0 0 1 4 4v3a8 8 0 0 1-5 7.4V22a1 1 0 0 1-2 0v-4h-2v4a1 1 0 0 1-2 0v-5.6A8 8 0 0 1 4 9V6a4 4 0 0 1 4-4Z'/></svg>"
                    },
                    {
                      label: 'سماعة طبية',
                      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2310b981' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3'/><circle cx='20' cy='10' r='2'/></svg>"
                    }
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditLogoUrl(p.url)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        editLogoUrl === p.url
                          ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-6 h-6 object-contain" />
                      <span className="text-[10px] text-slate-300 font-medium truncate w-full text-center">
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
                {/* Device File Upload & Logo URL */}
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Device Upload Zone */}
                    <div 
                      onClick={() => logoFileInputRef.current?.click()}
                      className="p-3.5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-500/70 bg-slate-950/70 hover:bg-slate-950 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
                    >
                      <input
                        type="file"
                        ref={logoFileInputRef}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                        رفع لوجو من جهازك (كمبيوتر / هاتف)
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        PNG, JPG, SVG, WebP (أقصى حد 2MB)
                      </span>
                    </div>

                    {/* URL Input */}
                    <div className="flex flex-col justify-center">
                      <Input
                        label="أو ضع رابط صورة اللوجو (URL)"
                        value={editLogoUrl}
                        onChange={(e) => setEditLogoUrl(e.target.value)}
                        placeholder="https://.../my-logo.png"
                        dir="ltr"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  {logoUploadError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{logoUploadError}</span>
                    </div>
                  )}

                  {logoUploadSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{logoUploadSuccess}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Consultation Duration */}
              <div className="space-y-1.5 text-start">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    {t('avgConsultMinutesLabel')}
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {editAvgMinutes} دقيقة
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditAvgMinutes(Math.max(2, editAvgMinutes - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg border border-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="2"
                    max="45"
                    value={editAvgMinutes}
                    onChange={(e) => setEditAvgMinutes(Number(e.target.value))}
                    className="flex-1 accent-cyan-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setEditAvgMinutes(Math.min(60, editAvgMinutes + 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg border border-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Brand Theme Color Selection */}
              <div className="space-y-2 text-start">
                <label className="text-xs font-semibold text-slate-300">
                  لون الهوية الطبية المخصصة (Brand Color)
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {[
                    { name: 'Cyan Electric', hex: '#0ea5e9' },
                    { name: 'Emerald Mint', hex: '#10b981' },
                    { name: 'Royal Sapphire', hex: '#2563eb' },
                    { name: 'Indigo Deep', hex: '#6366f1' },
                    { name: 'Cyber Violet', hex: '#8b5cf6' },
                    { name: 'Amber Sunrise', hex: '#f59e0b' },
                    { name: 'Ruby Crimson', hex: '#f43f5e' },
                    { name: 'Deep Teal', hex: '#14b8a6' },
                  ].map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setEditBrandColor(color.hex)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        editBrandColor === color.hex ? 'scale-125 border-white shadow-lg' : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editBrandColor}
                    onChange={(e) => setEditBrandColor(e.target.value)}
                    className="w-12 h-10 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer p-1"
                  />
                  <span className="font-mono text-xs text-slate-400">{editBrandColor}</span>
                </div>
              </div>

              {settingsSaved && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ وتحديث إعدادات وهوية العيادة بنجاح!</span>
                </div>
              )}

              <Button type="submit" variant="glow" size="md" className="w-full font-bold">
                {t('saveSettings')}
              </Button>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Emergency Insert Modal */}
      <Modal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        title={t('emergencyModalTitle')}
      >
        <form onSubmit={handleCreateEmergency} className="space-y-4">
          <Input
            label="اسم المريض"
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
            placeholder="الاسم بالكامل..."
            required
            autoFocus
          />

          <Input
            label="سبب الحالة الطارئة"
            value={emergencyReason}
            onChange={(e) => setEmergencyReason(e.target.value)}
            required
          />

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsEmergencyModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="glow"
              loading={isSubmittingEmergency}
              className="bg-amber-600 hover:bg-amber-500 font-bold"
            >
              إدراج الحالة فوراً
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pause Queue Modal */}
      <Modal
        isOpen={isPauseModalOpen}
        onClose={() => setIsPauseModalOpen(false)}
        title="إيقاف استقبال الحجوزات مؤقتاً"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            عند إيقاف الحجز، سيظهر هذا السبب للمرضى الجدد الراغبين في الانضمام للطابور مع إيقاف زر الحجز.
          </p>

          <Input
            label="سبب الإيقاف المؤقت"
            value={pauseReasonInput}
            onChange={(e) => setPauseReasonInput(e.target.value)}
            placeholder="مثال: استراحة غداء، طوارئ خارج العيادة..."
          />

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsPauseModalOpen(false)}>
              إلغاء
            </Button>
            <Button variant="danger" onClick={handleConfirmPause}>
              تأكيد إيقاف الحجز
            </Button>
          </div>
        </div>
      </Modal>

      {/* SMS Notification Delivery Simulation Modal */}
      <Modal
        isOpen={activeSmsPreview !== null}
        onClose={() => setActiveSmsPreview(null)}
        title={
          <div className="flex items-center gap-2 text-cyan-400">
            <Smartphone className="w-5 h-5" />
            <span>محاكاة إرسال رسالة SMS للمريض</span>
          </div>
        }
      >
        {activeSmsPreview && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono">{activeSmsPreview.patientPhone}</span>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                  محاكاة إشعار (بيئة تجريبية - غير متصل بمزود خارجي)
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-100 text-xs sm:text-sm whitespace-pre-line leading-relaxed font-sans">
                {activeSmsPreview.message}
              </div>

              <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 font-mono">
                <span>كود العملية: {activeSmsPreview.id}</span>
                <span>{activeSmsPreview.sentAt}</span>
              </div>
            </div>

            <Button
              variant="glow"
              size="md"
              onClick={() => setActiveSmsPreview(null)}
              className="w-full font-bold"
            >
              إغلاق معاينة الإشعار
            </Button>
          </div>
        )}
      </Modal>

      {/* DEDICATED CLINIC BOOKING QR & PRINTABLE STAND MODAL */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-cyan-400">
            <QrCode className="w-5 h-5" />
            <span>رمز QR ورابط الحجز المخصص للعيادة (جاهز للطباعة)</span>
          </div>
        }
        maxWidth="lg"
      >
        <div className="space-y-6 text-center">
          {/* QR Display Card */}
          <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl flex flex-col items-center">
            {bookingQrDataUrl ? (
              <div className="p-4 rounded-3xl bg-white shadow-xl border border-slate-700 mb-4">
                <img
                  src={bookingQrDataUrl}
                  alt="Clinic Booking QR"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-2xl"
                />
              </div>
            ) : (
              <div className="w-48 h-48 rounded-3xl bg-slate-800 animate-pulse flex items-center justify-center mb-4">
                <QrCode className="w-12 h-12 text-slate-500" />
              </div>
            )}

            <h3 className="text-xl font-black text-white mb-1">
              {clinic.clinicName}
            </h3>
            {clinic.doctorName && (
              <p className="text-sm font-bold text-cyan-400 mb-1">
                {clinic.doctorName}
              </p>
            )}
            <p className="text-xs text-slate-400 mb-4">
              {clinic.specialty}
            </p>

            {/* Direct Booking Link Box */}
            <div className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-cyan-300 truncate text-start flex-1" dir="ltr">
                {typeof window !== 'undefined' ? `${window.location.origin}/book/${clinicId}` : `/book/${clinicId}`}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyBookingUrl}
                className="shrink-0"
              >
                {copiedBookingUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBookingUrl ? 'تم النسخ ✓' : 'نسخ'}</span>
              </Button>
            </div>
          </div>

          {/* Action Buttons: High-Res Print Poster Download & Test Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="glow"
              size="lg"
              onClick={handleDownloadBookingPoster}
              className="font-bold shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              <span>تحميل بوستر / ستاند جاهز للطباعة (PNG)</span>
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                const url = `/book/${clinicId}`;
                onNavigate(url);
              }}
              className="font-bold border-cyan-500/30 text-cyan-300 hover:text-white"
            >
              <ExternalLink className="w-4 h-4" />
              <span>تجربة فتح صفحة الحجز</span>
            </Button>
          </div>

          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-300 leading-relaxed text-start">
            💡 <strong>نصيحة لسكرتارية العيادة:</strong> يمكنك طباعة هذا الملصق بدقة عالية وتعليقه عند مدخل العيادة أو في صالة الاستقبال؛ ليتمكن أي مريض قادم من حجز دوره مباشرة بكاميرا هاتفه في ثوانٍ معدودة دون الحاجة للوقوف أمام شباك الاستقبال!
          </div>
        </div>
      </Modal>
    </div>
  );
};
