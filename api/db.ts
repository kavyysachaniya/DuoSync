import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';

export const isDbConfigured = Boolean(
  connectionString &&
  (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://'))
);

let cachedSql: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not configured. Please set DATABASE_URL in your environment variables (Vercel Project Settings or .env file).'
    );
  }
  if (!cachedSql) {
    cachedSql = neon(connectionString);
  }
  return cachedSql;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'duosync-jwt-token-secret-production-salt-2026';

