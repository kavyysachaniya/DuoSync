import express from 'express';
import { authRouter } from './auth';
import { syncRouter } from './sync';
import { mutateRouter } from './mutate';
import { uploadRouter } from './upload';
import { adminRouter } from './admin';

const app = express();

// Enable JSON body parsing with sufficient limit for photo uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Cross-Origin Resource Sharing (CORS) headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-key');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Mount routes with and without /api prefix for maximum Vercel & local proxy compatibility
app.use(['/api/auth', '/auth'], authRouter);
app.use(['/api/sync', '/sync'], syncRouter);
app.use(['/api/mutate', '/mutate'], mutateRouter);
app.use(['/api/upload', '/upload'], uploadRouter);
app.use(['/api/admin', '/admin'], adminRouter);

// Root API status endpoint
app.get(['/api', '/api/index', '/'], (_req, res) => {
  res.json({
    app: 'DuoSync API',
    status: 'online',
    version: '2.0.0',
    backend: 'Neon PostgreSQL',
  });
});

export { app };

export default function handler(req: any, res: any) {
  return app(req, res);
}
