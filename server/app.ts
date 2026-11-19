import express, { Request, Response, NextFunction } from 'express';
import { authRouter } from './auth.js';
import { syncRouter } from './sync.js';
import { mutateRouter } from './mutate.js';
import { uploadRouter } from './upload.js';
import { adminRouter } from './admin.js';

const app = express();

// Enable JSON body parsing with generous limit for photo uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Cross-Origin Resource Sharing (CORS) headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-key'
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Root API status endpoint - supports /api, /api/index, and /
app.get(['/api', '/api/index', '/'], (_req: Request, res: Response) => {
  res.json({
    app: 'DuoSync API',
    status: 'online',
    version: '2.0.0',
    backend: 'Neon PostgreSQL',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routers supporting both /api/<route> and /<route> prefixes
app.use(['/api/auth', '/auth'], authRouter);
app.use(['/api/sync', '/sync'], syncRouter);
app.use(['/api/mutate', '/mutate'], mutateRouter);
app.use(['/api/upload', '/upload'], uploadRouter);
app.use(['/api/admin', '/admin'], adminRouter);

// 404 Catch-All for unmatched API requests
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'API route not found',
    path: req.path,
    url: req.url,
    method: req.method,
  });
});

// Global 500 Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API Server Error:', err);
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({
    error: message,
    status: 500,
  });
});

export { app };
export default app;

