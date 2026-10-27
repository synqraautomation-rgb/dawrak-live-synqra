import { getAdminDb } from './firebaseAdmin.ts';

export interface BookingRequest {
  clinicId: string;
  patientName: string;
  patientPhone: string;
  visitReason: string;
}

export interface BookingResponse {
  success: boolean;
  entryId?: string;
  queueNumber?: number;
  duplicate?: boolean;
  existingTicket?: {
    entryId: string;
    queueNumber: number;
  };
  error?: string;
  errorCode?: string;
}

export async function processBooking(req: BookingRequest): Promise<BookingResponse> {
  const clinicId = (req.clinicId || '').trim();
  const patientName = (req.patientName || '').trim();
  const patientPhone = (req.patientPhone || '').trim().replace(/\s+/g, '');
  const visitReason = (req.visitReason || '').trim() || 'كشف واستشارة طبية';

  // 1. Validation
  if (!clinicId) {
    return { success: false, error: 'معرّف العيادة مطلوب', errorCode: 'INVALID_CLINIC_ID' };
  }
  if (!patientName || patientName.length < 2 || patientName.length > 100) {
    return { success: false, error: 'اسم المريض يجب أن يتكون من حرفين إلى 100 حرف', errorCode: 'INVALID_NAME' };
  }
  if (!patientPhone || !/^[0-9+]{8,20}$/.test(patientPhone)) {
    return { success: false, error: 'رقم الهاتف غير صالح، يرجى إدخال 8 أرقام على الأقل', errorCode: 'INVALID_PHONE' };
  }
  if (visitReason.length > 200) {
    return { success: false, error: 'سبب الزيارة طويل جداً (الحد الأقصى 200 حرف)', errorCode: 'REASON_TOO_LONG' };
  }

  const db = getAdminDb();
  const clinicRef = db.collection('clinics').doc(clinicId);
  const publicClinicRef = db.collection('publicClinics').doc(clinicId);

  // 2. Verify clinic status
  const clinicSnap = await clinicRef.get();
  if (!clinicSnap.exists) {
    return { success: false, error: 'العيادة المطلوبة غير موجودة', errorCode: 'CLINIC_NOT_FOUND' };
  }

  const clinicData = clinicSnap.data() || {};

  // Check clinic pause / subscription
  if (clinicData.isPaused) {
    return {
      success: false,
      error: clinicData.pauseReason || 'الحجز متوقف حالياً في هذه العيادة',
      errorCode: 'CLINIC_PAUSED'
    };
  }

  if (clinicData.subscriptionStatus === 'paused') {
    return {
      success: false,
      error: 'اشتراك العيادة معلق حالياً',
      errorCode: 'SUBSCRIPTION_PAUSED'
    };
  }

  if (clinicData.subscriptionEndsAt) {
    const expiry = new Date(clinicData.subscriptionEndsAt).getTime();
    if (expiry < Date.now()) {
      return {
        success: false,
        error: 'اشتراك العيادة منتهي، يرجى التواصل مع إدارة العيادة',
        errorCode: 'SUBSCRIPTION_EXPIRED'
      };
    }
  }

  // Check demo clinic lock
  if (clinicData.isDemo || clinicId === 'demo-clinic-cairo' || clinicId === 'demo-clinic') {
    if (clinicData.isDemoHidden) {
      return {
        success: false,
        error: 'العيادة التجريبية مقفلة وممنوعة من الحجز حالياً بتعليمات الإدارة (وضع العمل التجاري مفعّل)',
        errorCode: 'DEMO_LOCKED'
      };
    }
  }

  // 3. Check duplicate active bookings today on private data
  const today = new Date().toISOString().split('T')[0];
  const queueCollRef = clinicRef.collection('queue');
  const duplicateQuerySnap = await queueCollRef
    .where('patientPhone', '==', patientPhone)
    .where('status', 'in', ['waiting', 'called'])
    .get();

  for (const docSnap of duplicateQuerySnap.docs) {
    const d = docSnap.data();
    const entryDate = d.createdAt ? d.createdAt.split('T')[0] : '';
    if (entryDate === today) {
      return {
        success: false,
        duplicate: true,
        error: 'لديك حجز نشط بالفعل اليوم في هذه العيادة',
        errorCode: 'DUPLICATE_BOOKING',
        existingTicket: {
          entryId: docSnap.id,
          queueNumber: d.queueNumber
        }
      };
    }
  }

  // 4. Atomic transaction to allocate queue number and commit writes
  const result = await db.runTransaction(async (transaction) => {
    const currentClinicSnap = await transaction.get(clinicRef);
    if (!currentClinicSnap.exists) {
      throw new Error('العيادة غير موجودة');
    }
    const currentData = currentClinicSnap.data() || {};

    let lastNum = typeof currentData.lastQueueNumber === 'number' ? currentData.lastQueueNumber : 0;

    // Safe initialization: if lastQueueNumber is not yet set, inspect current max in queue
    if (lastNum === 0) {
      const existingQueueSnap = await queueCollRef.get();
      existingQueueSnap.docs.forEach((docSnap) => {
        const num = docSnap.data().queueNumber;
        if (typeof num === 'number' && num > lastNum) {
          lastNum = num;
        }
      });
    }

    const nextQueueNumber = lastNum + 1;
    const nowIso = new Date().toISOString();

    // Generate new document IDs
    const newEntryRef = queueCollRef.doc();
    const entryId = newEntryRef.id;
    const publicEntryRef = publicClinicRef.collection('queue').doc(entryId);

    // Write 1: Protected private record (PII isolated)
    transaction.set(newEntryRef, {
      patientName,
      patientPhone,
      visitReason,
      queueNumber: nextQueueNumber,
      status: 'waiting',
      isPriority: false,
      createdAt: nowIso
    });

    // Write 2: Anonymized public projection (zero patient names or phones)
    transaction.set(publicEntryRef, {
      queueNumber: nextQueueNumber,
      status: 'waiting',
      isPriority: false,
      createdAt: nowIso
    });

    // Write 3: Update private clinic counters
    transaction.update(clinicRef, {
      lastQueueNumber: nextQueueNumber,
      totalBookedToday: (currentData.totalBookedToday || 0) + 1
    });

    // Write 4: Synchronize public clinic projection
    transaction.set(
      publicClinicRef,
      {
        clinicName: currentData.clinicName || '',
        doctorName: currentData.doctorName || '',
        specialty: currentData.specialty || '',
        logoUrl: currentData.logoUrl || '/icon.svg',
        brandColor: currentData.brandColor || '#0ea5e9',
        phoneNumber: currentData.phoneNumber || '',
        currentServingNumber: currentData.currentServingNumber || 0,
        lastQueueNumber: nextQueueNumber,
        avgConsultMinutes: currentData.avgConsultMinutes || 10,
        isPaused: Boolean(currentData.isPaused),
        pauseReason: currentData.pauseReason || '',
        isDemo: Boolean(currentData.isDemo),
        isDemoHidden: Boolean(currentData.isDemoHidden),
        subscriptionStatus: currentData.subscriptionStatus || 'active',
        updatedAt: nowIso
      },
      { merge: true }
    );

    return { entryId, queueNumber: nextQueueNumber };
  });

  return {
    success: true,
    entryId: result.entryId,
    queueNumber: result.queueNumber
  };
}
