import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function initNeonDb() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL or NEON_DATABASE_URL environment variable is missing.');
    console.error('   Please provide your Neon connection string in .env: DATABASE_URL="postgresql://user:pass@ep-....neon.tech/neondb?sslmode=require"');
    process.exit(1);
  }

  console.log('🚀 Connecting to Neon PostgreSQL...');
  const sql = neon(databaseUrl);

  const schemaPath = path.resolve(process.cwd(), 'neon', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found at: ${schemaPath}`);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Strip SQL comments first so statements starting with comments are not ignored
  const cleanSql = schemaSql.replace(/--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`📋 Executing ${statements.length} schema statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await (sql as any).query(stmt);
      console.log(`  ✓ Statement ${i + 1}/${statements.length} applied`);
    } catch (err: unknown) {
      console.error(`  ⚠️ Statement ${i + 1} notice/error:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('✅ Neon PostgreSQL database schema successfully initialized!');
}

initNeonDb().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
