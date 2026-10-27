import { Router, Request, Response } from 'express';
import { processBooking } from './bookingLogic.ts';
import { processClinicLogin } from './clinicLoginLogic.ts';
import { getAdminDb, hasAdminCredentials } from './firebaseAdmin.ts';

export const apiRouter = Router();

// Health / Status Check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    adminConfigured: hasAdminCredentials(),
    timestamp: new Date().toISOString()
  });
});

// Patient Booking Endpoint
apiRouter.post('/book', async (req: Request, res: Response) => {
  try {
    const result = await processBooking(req.body);
    if (!result.success) {
      if (result.duplicate) {
        return res.status(409).json(result);
      }
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'حدث خطأ في معالجة الحجز';
    console.error('API /book error:', message);
    if (message.includes('FIREBASE_SERVICE_ACCOUNT_JSON') || message.includes('بيانات اعتماد Firebase Admin')) {
      return res.status(503).json({
        success: false,
        error: message,
        errorCode: 'ADMIN_CREDENTIALS_REQUIRED'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'فشل حجز التذكرة بالسيرفر، يرجى المحاولة لاحقاً',
      errorCode: 'INTERNAL_ERROR'
    });
  }
});

// Clinic Staff Login Endpoint
apiRouter.post('/clinic-login', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const result = await processClinicLogin({
      identifier: req.body.identifier,
      pin: req.body.pin,
      clientIp
    });

    if (!result.success) {
      if (result.errorCode === 'RATE_LIMITED') {
        return res.status(429).json(result);
      }
      return res.status(401).json(result);
    }
    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول';
    console.error('API /clinic-login error:', message);
    if (message.includes('FIREBASE_SERVICE_ACCOUNT_JSON') || message.includes('بيانات اعتماد Firebase Admin')) {
      return res.status(503).json({
        success: false,
        error: message,
        errorCode: 'ADMIN_CREDENTIALS_REQUIRED'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'فشل تسجيل الدخول بالسيرفر، يرجى المحاولة لاحقاً',
      errorCode: 'INTERNAL_ERROR'
    });
  }
});

// Public Clinics Directory Endpoint
apiRouter.get('/public-clinics', async (_req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const snap = await db.collection('publicClinics').get();
    const clinics = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
    return res.status(200).json({ success: true, clinics });
  } catch (err: unknown) {
    console.warn('API /public-clinics lookup notice:', err);
    return res.status(200).json({ success: true, clinics: [] });
  }
});
