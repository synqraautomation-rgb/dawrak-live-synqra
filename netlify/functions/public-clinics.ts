import { getAdminDb } from '../../src/server/firebaseAdmin.ts';

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection('publicClinics').get();
    const clinics = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, clinics })
    };
  } catch (err: unknown) {
    console.warn('public-clinics error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, clinics: [] })
    };
  }
};
