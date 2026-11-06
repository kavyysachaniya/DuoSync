import { createClient } from '@supabase/supabase-js';

// Environment variables configured in Vercel / local .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

// Fallback dummy URL and key to prevent client instantiation crashes when env vars are pending
const effectiveUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const effectiveKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key-00000000000000000000';

export const supabase = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export interface SupabaseProfile {
  id: string;
  display_name: string;
  workspace_id: string | null;
  default_slot: 'partner1' | 'partner2';
  onboarding_completed: boolean;
  firebase_uid?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseWorkspace {
  id: string;
  owner_uid: string;
  currency: string;
  onboarding_completed: boolean;
  skincare_categories: string[];
  haircare_categories: string[];
  bodycare_categories: string[];
  product_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface SupabaseWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string | null;
  slot: 'partner1' | 'partner2';
  name: string;
  role: string;
  weight_unit: 'kg' | 'lbs';
  target_weight: number;
  start_weight: number;
  steps_goal: number;
  sleep_goal_minutes: number;
  water_goal_ml: number;
  joined_at: string;
}

export interface SupabaseHealthLog {
  id: string;
  workspace_id: string;
  profile_slot: 'partner1' | 'partner2';
  date: string;
  weight: number;
  steps: number;
  sleep_minutes: number;
  water_ml: number;
  note: string;
  updated_by_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCareProduct {
  id: string;
  workspace_id: string;
  profile_slot: 'partner1' | 'partner2' | 'shared';
  segment: 'skincare' | 'haircare' | 'bodycare';
  sub_category: string;
  name: string;
  brand: string;
  quantity: number;
  ordered_date: string;
  opened_date: string;
  expiry_date: string;
  sale_info: string;
  price_paid: number;
  original_price: number;
  status: 'in_use' | 'unopened' | 'finished';
  routine_time: 'am' | 'pm' | 'both' | 'weekly';
  schedule_type: 'daily' | 'weekly';
  scheduled_days: string[];
  notes: string;
  updated_by_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseRoutineCompletion {
  id: string;
  workspace_id: string;
  profile_slot: 'partner1' | 'partner2';
  product_id: string;
  date: string;
  completed: boolean;
  completed_at: string | null;
  updated_by_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseWardrobeItem {
  id: string;
  workspace_id: string;
  profile_slot: 'partner1' | 'partner2' | 'shared';
  name: string;
  category: string;
  brand: string;
  color: string;
  size: string;
  season: string;
  occasion: string;
  image_url: string;
  notes: string;
  updated_by_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseOutfit {
  id: string;
  workspace_id: string;
  profile_slot: 'partner1' | 'partner2' | 'shared';
  name: string;
  occasion: string;
  item_ids: string[];
  notes: string;
  updated_by_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabasePairingCode {
  code: string;
  workspace_id: string;
  owner_uid: string;
  owner_name: string;
  created_at: string;
}
