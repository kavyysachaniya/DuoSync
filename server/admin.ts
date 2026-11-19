import { Router, Request, Response } from 'express';
import { getDb, isDbConfigured } from './db.js';

export const adminRouter = Router();

// GET /api/admin/health - Check database connectivity and status
adminRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({
        status: 'unconfigured',
        message: 'DATABASE_URL is not set. Please configure Neon database URL.',
      });
      return;
    }

    const sql = getDb();
    const result = await sql`SELECT now() as current_time, current_database() as db_name`;

    // Get table counts
    const [usersCount] = await sql`SELECT count(*)::int as count FROM public.users`;
    const [wsCount] = await sql`SELECT count(*)::int as count FROM public.workspaces`;

    res.json({
      status: 'healthy',
      database: result[0]?.db_name,
      serverTime: result[0]?.current_time,
      counts: {
        users: usersCount?.count || 0,
        workspaces: wsCount?.count || 0,
      },
    });
  } catch (error: unknown) {
    console.error('Health check error:', error);
    const msg = error instanceof Error ? error.message : 'Database check failed.';
    res.status(500).json({ status: 'unhealthy', error: msg });
  }
});

// POST /api/admin/reset - Complete fresh start database cleanup
adminRouter.post('/reset', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
    const expectedKey = process.env.ADMIN_SECRET || 'duosync-reset-2026';

    if (adminKey !== expectedKey) {
      res.status(403).json({ error: 'Unauthorized. Invalid admin reset key.' });
      return;
    }

    if (!isDbConfigured) {
      res.status(503).json({ error: 'DATABASE_URL is not configured.' });
      return;
    }

    const sql = getDb();

    // Cascading truncate of all tables for a 100% clean slate
    await sql`
      TRUNCATE TABLE
        public.outfits,
        public.wardrobe_items,
        public.routine_completions,
        public.care_products,
        public.health_logs,
        public.pairing_codes,
        public.workspace_members,
        public.workspaces,
        public.users
      CASCADE;
    `;

    res.json({
      success: true,
      message: 'All DuoSync tables, users, workspaces, and credentials have been completely reset.',
      resetAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Database reset error:', error);
    const msg = error instanceof Error ? error.message : 'Reset failed.';
    res.status(500).json({ error: msg });
  }
});

