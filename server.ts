import express from 'express';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/apiRouter';

async function startServer() {
  const app = express();
  const port = 3000;

  // JSON Body Parser for API routes
  app.use(express.json());

  // Mount API endpoints under /api
  app.use('/api', apiRouter);

  // In development, mount Vite dev server middlewares
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In local production preview
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Dawrak Live server ready at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
