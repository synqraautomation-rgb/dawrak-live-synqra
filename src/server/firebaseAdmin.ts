import { initializeApp, cert, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

let adminApp: App | null = null;

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

export function hasAdminCredentials(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return true;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;
  return false;
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      adminApp = initializeApp(
        {
          credential: cert(parsed),
          projectId: parsed.project_id || PROJECT_ID,
        },
        'dawrak-admin'
      );
      return adminApp;
    } catch (err) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON parse error:', err);
      throw new Error('فشل قراءة مفتاح حساب الخدمة FIREBASE_SERVICE_ACCOUNT_JSON. تأكد من صحة تنسيق JSON.');
    }
  }

  // Attempt application default credentials
  try {
    adminApp = initializeApp(
      {
        credential: applicationDefault(),
        projectId: PROJECT_ID,
      },
      'dawrak-admin'
    );
    return adminApp;
  } catch (err) {
    console.warn('Firebase Admin default credentials not found:', err);
    throw new Error(
      'لم يتم العثور على بيانات اعتماد Firebase Admin. يرجى ضبط المتغير البيئي FIREBASE_SERVICE_ACCOUNT_JSON في Netlify أو ملف .env.'
    );
  }
}

export function getAdminDb() {
  const app = getAdminApp();
  return getFirestore(app, DATABASE_ID);
}

export function getAdminAuth() {
  const app = getAdminApp();
  return getAuth(app);
}

export async function hashPinServer(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`dawrak_salt_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
