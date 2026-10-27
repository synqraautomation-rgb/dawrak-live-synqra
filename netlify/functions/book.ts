import { processBooking } from '../../src/server/bookingLogic.ts';

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
    const result = await processBooking(payload);

    let statusCode = 200;
    if (!result.success) {
      statusCode = result.duplicate ? 409 : 400;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify(result)
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'حدث خطأ في الحجز';
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
