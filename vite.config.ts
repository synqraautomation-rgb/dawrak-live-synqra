import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        if (req.url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
          return;
        }

        if (req.url === '/api/book' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { processBooking } = await import('./src/server/bookingLogic.ts');
              const parsed = JSON.parse(body || '{}');
              const result = await processBooking(parsed);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.success ? 200 : (result.duplicate ? 409 : 400);
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              const isConfigMissing = err.message?.includes('FIREBASE_SERVICE_ACCOUNT_JSON') || err.message?.includes('بيانات اعتماد Firebase Admin');
              res.statusCode = isConfigMissing ? 503 : 500;
              res.end(JSON.stringify({
                success: false,
                error: err.message || 'حدث خطأ في السيرفر',
                errorCode: isConfigMissing ? 'ADMIN_CREDENTIALS_REQUIRED' : 'INTERNAL_ERROR'
              }));
            }
          });
          return;
        }

        if (req.url === '/api/clinic-login' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { processClinicLogin } = await import('./src/server/clinicLoginLogic.ts');
              const parsed = JSON.parse(body || '{}');
              const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
              const result = await processClinicLogin({
                identifier: parsed.identifier,
                pin: parsed.pin,
                clientIp
              });
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.success ? 200 : (result.errorCode === 'RATE_LIMITED' ? 429 : 401);
              res.end(JSON.stringify(result));
            } catch (err: any) {
              res.setHeader('Content-Type', 'application/json');
              const isConfigMissing = err.message?.includes('FIREBASE_SERVICE_ACCOUNT_JSON') || err.message?.includes('بيانات اعتماد Firebase Admin');
              res.statusCode = isConfigMissing ? 503 : 500;
              res.end(JSON.stringify({
                success: false,
                error: err.message || 'حدث خطأ في تسجيل الدخول',
                errorCode: isConfigMissing ? 'ADMIN_CREDENTIALS_REQUIRED' : 'INTERNAL_ERROR'
              }));
            }
          });
          return;
        }

        if (req.url === '/api/public-clinics' && req.method === 'GET') {
          try {
            const { getAdminDb } = await import('./src/server/firebaseAdmin.ts');
            const db = getAdminDb();
            const snap = await db.collection('publicClinics').get();
            const clinics = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, clinics }));
          } catch {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, clinics: [] }));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDevMiddleware()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
