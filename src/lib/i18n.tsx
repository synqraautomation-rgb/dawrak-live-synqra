import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'en';

export interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

export const translations = {
  // Brand
  brandName: { ar: 'سينقرا', en: 'SYNQRA' },
  appName: { ar: 'دورك لايف', en: 'Dawrak Live' },
  appTagline: { ar: 'نظام إدارة طوابير العيادات الذكي بالزمن الفعلي', en: 'Real-Time Smart Medical Clinic Queue System' },

  // Navigation
  navHome: { ar: 'الرئيسية', en: 'Home' },
  navClinics: { ar: 'العيادات', en: 'Clinics' },
  navClinicPortal: { ar: 'بوابة العيادة', en: 'Clinic Portal' },
  navLiveDisplay: { ar: 'شاشة العرض', en: 'Live Display' },
  toggleTheme: { ar: 'تبديل المظهر', en: 'Toggle Theme' },
  toggleLanguage: { ar: 'English', en: 'العربية' },

  // Landing Hero
  heroBadge: { ar: 'تقنية سينقرا الذكية للرعاية الصحية', en: 'SYNQRA Smart Healthcare Intelligence' },
  heroTitle1: { ar: 'وقتك أثمن من أن تقضيه في', en: 'Your Time Is Too Valuable For' },
  heroTitleHighlight: { ar: 'غرف الانتظار', en: 'Waiting Rooms' },
  heroSubtitle: { 
    ar: 'منصة ذكية تربط المرضى والعيادات في بث لحظي مباشر. تتبع دورك بدقة من هاتفك، وتخلص من الانتظار المرهق إلى الأبد.', 
    en: 'Intelligent real-time queue platform synchronizing patients and clinics seamlessly. Track your live turn from anywhere.' 
  },
  ctaPatientTitle: { ar: 'أنا مريض', en: 'I Am a Patient' },
  ctaPatientDesc: { ar: 'استعرض العيادات، احجز دورك بضغطة زر، وتابع تقدم الطابور لحظياً من هاتفك.', en: 'Browse verified clinics, secure your turn in seconds, and track real-time queue progress from your mobile.' },
  ctaPatientBtn: { ar: 'استعراض العيادات وحجز الدور', en: 'Browse Clinics & Join Queue' },

  ctaClinicTitle: { ar: 'أنا عيادة / طبيب', en: 'I Am a Clinic / Doctor' },
  ctaClinicDesc: { ar: 'نظم تدفق المرضى، أعلن الأدوار صوتياً بشاشة ذكية، وتخلص من الفوضى والازدحام تماماً.', en: 'Streamline patient flow, broadcast automated voice announcements, and eliminate clinic waiting-room chaos.' },
  ctaClinicBtn: { ar: 'انضم لشبكة العيادات الذكية', en: 'Join Smart Clinic Network' },

  // Clinic Modal on Landing
  clinicModalTitle: { ar: 'انضم إلى شبكة دورك لايف', en: 'Join Dawrak Live Network' },
  clinicModalPitch: { ar: 'ارتقِ بتجربة مرضاك وضاعف إنتاجية عيادتك مع نظام إدارة الطوابير الأحدث في الشرق الأوسط.', en: 'Elevate your patient experience and boost clinic productivity with the most advanced real-time queue command system.' },
  benefit1: { ar: 'شاشة انتظار تلفزيونية تفاعلية مع إعلان صوتي ذكي باللغة العربية للرقم التالي.', en: 'Interactive waiting room TV display with automated native Arabic voice announcements.' },
  benefit2: { ar: 'لوحة تحكم فورية للطاقم وسكرتارية العيادة للتحكم الكامل في ثوانٍ.', en: 'Ultra-fast command dashboard for doctors and secretaries to manage turns in one click.' },
  benefit3: { ar: 'تتبع مباشر للمرضى على هواتفهم يقلل الازدحام بنسبة تصل إلى 80%.', en: 'Live mobile patient turn-tracking cutting clinic waiting room congestion by up to 80%.' },
  benefit4: { ar: 'إحصائيات ذكية يومية وشهرية لتحليل أوقات الذروة ومتوسط الكشف.', en: 'Predictive daily and monthly clinic analytics analyzing peak hours and consult metrics.' },
  clinicWhatsAppCta: { ar: 'تواصل مع فريق المبيعات عبر واتساب', en: 'Chat with Sales on WhatsApp' },
  close: { ar: 'إغلاق', en: 'Close' },

  // How it works
  howItWorksTitle: { ar: 'كيف يعمل دورك لايف؟', en: 'How Dawrak Live Works' },
  howItWorksSubtitle: { ar: 'ثلاث خطوات بسيطة تمنحك تجربة طبية عصرية ومريحة', en: 'Three simple steps to transform your clinic visit' },
  step1Title: { ar: '١. اختر عيادتك واحجز', en: '1. Select Clinic & Book' },
  step1Desc: { ar: 'اختر الطبيب وأدخل اسمك ورقم هاتفك لتحصل فوراً على رقم دورك المؤكد.', en: 'Pick your verified specialist and enter your basic info to generate an instant atomic turn ticket.' },
  step2Title: { ar: '٢. تابع دورك بالزمن الفعلي', en: '2. Track in Real Time' },
  step2Desc: { ar: 'شاهد عداد الطابور يتقدم مباشرة والوقت التقديري المتبقي دون الحاجة للتواجد داخل العيادة.', en: 'Watch your progress ring advance dynamically with self-learning ETA calculations from anywhere.' },
  step3Title: { ar: '٣. ادخل فور استدعائك', en: '3. Enter Seamlessly' },
  step3Desc: { ar: 'استقبل تنبيهاً ذكياً وشاشة احتفالية فور حلول دورك للدخول المباشر إلى غرفة الفحص.', en: 'Receive instant visual, audio and notification alerts the exact moment your number is called.' },

  // Trust Badges
  trustSecurity: { ar: 'أمان وخصوصية تامة', en: '100% Privacy & Security' },
  trustSecurityDesc: { ar: 'لا تظهر أسماء المرضى أو أرقامهم على أي شاشة عامة إطلاقاً.', en: 'Patient identities remain completely anonymized on all public displays.' },
  trustRealtime: { ar: 'بث فوري عبر السحاب', en: 'Sub-Second Cloud Sync' },
  trustRealtimeDesc: { ar: 'تزامن لحظي فائق السرعة بين لوحة الطبيب وهواتف المرضى وشاشة العرض.', en: 'Ultra-low latency synchronization across phones, TVs, and admin command centers.' },
  trustFree: { ar: 'بدون تطبيقات إضافية', en: 'Zero App Installation' },
  trustFreeDesc: { ar: 'يعمل بسلاسة تامة على جميع المتصفحات والهواتف بتقنية PWA التقدمية.', en: 'Runs directly in any modern browser as an ultra-fast Progressive Web App.' },

  // Directory
  clinicsTitle: { ar: 'دليل العيادات المعتمدة', en: 'Verified Clinics Directory' },
  clinicsSubtitle: { ar: 'تصفح العيادات المتصلة بشبكة دورك لايف واحجز دورك فورياً', en: 'Explore active clinics on the Dawrak Live network and reserve your turn live' },
  searchPlaceholder: { ar: 'ابحث باسم العيادة، الطبيب، أو التخصص...', en: 'Search by clinic, doctor, or specialty...' },
  allSpecialties: { ar: 'كل التخصصات', en: 'All Specialties' },
  sortAlphabetical: { ar: 'الأقرب للترتيب', en: 'Alphabetical' },
  sortShortestQueue: { ar: 'الأقل ازدحاماً الآن ⚡', en: 'Least Crowded Now ⚡' },
  sortNewest: { ar: 'الأحدث انضماماً', en: 'Newest First' },
  openOnly: { ar: 'متاح الآن فقط', en: 'Accepting Now' },
  clinicsAvailable: { ar: 'عيادة متاحة', en: 'clinics available' },
  verifiedBadge: { ar: 'موثق من SYNQRA', en: 'SYNQRA Verified' },
  nowServing: { ar: 'جاري خدمة رقم', en: 'Now Serving #' },
  waitingCount: { ar: 'في الانتظار', en: 'waiting' },
  bookNow: { ar: 'احجز دورك الآن', en: 'Book Your Turn' },
  clinicPausedTag: { ar: 'الحجز متوقف مؤقتاً', en: 'Bookings Paused' },
  noClinicsFound: { ar: 'لم يتم العثور على عيادات مطابقة', en: 'No matching clinics found' },
  resetFilters: { ar: 'إعادة ضبط الفلاتر', en: 'Reset Filters' },

  // Booking Flow
  bookingTitle: { ar: 'حجز دور جديد', en: 'Reserve Your Turn' },
  stepVisitReason: { ar: 'سبب الزيارة', en: 'Visit Reason' },
  stepPatientName: { ar: 'اسم المريض', en: 'Patient Name' },
  stepPatientPhone: { ar: 'رقم الهاتف', en: 'Phone Number' },
  reasonCheckup: { ar: 'كشف واستشارة طبية', en: 'Consultation & Checkup' },
  reasonFollowup: { ar: 'متابعة / إعادة كشف', en: 'Follow-up Visit' },
  reasonUrgent: { ar: 'حالة عاجلة / ألم حاد', en: 'Urgent Care / Pain' },
  reasonCustom: { ar: 'سبب آخر (اكتب هنا)', en: 'Other Reason (Specify)' },
  namePlaceholder: { ar: 'الاسم الثلاثي للمريض', en: 'Patient Full Name' },
  phonePlaceholder: { ar: 'مثال: 01012345678', en: 'e.g. 01012345678' },
  phoneHint: { ar: 'يستخدم رقم الهاتف لإرسال التنبيهات وتأكيد هويتك فقط', en: 'Used strictly to notify you when your turn approaches' },
  btnNext: { ar: 'متابعة', en: 'Continue' },
  btnBack: { ar: 'رجوع', en: 'Back' },
  btnConfirmBooking: { ar: 'تأكيد وحجز الدور الآن', en: 'Confirm & Reserve Turn' },
  submitting: { ar: 'جاري الحجز وتوليد رقم الدور...', en: 'Generating atomic turn ticket...' },
  duplicateBookingTitle: { ar: 'لديك حجز مسبق اليوم!', en: 'Active Booking Found Today!' },
  duplicateBookingDesc: { ar: 'يوجد حجز نشط مسجل بالفعل بهذا الرقم لدى هذه العيادة لليوم. يمكنك متابعة دورك مباشرة.', en: 'You already have an active ticket registered with this number at this clinic today.' },
  goToExistingLive: { ar: 'الانتقال إلى تتبع دورك الحالي', en: 'Go to Your Live Tracker' },
  clinicPausedNotice: { ar: 'تعتذر العيادة عن استقبال حجوزات جديدة مؤقتاً', en: 'Clinic is temporarily not accepting new bookings' },

  // Live Tracking
  liveTitle: { ar: 'تتبع الدور المباشر', en: 'Live Queue Tracking' },
  yourQueueNumber: { ar: 'رقم دورك', en: 'Your Ticket #' },
  peopleAhead: { ar: 'أمامك في الطابور', en: 'Patients Ahead' },
  peopleAheadSingular: { ar: 'مريض أمامك', en: 'patient ahead' },
  estimatedWait: { ar: 'الوقت المقدر', en: 'Estimated Wait' },
  smartEta: { ar: 'تقدير ذكي', en: 'Smart AI ETA' },
  minutes: { ar: 'دقيقة', en: 'mins' },
  yourTurnNow: { ar: 'حان دورك الآن! تفضل بالدخول إلى غرفة الكشف', en: 'It is your turn! Please enter the examination room' },
  nextInLine: { ar: 'استعد! أنت التالي مباشرة في الطابور', en: 'Get ready! You are next in line' },
  reconnectingBanner: { ar: 'جارٍ إعادة الاتصال بالخادم...', en: 'Reconnecting to live cloud...' },
  toggleNumerals: { ar: 'الأرقام: ١٢٣ ⇄ 123', en: 'Numerals: 123 ⇄ ١٢٣' },
  notifyMe: { ar: 'نبهني عند اقتراب دوري', en: 'Notify me when my turn is near' },
  largeFont: { ar: 'تكبير الخط', en: 'Large Text' },
  normalFont: { ar: 'خط عادي', en: 'Normal Text' },
  turnCelebration: { ar: 'مرحباً بك! دورك جاهز الآن', en: 'Welcome! Your turn is now ready' },

  // Clinic Staff & Command
  staffLoginTitle: { ar: 'بوابة الطاقم الطبي', en: 'Clinic Staff Command' },
  staffLoginSubtitle: { ar: 'أدخل رقم هاتف العيادة والرمز السري الخاص بك', en: 'Enter your clinic phone and secure PIN' },
  enterPin: { ar: 'رمز المرور (PIN)', en: 'Security PIN' },
  loggingIn: { ar: 'جاري التحقق...', en: 'Verifying...' },
  loginBtn: { ar: 'دخول لوحة التحكم', en: 'Enter Command Center' },
  invalidCredentials: { ar: 'بيانات الدخول غير صحيحة، يرجى المحاولة مرة أخرى', en: 'Invalid credentials. Please verify phone & PIN' },
  subscriptionInactive: { ar: 'الاشتراك غير مفعل حالياً', en: 'Subscription Inactive' },
  subscriptionInactiveDesc: { ar: 'يرجى التواصل مع فريق سينقرا لتجديد الاشتراك وتفعيل البوابة فورياً.', en: 'Please contact SYNQRA support on WhatsApp to renew your subscription and reactivate access.' },
  contactSynqraWhatsapp: { ar: 'تواصل مع سينقرا للتجديد', en: 'Contact SYNQRA to Renew' },

  // Clinic Dashboard Tabs
  tabQueue: { ar: 'قائمة الانتظار', en: 'Live Queue' },
  tabStats: { ar: 'الإحصائيات والتقارير', en: 'Analytics & Reports' },
  tabSettings: { ar: 'إعدادات العيادة', en: 'Clinic Settings' },
  callNext: { ar: 'استدعاء التالي ⚡', en: 'Call Next Patient ⚡' },
  markCompleted: { ar: 'تم الكشف', en: 'Done' },
  markNoShow: { ar: 'لم يحضر', en: 'No-Show' },
  pauseQueueBtn: { ar: 'إيقاف الحجز مؤقتاً', en: 'Pause Queue' },
  resumeQueueBtn: { ar: 'استئناف الحجز', en: 'Resume Queue' },
  emergencyInsertBtn: { ar: 'إدراج حالة طارئة', en: 'Insert Emergency' },
  emergencyModalTitle: { ar: 'إدراج حالة طارئة في مقدمة الدور', en: 'Insert Priority Emergency Patient' },
  priorityTag: { ar: 'حالة طارئة أولى', en: 'Priority / Emergency' },
  waitingPatientsEmpty: { ar: 'لا يوجد مرضى في قائمة الانتظار حالياً', en: 'No patients waiting in queue right now' },

  // Stats Tab
  todayServed: { ar: 'إجمالي الحالات اليوم', en: 'Total Served Today' },
  avgWait: { ar: 'متوسط وقت الانتظار', en: 'Avg Wait Time' },
  peakHour: { ar: 'ساعة الذروة', en: 'Peak Busy Hour' },
  hourlyTraffic: { ar: 'توزيع المرضى على ساعات اليوم', en: 'Hourly Patient Distribution' },
  eodSummaryCard: { ar: 'بطاقة التقرير اليومي الفاخرة', en: 'Luxury End-of-Day Summary Card' },
  downloadSummaryCard: { ar: 'تحميل بطاقة التقرير (PNG)', en: 'Download Report Card (PNG)' },
  shareSummaryWhatsApp: { ar: 'مشاركة التقرير عبر واتساب', en: 'Share to WhatsApp' },

  // Settings Tab
  clinicProfile: { ar: 'ملف العيادة التعريفي', en: 'Clinic Profile' },
  clinicNameLabel: { ar: 'اسم العيادة / الطبيب', en: 'Clinic / Doctor Name' },
  specialtyLabel: { ar: 'التخصص الطبي', en: 'Medical Specialty' },
  avgConsultMinutesLabel: { ar: 'متوسط وقت الكشف التقديري (بالدقائق)', en: 'Estimated Consult Duration (Minutes)' },
  brandColorLabel: { ar: 'لون هوية العيادة', en: 'Brand Accent Color' },
  saveSettings: { ar: 'حفظ التعديلات', en: 'Save Changes' },
  savedSuccessfully: { ar: 'تم حفظ الإعدادات بنجاح', en: 'Settings saved successfully' },

  // Waiting Room Display
  displayNowServing: { ar: 'جاري خدمة رقم', en: 'Now Serving Ticket' },
  upcomingNumbers: { ar: 'الأرقام التالية في الانتظار', en: 'Upcoming Next Tickets' },
  voiceAnnouncement: { ar: 'الإعلان الصوتي الذكي', en: 'Smart Voice Broadcast' },
  muted: { ar: 'مكتوم', en: 'Muted' },
  unmuted: { ar: 'مفعل', en: 'Voice Active' },

  // Master Dashboard
  masterTitle: { ar: 'لوحة التحكم المركزية - سينقرا', en: 'SYNQRA Master Command' },
  clinicsCount: { ar: 'إجمالي العيادات المسجلة', en: 'Total Registered Clinics' },
  activeSubscriptions: { ar: 'الاشتراكات النشطة', en: 'Active Subscriptions' },
  expiringSoon: { ar: 'ينتهي قريباً', en: 'Expiring Soon' },
  addNewClinicBtn: { ar: 'إضافة عيادة جديدة', en: 'Add New Clinic' },
  loginCredentials: { ar: 'بيانات تسجيل الدخول للعيادة', en: 'Clinic Login Credentials' },
  onboardingPackageTitle: { ar: 'حزمة إطلاق العيادة الجديدة', en: 'New Clinic Launch Package' },
  whatsappWelcomeMsg: { ar: 'رسالة الترحيب والبيانات لواتساب', en: 'WhatsApp Onboarding Message' },
  downloadQrPoster: { ar: 'تحميل بوستر QR الرسمي للطباعة', en: 'Download Printable QR Poster' },
  copySuccess: { ar: 'تم النسخ للحافظة!', en: 'Copied to clipboard!' },
  auditLogTitle: { ar: 'سجل العمليات الإدارية (Audit Log)', en: 'Security Audit Log' },

  // Footer & Legal
  privacyPolicy: { ar: 'سياسة الخصوصية', en: 'Privacy Policy' },
  termsOfService: { ar: 'الشروط والأحكام', en: 'Terms of Service' },
  rightsReserved: { ar: 'جميع الحقوق محفوظة لشركة سينقرا للحلول الذكية © 2026', en: 'All Rights Reserved © 2026 SYNQRA Intelligent Solutions' }
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
  isRtl: boolean;
  formatNumber: (num: number, useEasternArabic?: boolean) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('dawrak_lang');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('dawrak_lang', lang);
  };

  const isRtl = language === 'ar';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [language, isRtl]);

  const t = (key: keyof typeof translations): string => {
    const item = translations[key];
    if (!item) return String(key);
    return item[language] || item.ar;
  };

  const formatNumber = (num: number, useEasternArabic: boolean = false): string => {
    if (!useEasternArabic) return String(num);
    const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, (w) => easternDigits[+w]);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRtl, formatNumber }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
