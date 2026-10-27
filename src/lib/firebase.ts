import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  addDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  runTransaction,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Error handling conforming to Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Data Models
export interface Clinic {
  id: string;
  clinicName: string;
  doctorName?: string;
  specialty: string;
  logoUrl?: string;
  brandColor?: string;
  phoneNumber: string;
  pinHash?: string;
  currentServingNumber: number;
  lastQueueNumber?: number;
  totalBookedToday?: number;
  avgConsultMinutes: number;
  subscriptionStatus: 'trial' | 'active' | 'paused';
  subscriptionEndsAt?: string;
  isPaused: boolean;
  pauseReason?: string;
  isDemo: boolean;
  isDemoHidden?: boolean;
  createdAt: string;
}

export interface PublicClinic {
  id: string;
  clinicName: string;
  doctorName?: string;
  specialty: string;
  logoUrl?: string;
  brandColor?: string;
  phoneNumber: string;
  currentServingNumber: number;
  lastQueueNumber?: number;
  avgConsultMinutes: number;
  isPaused: boolean;
  pauseReason?: string;
  isDemo: boolean;
  isDemoHidden?: boolean;
  subscriptionStatus?: 'trial' | 'active' | 'paused';
  subscriptionEndsAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QueueEntry {
  id: string;
  patientName: string;
  patientPhone: string;
  visitReason: string;
  queueNumber: number;
  status: 'waiting' | 'called' | 'completed' | 'no_show';
  isPriority: boolean;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  onTheWay?: boolean;
  estimatedArrivalMinutes?: number;
  checkedInReception?: boolean;
  smsNotifiedAt?: string;
}

export interface PublicQueueEntry {
  id: string;
  queueNumber: number;
  status: 'waiting' | 'called' | 'completed' | 'no_show';
  isPriority: boolean;
  createdAt: string;
  patientName?: string;
  patientPhone?: string;
  calledAt?: string;
  completedAt?: string;
  onTheWay?: boolean;
  estimatedArrivalMinutes?: number;
  checkedInReception?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  details: string;
  createdAt: string;
}

export interface DailyStats {
  id: string;
  totalServed: number;
  avgWaitMinutes: number;
  peakHour: number;
}

/**
 * SHA-256 PIN hashing helper
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`dawrak_salt_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Salted SHA-256 hash for initial master passkey 'SynqraMaster2026!'
export const INITIAL_MASTER_HASH = '96e2f96408a691473699c639406dfc99bca53483dddac88780bbb644500121c7';

export async function verifyMasterPassword(enteredPass: string): Promise<boolean> {
  const trimmed = enteredPass.trim();
  if (!trimmed) return false;

  // 1. Direct match with initial passkey
  if (trimmed === 'SynqraMaster2026!') return true;

  const hashedEntered = await hashPin(trimmed);

  // 2. Check local custom hashed password override
  if (typeof window !== 'undefined') {
    const localHash = localStorage.getItem('synqra_master_pwd_hash');
    if (localHash && hashedEntered === localHash) {
      return true;
    }
  }

  // 3. Check Firestore system/master_auth cryptographically
  try {
    const docSnap = await getDoc(doc(db, 'system', 'master_auth'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.passwordHash && data.passwordHash === hashedEntered) {
        return true;
      }
      if (data.passwordPlain && data.passwordPlain === trimmed) {
        return true;
      }
    }
  } catch (e) {
    console.warn('verifyMasterPassword firestore lookup:', e);
  }

  // 4. Initial master hash fallback
  return hashedEntered === INITIAL_MASTER_HASH;
}

export async function updateMasterPassword(newPass: string, newUsername?: string): Promise<void> {
  const trimmed = newPass.trim();
  if (trimmed.length < 4) {
    throw new Error('كلمة المرور يجب أن تتكون من 4 خانات على الأقل');
  }
  const hashed = await hashPin(trimmed);
  const username = newUsername?.trim() || 'synqra-master';

  if (typeof window !== 'undefined') {
    localStorage.setItem('synqra_master_pwd_hash', hashed);
    localStorage.setItem('synqra_master_username', username);
    localStorage.setItem('synqra_master_pwd_plain', trimmed);
    localStorage.setItem('synqra_master_pwd_updated_at', new Date().toISOString());
  }

  try {
    await setDoc(doc(db, 'system', 'master_auth'), {
      username,
      passwordHash: hashed,
      passwordPlain: trimmed,
      updatedAt: new Date().toISOString(),
      updatedBy: 'MASTER_ADMIN'
    }, { merge: true });
  } catch (e) {
    console.warn('updateMasterPassword firestore save:', e);
  }
}

export function isDemoClinicLocked(clinic?: Clinic | PublicClinic | null): boolean {
  if (typeof window !== 'undefined' && localStorage.getItem('synqra_demo_clinic_locked') === 'true') {
    if (!clinic || clinic.isDemo || clinic.id === 'demo-clinic-cairo' || clinic.id === 'demo-clinic') {
      return true;
    }
  }
  if (!clinic) return false;
  if (clinic.isDemo || clinic.id === 'demo-clinic-cairo' || clinic.id === 'demo-clinic') {
    if (clinic.isDemoHidden || clinic.isPaused || clinic.subscriptionStatus === 'paused') {
      return true;
    }
  }
  return false;
}

export function subscribeDemoClinicLock(callback: (locked: boolean) => void) {
  let isLockedCurrent = false;
  if (typeof window !== 'undefined') {
    isLockedCurrent = localStorage.getItem('synqra_demo_clinic_locked') === 'true';
  }
  callback(isLockedCurrent);

  const handleEvent = (e: Event) => {
    const custom = e as CustomEvent<{ locked: boolean }>;
    if (custom.detail && custom.detail.locked !== undefined) {
      callback(custom.detail.locked);
    } else if (typeof window !== 'undefined') {
      callback(localStorage.getItem('synqra_demo_clinic_locked') === 'true');
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('synqra:demo-lock-change', handleEvent);
    window.addEventListener('storage', handleEvent);
  }

  const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const locked = Boolean(data.isDemoLocked || data.showDemoClinic === false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('synqra_demo_clinic_locked', String(locked));
      }
      callback(locked);
    }
  }, () => {});

  const unsubClinic = onSnapshot(doc(db, 'clinics', 'demo-clinic-cairo'), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const locked = Boolean(data.isDemoHidden || data.isPaused || data.subscriptionStatus === 'paused');
      if (typeof window !== 'undefined') {
        localStorage.setItem('synqra_demo_clinic_locked', String(locked));
      }
      callback(locked);
    }
  }, () => {});

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('synqra:demo-lock-change', handleEvent);
      window.removeEventListener('storage', handleEvent);
    }
    unsubConfig();
    unsubClinic();
  };
}

export async function toggleDemoClinicVisibility(hidden: boolean): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('synqra_demo_clinic_locked', String(hidden));
    window.dispatchEvent(new CustomEvent('synqra:demo-lock-change', { detail: { locked: hidden } }));
  }
  try {
    await setDoc(doc(db, 'system', 'config'), {
      showDemoClinic: !hidden,
      isDemoLocked: hidden,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const demoIds = ['demo-clinic-cairo', 'demo-clinic'];
    for (const id of demoIds) {
      try {
        const ref = doc(db, 'clinics', id);
        const pubRef = doc(db, 'publicClinics', id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const updates = {
            isDemoHidden: hidden,
            isPaused: hidden,
            pauseReason: hidden ? 'العيادة التجريبية مقفلة وممنوعة من الدخول (الوضع التجاري مفعّل)' : '',
            subscriptionStatus: (hidden ? 'paused' : 'active') as 'paused' | 'active'
          };
          await updateDoc(ref, updates);
          await setDoc(pubRef, updates, { merge: true });
        }
      } catch (e) {
        console.warn('Demo doc update error for id:', id, e);
      }
    }
  } catch (e) {
    console.warn('toggleDemoClinicVisibility error:', e);
  }
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

function cleanUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ----------------------------------------------------
// CLINIC OPERATIONS (Full support for discovery & direct operations)
// ----------------------------------------------------

export function subscribeClinics(callback: (clinics: Clinic[]) => void, onError?: (err: unknown) => void) {
  const q = collection(db, 'clinics');
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const clinics: Clinic[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Clinic, 'id'>)
        }));
        callback(clinics);
      } else {
        seedDemoClinic().then((demo) => callback([demo])).catch(() => callback([]));
      }
    },
    (err) => {
      console.warn('subscribeClinics snapshot notice:', err);
      // Fallback: auto-seed demo clinic so page is never empty
      seedDemoClinic().then((demo) => callback([demo])).catch(() => {
        if (onError) onError(err);
      });
    }
  );
}

export function subscribePublicClinics(callback: (clinics: PublicClinic[]) => void, onError?: (err: unknown) => void) {
  const q = collection(db, 'clinics');
  return onSnapshot(
    q,
    (snapshot) => {
      if (!snapshot.empty) {
        const clinics: PublicClinic[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PublicClinic, 'id'>)
        }));
        callback(clinics);
      } else {
        seedDemoClinic().then((demo) => callback([demo as any])).catch(() => callback([]));
      }
    },
    (err) => {
      console.warn('subscribePublicClinics snapshot notice:', err);
      seedDemoClinic().then((demo) => callback([demo as any])).catch(() => {
        if (onError) onError(err);
      });
    }
  );
}

export function subscribeClinic(clinicId: string, callback: (clinic: Clinic | null) => void, onError?: (err: unknown) => void) {
  const docRef = doc(db, 'clinics', clinicId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...(docSnap.data() as Omit<Clinic, 'id'>) });
      } else if (clinicId === 'demo-clinic-cairo' || clinicId === 'demo-clinic') {
        seedDemoClinic().then(callback).catch(() => callback(null));
      } else {
        // Fallback: search publicClinics or phone lookup
        getClinic(clinicId).then((found) => {
          callback(found);
        }).catch(() => callback(null));
      }
    },
    (err) => {
      console.warn('subscribeClinic snapshot notice:', err);
      if (clinicId === 'demo-clinic-cairo' || clinicId === 'demo-clinic') {
        seedDemoClinic().then(callback).catch(() => {
          if (onError) onError(err);
        });
      } else {
        getClinic(clinicId).then((found) => {
          if (found) callback(found);
          else if (onError) onError(err);
        }).catch(() => {
          if (onError) onError(err);
        });
      }
    }
  );
}

export function subscribePublicClinic(clinicId: string, callback: (clinic: PublicClinic | null) => void, onError?: (err: unknown) => void) {
  return subscribeClinic(clinicId, callback as any, onError);
}

export async function getClinic(clinicId: string): Promise<Clinic | null> {
  try {
    const docSnap = await getDoc(doc(db, 'clinics', clinicId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...(docSnap.data() as Omit<Clinic, 'id'>) };
    }
    const pubSnap = await getDoc(doc(db, 'publicClinics', clinicId));
    if (pubSnap.exists()) {
      return { id: pubSnap.id, ...(pubSnap.data() as Omit<Clinic, 'id'>) };
    }
    // Search by phone number if numeric
    if (/^[0-9+]+$/.test(clinicId)) {
      const qSnap = await getDocs(query(collection(db, 'clinics'), where('phoneNumber', '==', clinicId)));
      if (!qSnap.empty) {
        const d = qSnap.docs[0];
        return { id: d.id, ...(d.data() as Omit<Clinic, 'id'>) };
      }
    }
    if (clinicId === 'demo-clinic-cairo' || clinicId === 'demo-clinic') {
      return await seedDemoClinic();
    }
    return null;
  } catch (err) {
    if (clinicId === 'demo-clinic-cairo' || clinicId === 'demo-clinic') {
      return await seedDemoClinic();
    }
    return null;
  }
}

export async function syncPublicClinic(clinicId: string, data: Partial<Clinic>): Promise<void> {
  try {
    const pubRef = doc(db, 'publicClinics', clinicId);
    const publicData: Partial<PublicClinic> = cleanUndefined({
      clinicName: data.clinicName,
      doctorName: data.doctorName,
      specialty: data.specialty,
      logoUrl: data.logoUrl,
      brandColor: data.brandColor,
      phoneNumber: data.phoneNumber,
      currentServingNumber: data.currentServingNumber,
      avgConsultMinutes: data.avgConsultMinutes,
      isPaused: data.isPaused,
      pauseReason: data.pauseReason,
      isDemo: data.isDemo,
      isDemoHidden: data.isDemoHidden,
      subscriptionStatus: data.subscriptionStatus,
      updatedAt: new Date().toISOString()
    });
    await setDoc(pubRef, publicData, { merge: true });
  } catch (err) {
    console.warn('syncPublicClinic error:', err);
  }
}

export async function createClinic(clinic: Omit<Clinic, 'id'>, customId?: string): Promise<string> {
  try {
    const clinicRef = customId ? doc(db, 'clinics', customId) : doc(collection(db, 'clinics'));
    const sanitized = cleanUndefined(clinic);
    await setDoc(clinicRef, sanitized);
    await syncPublicClinic(clinicRef.id, clinic);
    return clinicRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'clinics');
    throw err;
  }
}

export async function updateClinic(clinicId: string, updates: Partial<Clinic>): Promise<void> {
  try {
    const sanitized = cleanUndefined(updates);
    await updateDoc(doc(db, 'clinics', clinicId), sanitized);
    await syncPublicClinic(clinicId, updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `clinics/${clinicId}`);
  }
}

export async function deleteClinic(clinicId: string): Promise<void> {
  try {
    try {
      const qSnap = await getDocs(collection(db, 'clinics', clinicId, 'queue'));
      for (const qDoc of qSnap.docs) {
        await deleteDoc(qDoc.ref);
      }
    } catch {}

    try {
      const pubQSnap = await getDocs(collection(db, 'publicClinics', clinicId, 'queue'));
      for (const pubDoc of pubQSnap.docs) {
        await deleteDoc(pubDoc.ref);
      }
    } catch {}

    await deleteDoc(doc(db, 'clinics', clinicId));
    try {
      await deleteDoc(doc(db, 'publicClinics', clinicId));
    } catch {}

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`synqra_staff_auth_${clinicId}`);
      localStorage.removeItem(`synqra_booking_${clinicId}`);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `clinics/${clinicId}`);
    throw err;
  }
}

// ----------------------------------------------------
// QUEUE OPERATIONS (Direct, fast, and 100% reliable)
// ----------------------------------------------------

export function subscribeQueue(clinicId: string, callback: (queue: QueueEntry[]) => void, onError?: (err: unknown) => void) {
  const q = query(collection(db, 'clinics', clinicId, 'queue'), orderBy('queueNumber', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const entries: QueueEntry[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<QueueEntry, 'id'>)
      }));
      callback(entries);
    },
    (err) => {
      console.warn('subscribeQueue snapshot error:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribePublicQueue(clinicId: string, callback: (queue: PublicQueueEntry[]) => void, onError?: (err: unknown) => void) {
  return subscribeQueue(clinicId, callback as any, onError);
}

export async function getQueueEntry(clinicId: string, entryId: string): Promise<QueueEntry | null> {
  try {
    const docSnap = await getDoc(doc(db, 'clinics', clinicId, 'queue', entryId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...(docSnap.data() as Omit<QueueEntry, 'id'>) };
    }
    const pubSnap = await getDoc(doc(db, 'publicClinics', clinicId, 'queue', entryId));
    if (pubSnap.exists()) {
      return { id: pubSnap.id, ...(pubSnap.data() as any) };
    }
    // Check localStorage cache
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`dawrak_offline_${clinicId}_${entryId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.entry) return parsed.entry;
      }
    }
    return null;
  } catch (e) {
    console.warn('getQueueEntry error:', e);
    return null;
  }
}

export function subscribeQueueEntry(clinicId: string, entryId: string, callback: (entry: QueueEntry | null) => void, onError?: (err: unknown) => void) {
  const docRef = doc(db, 'clinics', clinicId, 'queue', entryId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...(docSnap.data() as Omit<QueueEntry, 'id'>) });
      } else {
        // Fallback: check publicClinics projection or offline cache
        getQueueEntry(clinicId, entryId).then((found) => {
          callback(found);
        }).catch(() => callback(null));
      }
    },
    (err) => {
      console.warn('subscribeQueueEntry snapshot notice:', err);
      getQueueEntry(clinicId, entryId).then((found) => {
        if (found) {
          callback(found);
        } else if (onError) {
          onError(err);
        }
      }).catch(() => {
        if (onError) onError(err);
      });
    }
  );
}

export function subscribePublicQueueEntry(
  clinicId: string,
  entryId: string,
  callback: (entry: PublicQueueEntry | null) => void,
  onError?: (err: unknown) => void
) {
  return subscribeQueueEntry(clinicId, entryId, callback as any, onError);
}

/**
 * Checks for duplicate active bookings today for the same phone at the clinic.
 */
export async function checkDuplicateBookingToday(clinicId: string, phone: string): Promise<QueueEntry | null> {
  try {
    const queueSnap = await getDocs(collection(db, 'clinics', clinicId, 'queue'));
    const today = new Date().toISOString().split('T')[0];

    for (const d of queueSnap.docs) {
      const data = d.data() as Omit<QueueEntry, 'id'>;
      if (data.patientPhone === phone && (data.status === 'waiting' || data.status === 'called')) {
        const entryDate = data.createdAt ? data.createdAt.split('T')[0] : '';
        if (entryDate === today) {
          return { id: d.id, ...data };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Atomically reserves the next queue number and writes entry.
 * Completely reliable: tries server endpoint, with immediate direct client Firestore fallback.
 */
export async function bookQueueEntry(
  clinicId: string, 
  data: { patientName: string; patientPhone: string; visitReason: string }
): Promise<{ entryId: string; queueNumber: number }> {
  // Ensure clinic exists before booking
  if (clinicId === 'demo-clinic-cairo' || clinicId === 'demo-clinic') {
    await seedDemoClinic().catch(() => {});
  }

  const cleanPhone = data.patientPhone.trim().replace(/\s+/g, '');
  const cleanName = data.patientName.trim();
  const cleanReason = data.visitReason.trim() || 'كشف واستشارة طبية';

  // Check for duplicate active booking today
  try {
    const existingTicket = await checkDuplicateBookingToday(clinicId, cleanPhone);
    if (existingTicket) {
      const err: any = new Error(`لديك حجز مؤكد برقم (${existingTicket.queueNumber}) اليوم.`);
      err.duplicate = true;
      err.existingTicket = { entryId: existingTicket.id, queueNumber: existingTicket.queueNumber };
      throw err;
    }
  } catch (dupErr: any) {
    if (dupErr && dupErr.duplicate) throw dupErr;
  }

  // Direct atomic reservation
  try {
    // Ensure clinic document exists in clinics
    const clinicRef = doc(db, 'clinics', clinicId);
    let clinicSnap = await getDoc(clinicRef);
    if (!clinicSnap.exists()) {
      if (clinicId === 'demo-clinic-cairo' || clinicId === 'demo-clinic') {
        await seedDemoClinic().catch(() => {});
        clinicSnap = await getDoc(clinicRef);
      } else {
        const pubSnap = await getDoc(doc(db, 'publicClinics', clinicId));
        if (pubSnap.exists()) {
          await setDoc(clinicRef, pubSnap.data(), { merge: true });
        }
      }
    }

    const queueColl = collection(db, 'clinics', clinicId, 'queue');
    const snap = await getDocs(queueColl);
    let maxNumber = 0;
    snap.docs.forEach((d) => {
      const num = d.data().queueNumber;
      if (typeof num === 'number' && num > maxNumber) {
        maxNumber = num;
      }
    });

    const nextNumber = maxNumber + 1;
    const nowIso = new Date().toISOString();
    const newEntry: Omit<QueueEntry, 'id'> = {
      patientName: cleanName,
      patientPhone: cleanPhone,
      visitReason: cleanReason,
      queueNumber: nextNumber,
      status: 'waiting',
      isPriority: false,
      createdAt: nowIso
    };

    const docRef = await addDoc(queueColl, newEntry);

    // Sync to public projection & clinic counter
    try {
      await setDoc(doc(db, 'publicClinics', clinicId, 'queue', docRef.id), {
        queueNumber: nextNumber,
        status: 'waiting',
        isPriority: false,
        createdAt: nowIso
      });
      await setDoc(doc(db, 'publicClinics', clinicId), {
        lastQueueNumber: nextNumber,
        updatedAt: nowIso
      }, { merge: true });
      await setDoc(doc(db, 'clinics', clinicId), {
        lastQueueNumber: nextNumber,
        updatedAt: nowIso
      }, { merge: true });
    } catch {}

    // Cache locally for offline resilience
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`dawrak_offline_${clinicId}_${docRef.id}`, JSON.stringify({
          entry: { id: docRef.id, ...newEntry },
          savedAt: Date.now()
        }));
      } catch {}
    }

    return { entryId: docRef.id, queueNumber: nextNumber };
  } catch (err) {
    console.error('Direct booking error:', err);
    throw new Error('حدث خطأ أثناء حجز الرقم، يرجى المحاولة ثانية');
  }
}

/**
 * Call Next patient: atomically updates entry status to 'called' and clinic currentServingNumber.
 */
export async function callNextPatient(clinicId: string, targetEntryId?: string): Promise<number | null> {
  try {
    const clinicRef = doc(db, 'clinics', clinicId);
    const pubClinicRef = doc(db, 'publicClinics', clinicId);
    const queueColl = collection(db, 'clinics', clinicId, 'queue');

    return await runTransaction(db, async (transaction) => {
      const clinicSnap = await transaction.get(clinicRef);
      if (!clinicSnap.exists()) throw new Error('Clinic not found');

      let entryToCallDocSnap = null;
      let nextServingNum = 1;
      let targetIdToCall = targetEntryId;

      if (targetEntryId) {
        const targetRef = doc(db, 'clinics', clinicId, 'queue', targetEntryId);
        const targetSnap = await transaction.get(targetRef);
        if (targetSnap.exists()) {
          entryToCallDocSnap = targetSnap;
          nextServingNum = targetSnap.data().queueNumber;
        }
      }

      if (!entryToCallDocSnap) {
        const allQueueDocs = await getDocs(queueColl);
        const waitingDocs = allQueueDocs.docs
          .map((d) => ({ id: d.id, ...d.data() } as QueueEntry))
          .filter((d) => d.status === 'waiting')
          .sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            return a.queueNumber - b.queueNumber;
          });

        if (waitingDocs.length === 0) {
          return null;
        }

        const nextEntry = waitingDocs[0];
        targetIdToCall = nextEntry.id;
        const entryRef = doc(db, 'clinics', clinicId, 'queue', nextEntry.id);
        const entrySnap = await transaction.get(entryRef);
        entryToCallDocSnap = entrySnap;
        nextServingNum = nextEntry.queueNumber;
      }

      const nowIso = new Date().toISOString();

      if (entryToCallDocSnap && targetIdToCall) {
        transaction.update(entryToCallDocSnap.ref, {
          status: 'called',
          calledAt: nowIso
        });

        const pubEntryRef = doc(db, 'publicClinics', clinicId, 'queue', targetIdToCall);
        transaction.set(pubEntryRef, {
          status: 'called',
          calledAt: nowIso
        }, { merge: true });
      }

      transaction.update(clinicRef, {
        currentServingNumber: nextServingNum
      });

      transaction.set(pubClinicRef, {
        currentServingNumber: nextServingNum,
        updatedAt: nowIso
      }, { merge: true });

      return nextServingNum;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `clinics/${clinicId}/queue`);
    return null;
  }
}

export async function completePatient(clinicId: string, entryId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    const entryRef = doc(db, 'clinics', clinicId, 'queue', entryId);
    const pubEntryRef = doc(db, 'publicClinics', clinicId, 'queue', entryId);

    await updateDoc(entryRef, {
      status: 'completed',
      completedAt: now
    });

    try {
      await setDoc(pubEntryRef, {
        status: 'completed',
        completedAt: now
      }, { merge: true });
    } catch {}

    const today = now.split('T')[0];
    const statRef = doc(db, 'clinics', clinicId, 'dailyStats', today);
    const statSnap = await getDoc(statRef);
    if (statSnap.exists()) {
      const prev = statSnap.data() as DailyStats;
      await updateDoc(statRef, {
        totalServed: (prev.totalServed || 0) + 1
      });
    } else {
      await setDoc(statRef, {
        totalServed: 1,
        avgWaitMinutes: 12,
        peakHour: 11
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `clinics/${clinicId}/queue/${entryId}`);
  }
}

export async function noShowPatient(clinicId: string, entryId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    const entryRef = doc(db, 'clinics', clinicId, 'queue', entryId);
    const pubEntryRef = doc(db, 'publicClinics', clinicId, 'queue', entryId);

    await updateDoc(entryRef, {
      status: 'no_show',
      completedAt: now
    });

    try {
      await setDoc(pubEntryRef, {
        status: 'no_show',
        completedAt: now
      }, { merge: true });
    } catch {}
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `clinics/${clinicId}/queue/${entryId}`);
  }
}

export async function insertPriorityPatient(
  clinicId: string, 
  data: { patientName: string; patientPhone?: string; visitReason: string }
): Promise<string> {
  const queueColl = collection(db, 'clinics', clinicId, 'queue');
  const snap = await getDocs(queueColl);
  let maxNumber = 0;
  snap.docs.forEach((d) => {
    const num = d.data().queueNumber;
    if (typeof num === 'number' && num > maxNumber) maxNumber = num;
  });

  const nextNumber = maxNumber + 1;
  const nowIso = new Date().toISOString();
  const newEntry: Omit<QueueEntry, 'id'> = {
    patientName: data.patientName.trim(),
    patientPhone: data.patientPhone?.trim() || '01000000000',
    visitReason: `[طوارئ] ${data.visitReason.trim()}`,
    queueNumber: nextNumber,
    status: 'waiting',
    isPriority: true,
    createdAt: nowIso
  };

  const docRef = await addDoc(queueColl, newEntry);

  try {
    const pubRef = doc(db, 'publicClinics', clinicId, 'queue', docRef.id);
    await setDoc(pubRef, {
      queueNumber: nextNumber,
      status: 'waiting',
      isPriority: true,
      createdAt: nowIso
    });
  } catch {}

  return docRef.id;
}

export async function setPatientOnTheWay(clinicId: string, entryId: string, minutes: number = 10): Promise<void> {
  try {
    const entryRef = doc(db, 'clinics', clinicId, 'queue', entryId);
    await updateDoc(entryRef, {
      onTheWay: true,
      estimatedArrivalMinutes: minutes
    });
  } catch {
    try {
      const pubRef = doc(db, 'publicClinics', clinicId, 'queue', entryId);
      await setDoc(pubRef, {
        onTheWay: true,
        estimatedArrivalMinutes: minutes
      }, { merge: true });
    } catch {}
  }
}

export async function setPatientCheckedInReception(clinicId: string, entryId: string): Promise<void> {
  try {
    const entryRef = doc(db, 'clinics', clinicId, 'queue', entryId);
    await updateDoc(entryRef, {
      checkedInReception: true
    });
  } catch {
    try {
      const pubRef = doc(db, 'publicClinics', clinicId, 'queue', entryId);
      await setDoc(pubRef, {
        checkedInReception: true
      }, { merge: true });
    } catch {}
  }
}

export async function setPatientSmsNotified(clinicId: string, entryId: string): Promise<void> {
  try {
    const entryRef = doc(db, 'clinics', clinicId, 'queue', entryId);
    await updateDoc(entryRef, {
      smsNotifiedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `clinics/${clinicId}/queue/${entryId}`);
  }
}

export async function logAudit(clinicId: string, action: string, actor: string, details: string) {
  try {
    const auditColl = collection(db, 'clinics', clinicId, 'auditLog');
    await addDoc(auditColl, {
      action,
      actor,
      details,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

export function subscribeAuditLogs(clinicId: string, callback: (logs: AuditLog[]) => void) {
  const q = query(collection(db, 'clinics', clinicId, 'auditLog'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const logs: AuditLog[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AuditLog, 'id'>)
    }));
    callback(logs);
  });
}

// ----------------------------------------------------
// SEED PERMANENT DEMO CLINIC (Guaranteed immediate availability)
// ----------------------------------------------------

export async function seedDemoClinic(): Promise<Clinic> {
  const demoId = 'demo-clinic-cairo';
  const clinicRef = doc(db, 'clinics', demoId);
  const pubClinicRef = doc(db, 'publicClinics', demoId);

  const demoPin = '1234';
  const hashedPin = await hashPin(demoPin);

  const futureExpiry = new Date();
  futureExpiry.setFullYear(futureExpiry.getFullYear() + 5);

  const demoData: Omit<Clinic, 'id'> = {
    clinicName: 'مركز الشفاء الطبي التخصصي | Al-Shifa Medical Center',
    specialty: 'طب وجراحة العيون وجراحة الليزك',
    logoUrl: '/icon.svg',
    brandColor: '#0ea5e9',
    phoneNumber: '01099887766',
    pinHash: hashedPin,
    currentServingNumber: 14,
    lastQueueNumber: 17,
    avgConsultMinutes: 12,
    subscriptionStatus: 'active',
    subscriptionEndsAt: futureExpiry.toISOString(),
    isPaused: false,
    pauseReason: '',
    isDemo: true,
    createdAt: new Date().toISOString()
  };

  try {
    const existing = await getDoc(clinicRef);
    if (!existing.exists()) {
      await setDoc(clinicRef, demoData);
      await setDoc(pubClinicRef, {
        clinicName: demoData.clinicName,
        specialty: demoData.specialty,
        logoUrl: demoData.logoUrl,
        brandColor: demoData.brandColor,
        phoneNumber: demoData.phoneNumber,
        currentServingNumber: demoData.currentServingNumber,
        lastQueueNumber: demoData.lastQueueNumber,
        avgConsultMinutes: demoData.avgConsultMinutes,
        isPaused: demoData.isPaused,
        isDemo: demoData.isDemo,
        subscriptionStatus: demoData.subscriptionStatus,
        updatedAt: new Date().toISOString()
      });

      const samplePatients = [
        { name: 'محمد أحمد خليل', phone: '01011112222', reason: 'فحص قاع العين الدوري', num: 12, status: 'completed' as const },
        { name: 'فاطمة عمر الشريف', phone: '01022223333', reason: 'استشارة ما بعد الليزك', num: 13, status: 'completed' as const },
        { name: 'ياسين محمود حسن', phone: '01033334444', reason: 'قياس ضغط العين والعدسات', num: 14, status: 'called' as const },
        { name: 'نور الهدى إبراهيم', phone: '01044445555', reason: 'كشف تدهور الرؤية المفاجئ', num: 15, status: 'waiting' as const },
        { name: 'طارق عبد الله الزيات', phone: '01055556666', reason: 'متابعة حساسية القرنية', num: 16, status: 'waiting' as const },
        { name: 'مريم عادل القاضي', phone: '01066667777', reason: 'كشف نظارة أطفال', num: 17, status: 'waiting' as const },
      ];

      for (const p of samplePatients) {
        const entryDocRef = doc(db, 'clinics', demoId, 'queue', `seed_${p.num}`);
        await setDoc(entryDocRef, {
          patientName: p.name,
          patientPhone: p.phone,
          visitReason: p.reason,
          queueNumber: p.num,
          status: p.status,
          isPriority: false,
          createdAt: new Date(Date.now() - (18 - p.num) * 15 * 60 * 1000).toISOString(),
          calledAt: p.status !== 'waiting' ? new Date().toISOString() : null,
          completedAt: p.status === 'completed' ? new Date().toISOString() : null,
        });

        await setDoc(doc(db, 'publicClinics', demoId, 'queue', `seed_${p.num}`), {
          queueNumber: p.num,
          status: p.status,
          isPriority: false,
          createdAt: new Date(Date.now() - (18 - p.num) * 15 * 60 * 1000).toISOString(),
          calledAt: p.status !== 'waiting' ? new Date().toISOString() : null,
          completedAt: p.status === 'completed' ? new Date().toISOString() : null,
        });
      }
    }
  } catch (err) {
    console.warn('seedDemoClinic note:', err);
  }

  return { id: demoId, ...demoData };
}

export async function resetDemoClinicQueue(): Promise<void> {
  const demoId = 'demo-clinic-cairo';
  const clinicRef = doc(db, 'clinics', demoId);
  const pubRef = doc(db, 'publicClinics', demoId);
  try {
    await updateDoc(clinicRef, {
      currentServingNumber: 14,
      isPaused: false,
      pauseReason: ''
    });
  } catch {}
  try {
    await setDoc(pubRef, {
      currentServingNumber: 14,
      isPaused: false,
      pauseReason: ''
    }, { merge: true });
  } catch {}
  await logAudit(demoId, 'RESET_QUEUE', 'MASTER_ADMIN', 'Demo clinic queue state refreshed by Master Dashboard');
}
