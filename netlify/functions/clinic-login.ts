import { processClinicLogin } from '../../src/server/clinicLoginLogic.ts';

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const payload = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body || {};
    const clientIp = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';

    const result = await processClinicLogin({
      identifier: payload.identifier,
      pin: payload.pin,
      clientIp
    });

    let statusCode = 200;
    if (!result.success) {
      statusCode = result.errorCode === 'RATE_LIMITED' ? 429 : 401;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify(result)
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'حدث خطأ في تسجيل الدخول';
    const isConfigMissing = msg.includes('FIREBASE_SERVICE_ACCOUNT_JSON') || msg.includes('بيانات اعتماد Firebase Admin');
    return {
      statusCode: isConfigMissing ? 503 : 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: msg,
        errorCode: isConfigMissing ? 'ADMIN_CREDENTIALS_REQUIRED' : 'INTERNAL_ERROR'
      })
    };
  }
};
