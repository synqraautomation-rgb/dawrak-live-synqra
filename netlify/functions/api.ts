import { handler as bookHandler } from './book.ts';
import { handler as loginHandler } from './clinic-login.ts';
import { handler as publicClinicsHandler } from './public-clinics.ts';

export const handler = async (event: any, context: any) => {
  const path = event.path || '';

  if (path.includes('/book')) {
    return bookHandler(event);
  }
  if (path.includes('/clinic-login')) {
    return loginHandler(event);
  }
  if (path.includes('/public-clinics')) {
    return publicClinicsHandler(event);
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Endpoint not found' })
  };
};
