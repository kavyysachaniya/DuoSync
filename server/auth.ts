import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, isDbConfigured, JWT_SECRET } from './db.js';

export const authRouter = Router();

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    workspaceId: string | null;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No Bearer token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      workspaceId: string | null;
    };
    req.user = decoded;
    next();
  } catch (_err) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

function sanitizeUser(user: Record<string, unknown>) {
  const { password_hash, ...rest } = user;
  return rest;
}

const DEFAULT_SKINCARE = ['Cleanser', 'Toner', 'Serum', 'Moisturizer', 'Sunscreen', 'Lip Care'];
const DEFAULT_HAIRCARE = ['Shampoo', 'Conditioner', 'Hair Mask', 'Hair Serum', 'Scalp Oil'];
const DEFAULT_BODYCARE = ['Body Wash', 'Body Lotion', 'Body Scrub', 'Deodorant'];

// 1. REGISTER
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({
        error: 'Database is not configured. Please set DATABASE_URL in Vercel or your .env file.',
      });
      return;
    }

    const { email, password, name, defaultSlot = 'partner1' } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    const cleanName = String(name || '').trim().slice(0, 50) || 'My Profile';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (cleanPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const sql = getDb();

    // Check existing user
    const existing = await sql`SELECT id FROM public.users WHERE email = ${cleanEmail} LIMIT 1`;
    if (existing.length > 0) {
      res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
      return;
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const nowTs = Date.now();

    // Create user
    const [user] = await sql`
      INSERT INTO public.users (email, password_hash, display_name, default_slot, onboarding_completed)
      VALUES (${cleanEmail}, ${passwordHash}, ${cleanName}, ${defaultSlot}, false)
      RETURNING *
    `;

    // Create workspace
    const [workspace] = await sql`
      INSERT INTO public.workspaces (
        owner_id, currency, onboarding_completed,
        skincare_categories, haircare_categories, bodycare_categories,
        product_ids, last_sync_timestamp
      ) VALUES (
        ${user.id}, '₹', false,
        ${DEFAULT_SKINCARE}, ${DEFAULT_HAIRCARE}, ${DEFAULT_BODYCARE},
        ${[]}, ${nowTs}
      )
      RETURNING *
    `;

    // Link workspace to user
    await sql`UPDATE public.users SET workspace_id = ${workspace.id} WHERE id = ${user.id}`;
    user.workspace_id = workspace.id;

    // Create workspace members (partner1 and partner2 slot)
    await sql`
      INSERT INTO public.workspace_members (
        workspace_id, user_id, slot, name, role, weight_unit,
        target_weight, start_weight, steps_goal, sleep_goal_minutes, water_goal_ml
      ) VALUES (
        ${workspace.id}, ${user.id}, 'partner1', ${cleanName},
        ${cleanName + '’s Dashboard'}, 'kg', 62.0, 65.0, 8500, 480, 2500
      )
    `;

    await sql`
      INSERT INTO public.workspace_members (
        workspace_id, user_id, slot, name, role, weight_unit,
        target_weight, start_weight, steps_goal, sleep_goal_minutes, water_goal_ml
      ) VALUES (
        ${workspace.id}, NULL, 'partner2', 'Partner',
        'Partner’s Dashboard', 'kg', 55.0, 58.0, 8500, 480, 2500
      )
    `;

    // Generate 6-digit pairing code
    const pairingCode = String(Math.floor(100000 + Math.random() * 900000));
    await sql`
      INSERT INTO public.pairing_codes (code, workspace_id, owner_id, owner_name)
      VALUES (${pairingCode}, ${workspace.id}, ${user.id}, ${cleanName})
    `;

    const members = await sql`
      SELECT * FROM public.workspace_members WHERE workspace_id = ${workspace.id} ORDER BY slot ASC
    `;

    const token = jwt.sign(
      { userId: user.id, email: user.email, workspaceId: workspace.id },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    res.status(201).json({
      token,
      user: sanitizeUser(user),
      workspace,
      members,
      pairingCode,
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    const msg = error instanceof Error ? error.message : 'Registration failed.';
    res.status(500).json({ error: msg });
  }
});

// 2. LOGIN
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({
        error: 'Database is not configured. Please set DATABASE_URL in Vercel or your .env file.',
      });
      return;
    }

    const { email, password } = req.body;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanEmail || !cleanPassword) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const sql = getDb();

    const [user] = await sql`
      SELECT * FROM public.users WHERE email = ${cleanEmail} LIMIT 1
    `;

    if (!user) {
      res.status(401).json({ error: 'No account found with this email address.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Incorrect password. Please try again.' });
      return;
    }

    let workspace = null;
    let members: unknown[] = [];
    let pairingCode = '';

    if (user.workspace_id) {
      const wsRows = await sql`SELECT * FROM public.workspaces WHERE id = ${user.workspace_id} LIMIT 1`;
      workspace = wsRows[0] || null;

      if (workspace) {
        members = await sql`SELECT * FROM public.workspace_members WHERE workspace_id = ${workspace.id} ORDER BY slot ASC`;
        const codeRows = await sql`SELECT code FROM public.pairing_codes WHERE workspace_id = ${workspace.id} LIMIT 1`;
        pairingCode = codeRows[0]?.code || '';
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, workspaceId: user.workspace_id },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    res.json({
      token,
      user: sanitizeUser(user),
      workspace,
      members,
      pairingCode,
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    const msg = error instanceof Error ? error.message : 'Login failed.';
    res.status(500).json({ error: msg });
  }
});

// 3. ME (SESSION RESTORATION)
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDbConfigured) {
      res.status(503).json({ error: 'Database is not configured.' });
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Invalid user session.' });
      return;
    }

    const sql = getDb();
    const [user] = await sql`SELECT * FROM public.users WHERE id = ${userId} LIMIT 1`;

    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    let workspace = null;
    let members: unknown[] = [];
    let pairingCode = '';

    if (user.workspace_id) {
      const wsRows = await sql`SELECT * FROM public.workspaces WHERE id = ${user.workspace_id} LIMIT 1`;
      workspace = wsRows[0] || null;

      if (workspace) {
        members = await sql`SELECT * FROM public.workspace_members WHERE workspace_id = ${workspace.id} ORDER BY slot ASC`;
        const codeRows = await sql`SELECT code FROM public.pairing_codes WHERE workspace_id = ${workspace.id} LIMIT 1`;
        pairingCode = codeRows[0]?.code || '';
      }
    }

    res.json({
      user: sanitizeUser(user),
      workspace,
      members,
      pairingCode,
    });
  } catch (error: unknown) {
    console.error('Auth verification error:', error);
    const msg = error instanceof Error ? error.message : 'Verification failed.';
    res.status(500).json({ error: msg });
  }
});
