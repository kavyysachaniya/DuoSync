import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function resetNeonDb() {
  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log('🧹 Connecting to Neon PostgreSQL for database wipe & reset...');
  const sql = neon(databaseUrl);

  try {
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
    console.log('✅ Complete database reset accomplished. All users, workspaces, and logs have been wiped for a fresh start.');
  } catch (err: unknown) {
    console.error('Reset error:', err);
    process.exit(1);
  }
}

resetNeonDb();

