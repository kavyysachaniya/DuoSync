import { Router, Response } from 'express';
import { getDb, isDbConfigured } from './db.js';
import { AuthenticatedRequest, requireAuth } from './auth.js';

export const syncRouter = Router();

// 1. LIGHTWEIGHT SYNC HEARTBEAT POLL (Instant check, < 30ms)
syncRouter.get('/poll', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const workspaceId = (req.query.workspace_id as string) || req.user?.workspaceId;
    const since = Number(req.query.since || 0);

    if (!workspaceId) {
      res.status(400).json({ error: 'workspace_id query parameter is required.' });
      return;
    }

    const sql = getDb();
    const rows = await sql`
      SELECT last_sync_timestamp FROM public.workspaces WHERE id = ${workspaceId} LIMIT 1
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'Workspace not found.' });
      return;
    }

    const currentTimestamp = Number(rows[0].last_sync_timestamp || 0);
    const changed = currentTimestamp > since;

    res.json({
      timestamp: currentTimestamp,
      changed,
    });
  } catch (error: unknown) {
    console.error('Sync poll error:', error);
    const msg = error instanceof Error ? error.message : 'Sync poll failed.';
    res.status(500).json({ error: msg });
  }
});

// 2. COMPLETE WORKSPACE STATE SYNC
syncRouter.get('/all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const workspaceId = (req.query.workspace_id as string) || req.user?.workspaceId;
    if (!workspaceId) {
      res.status(400).json({ error: 'workspace_id is required.' });
      return;
    }

    const sql = getDb();

    // Fetch workspace
    const [workspace] = await sql`
      SELECT * FROM public.workspaces WHERE id = ${workspaceId} LIMIT 1
    `;

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found.' });
      return;
    }

    // Parallel fetch of all workspace datasets
    const [
      members,
      healthLogs,
      careProducts,
      routineCompletions,
      wardrobeItems,
      outfits,
      pairingCodes,
    ] = await Promise.all([
      sql`SELECT * FROM public.workspace_members WHERE workspace_id = ${workspaceId} ORDER BY slot ASC`,
      sql`SELECT * FROM public.health_logs WHERE workspace_id = ${workspaceId} ORDER BY date DESC LIMIT 200`,
      sql`SELECT * FROM public.care_products WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC`,
      sql`SELECT * FROM public.routine_completions WHERE workspace_id = ${workspaceId} ORDER BY date DESC LIMIT 500`,
      sql`SELECT * FROM public.wardrobe_items WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC`,
      sql`SELECT * FROM public.outfits WHERE workspace_id = ${workspaceId} ORDER BY created_at DESC`,
      sql`SELECT code FROM public.pairing_codes WHERE workspace_id = ${workspaceId} LIMIT 1`,
    ]);

    const pairingCode = pairingCodes[0]?.code || '';

    res.json({
      workspace,
      members,
      healthLogs,
      careProducts,
      routineCompletions,
      wardrobeItems,
      outfits,
      pairingCode,
      timestamp: Number(workspace.last_sync_timestamp || Date.now()),
    });
  } catch (error: unknown) {
    console.error('Sync all error:', error);
    const msg = error instanceof Error ? error.message : 'Sync failed.';
    res.status(500).json({ error: msg });
  }
});
