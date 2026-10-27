import { getAdminDb, getAdminAuth, hashPinServer } from './firebaseAdmin.ts';

interface FailedAttemptTracker {
  attempts: number;
  lockedUntil: number;
}

const failedAttemptsMap = new Map<string, FailedAttemptTracker>();

function checkRateLimit(key: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const entry = failedAttemptsMap.get(key);

  if (!entry) return { allowed: true };

  if (entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  // Lock expired, reset
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    failedAttemptsMap.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const entry = failedAttemptsMap.get(key) || { attempts: 0, lockedUntil: 0 };
  entry.attempts += 1;

  if (entry.attempts >= 5) {
    // Lock for 15 minutes
    entry.lockedUntil = now + 15 * 60 * 1000;
  }

  failedAttemptsMap.set(key, entry);
}

function clearFailedAttempts(key: string) {
  failedAttemptsMap.delete(key);
}

export interface ClinicLoginRequest {
  identifier: string;
  pin: string;
  clientIp?: string;
}

export interface ClinicLoginResponse {
  success: boolean;
  customToken?: string;
  clinicId?: string;
  error?: string;
  errorCode?: string;
}

export async function processClinicLogin(req: ClinicLoginRequest): Promise<ClinicLoginResponse> {
  const identifier = (req.identifier || '').trim();
  const pin = (req.pin || '').trim();
  const clientKey = `${req.clientIp || 'unknown'}_${identifier.toLowerCase()}`;

  // 1. Rate limiting check
  const rateLimit = checkRateLimit(clientKey);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `تم تجاوز الحد الأقصى لمحاولات الدخول الخاطئة. يرجى الانتظار ${rateLimit.remainingSeconds} ثانية قبل المحاولة.`,
      errorCode: 'RATE_LIMITED'
    };
  }

  // 2. Validate input format
  if (!identifier) {
    return { success: false, error: 'كود العيادة أو رقم الهاتف مطلوب', errorCode: 'MISSING_IDENTIFIER' };
  }
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return { success: false, error: 'رمز الدخول (PIN) يجب أن يتكون من 4 أرقام', errorCode: 'INVALID_PIN_FORMAT' };
  }

  const db = getAdminDb();
  const clinicsColl = db.collection('clinics');

  let clinicDocSnap: FirebaseFirestore.DocumentSnapshot | null = null;

  // 1. Direct document ID lookup
  const directDoc = await clinicsColl.doc(identifier).get();
  if (directDoc.exists) {
    clinicDocSnap = directDoc;
  }

  // 2. Slug lookup
  if (!clinicDocSnap) {
    const slug = identifier.toLowerCase().replace(/\s+/g, '-');
    const slugDoc = await clinicsColl.doc(slug).get();
    if (slugDoc.exists) {
      clinicDocSnap = slugDoc;
    }
  }

  // 3. Query by phone number
  if (!clinicDocSnap) {
    const cleanPhone = identifier.replace(/\s+/g, '');
    const phoneQuerySnap = await clinicsColl.where('phoneNumber', '==', cleanPhone).limit(1).get();
    if (!phoneQuerySnap.empty) {
      clinicDocSnap = phoneQuerySnap.docs[0];
    }
  }

  // 4. Query by slug field
  if (!clinicDocSnap) {
    const slugQuerySnap = await clinicsColl.where('slug', '==', identifier.toLowerCase()).limit(1).get();
    if (!slugQuerySnap.empty) {
      clinicDocSnap = slugQuerySnap.docs[0];
    }
  }

  if (!clinicDocSnap || !clinicDocSnap.exists) {
    recordFailedAttempt(clientKey);
    return {
      success: false,
      error: 'لم يتم العثور على العيادة بهذا الكود أو رقم الهاتف',
      errorCode: 'CLINIC_NOT_FOUND'
    };
  }

  const clinicData = clinicDocSnap.data() || {};
  const clinicId = clinicDocSnap.id;

  // Check demo lock
  if (clinicData.isDemo || clinicId === 'demo-clinic-cairo' || clinicId === 'demo-clinic') {
    if (clinicData.isDemoHidden) {
      return {
        success: false,
        error: 'العيادة التجريبية مقفلة وممنوعة من الدخول حالياً بتعليمات الإدارة (وضع العمل التجاري مفعّل)',
        errorCode: 'DEMO_LOCKED'
      };
    }
  }

  // 5. Verify PIN Hash server-side
  const enteredHash = await hashPinServer(pin);
  if (clinicData.pinHash !== enteredHash) {
    recordFailedAttempt(clientKey);
    return {
      success: false,
      error: 'رمز الدخول (PIN) غير صحيح',
      errorCode: 'INVALID_PIN'
    };
  }

  // Clear failed attempts on success
  clearFailedAttempts(clientKey);

  // 6. Generate Firebase custom token with trusted custom claims
  const auth = getAdminAuth();
  const customToken = await auth.createCustomToken(`staff_${clinicId}`, {
    clinicId,
    role: 'staff'
  });

  return {
    success: true,
    customToken,
    clinicId
  };
}
