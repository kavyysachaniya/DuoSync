import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load both .env.local and .env if present
['.env.local', '.env'].forEach((file) => {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
  }
});

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';

export const isDbConfigured = Boolean(
  connectionString &&
  (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://'))
);

let cachedSql: NeonQueryFunction<false, false> | null = null;
let schemaEnsured = false;

export async function ensureSchema(sql?: NeonQueryFunction<false, false>): Promise<void> {
  if (schemaEnsured) return;
  schemaEnsured = true;
  try {
    const db = sql || getDb();
    await db`ALTER TABLE public.care_products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT ''`;
    await db`ALTER TABLE public.care_products ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT ''`;
    await db`ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS wardrobe_categories TEXT[] DEFAULT ARRAY['Shirts','T-Shirts','Polos','Hoodies & Sweats','Knitwear & Sweaters','Jeans','Trousers & Pants','Chinos','Shorts','Cargo Pants','Skirts','Jackets','Coats & Trench','Puffers & Parkas','Blazers & Suits','Sneakers','Boots','Loafers & Formals','Accessories','Bags & Backpacks','Watches']`;
  } catch (err) {
    console.warn('Schema ensure notice:', err);
    schemaEnsured = false;
  }
}

export function getDb(): NeonQueryFunction<false, false> {
  const conn = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || connectionString;
  if (!conn) {
    throw new Error(
      'DATABASE_URL is not configured. Please set DATABASE_URL in your environment variables (Vercel Project Settings or .env file).'
    );
  }
  if (!cachedSql) {
    cachedSql = neon(conn);
    // Asynchronously ensure columns in background on startup
    ensureSchema(cachedSql).catch(() => {});
  }
  return cachedSql;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'duosync-jwt-token-secret-production-salt-2026';

