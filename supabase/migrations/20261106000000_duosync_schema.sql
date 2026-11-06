-- ============================================================================
-- DuoSync / DuoPulse: Complete Normalized PostgreSQL Schema & RLS Policies
-- Target: Supabase PostgreSQL, Supabase Auth, Supabase Realtime
-- ============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE: workspaces
-- Core shared space linking Partner 1 and Partner 2
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT '₹',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  skincare_categories TEXT[] NOT NULL DEFAULT ARRAY['Cleanser','Toner','Serum','Moisturizer','Sunscreen','Lip Care'],
  haircare_categories TEXT[] NOT NULL DEFAULT ARRAY['Shampoo','Conditioner','Hair Mask','Hair Serum','Scalp Oil'],
  bodycare_categories TEXT[] NOT NULL DEFAULT ARRAY['Body Wash','Body Lotion','Body Scrub','Deodorant'],
  product_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: profiles
-- User account profile (1:1 with auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'User',
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  default_slot TEXT NOT NULL DEFAULT 'partner1' CHECK (default_slot IN ('partner1', 'partner2')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  firebase_uid TEXT, -- Preserves backward correlation for migrated accounts
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON public.profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON public.profiles(firebase_uid);

-- ============================================================================
-- TABLE: workspace_members
-- Dual membership tracking for partner1 and partner2 slots
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slot TEXT NOT NULL CHECK (slot IN ('partner1', 'partner2')),
  name TEXT NOT NULL DEFAULT 'Partner',
  role TEXT NOT NULL DEFAULT 'Daily Dashboard',
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  target_weight NUMERIC NOT NULL DEFAULT 62.0,
  start_weight NUMERIC NOT NULL DEFAULT 65.0,
  steps_goal INT NOT NULL DEFAULT 8500,
  sleep_goal_minutes INT NOT NULL DEFAULT 480,
  water_goal_ml INT NOT NULL DEFAULT 2500,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

-- ============================================================================
-- TABLE: pairing_codes
-- 6-Digit invite codes for cross-device partner account pairing
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pairing_codes (
  code VARCHAR(6) PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_uid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL DEFAULT 'Partner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_ws ON public.pairing_codes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_owner ON public.pairing_codes(owner_uid);

-- ============================================================================
-- TABLE: health_logs
-- Daily health records (weight, steps, sleep, water, note)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.health_logs (
  id TEXT PRIMARY KEY, -- Deterministic `${workspace_id}_${slot}_${date}`
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_slot TEXT NOT NULL CHECK (profile_slot IN ('partner1', 'partner2')),
  date DATE NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0,
  steps INT NOT NULL DEFAULT 0,
  sleep_minutes INT NOT NULL DEFAULT 0,
  water_ml INT NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  updated_by_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, profile_slot, date)
);

CREATE INDEX IF NOT EXISTS idx_health_logs_ws_date ON public.health_logs(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_health_logs_ws_slot ON public.health_logs(workspace_id, profile_slot);

-- ============================================================================
-- TABLE: care_products
-- Skincare, haircare, and bodycare products
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.care_products (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_slot TEXT NOT NULL CHECK (profile_slot IN ('partner1', 'partner2', 'shared')),
  segment TEXT NOT NULL CHECK (segment IN ('skincare', 'haircare', 'bodycare')),
  sub_category TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  quantity INT NOT NULL DEFAULT 1,
  ordered_date TEXT NOT NULL DEFAULT '',
  opened_date TEXT NOT NULL DEFAULT '',
  expiry_date TEXT NOT NULL DEFAULT '',
  sale_info TEXT NOT NULL DEFAULT '',
  price_paid NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_use' CHECK (status IN ('in_use', 'unopened', 'finished')),
  routine_time TEXT NOT NULL DEFAULT 'am' CHECK (routine_time IN ('am', 'pm', 'both', 'weekly')),
  schedule_type TEXT NOT NULL DEFAULT 'daily' CHECK (schedule_type IN ('daily', 'weekly')),
  scheduled_days TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  updated_by_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_care_products_ws ON public.care_products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_care_products_slot ON public.care_products(workspace_id, profile_slot);

-- ============================================================================
-- TABLE: routine_completions
-- Daily checkoffs for skincare/haircare routine steps
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.routine_completions (
  id TEXT PRIMARY KEY, -- Deterministic: `${profile_slot}_${product_id}_${date}`
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_slot TEXT NOT NULL CHECK (profile_slot IN ('partner1', 'partner2')),
  product_id TEXT NOT NULL REFERENCES public.care_products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_by_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, profile_slot, product_id, date)
);

CREATE INDEX IF NOT EXISTS idx_routine_completions_ws_date ON public.routine_completions(workspace_id, date);

-- ============================================================================
-- TABLE: wardrobe_items
-- Clothing inventory items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wardrobe_items (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_slot TEXT NOT NULL CHECK (profile_slot IN ('partner1', 'partner2', 'shared')),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  season TEXT NOT NULL DEFAULT 'All Season',
  occasion TEXT NOT NULL DEFAULT 'Casual',
  image_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_by_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_ws ON public.wardrobe_items(workspace_id);

-- ============================================================================
-- TABLE: outfits
-- Saved outfit pairings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.outfits (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_slot TEXT NOT NULL CHECK (profile_slot IN ('partner1', 'partner2', 'shared')),
  name TEXT NOT NULL,
  occasion TEXT NOT NULL DEFAULT 'Casual',
  item_ids TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  updated_by_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outfits_ws ON public.outfits(workspace_id);

-- ============================================================================
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Checks whether the authenticated user is a member or owner of the workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = ws_id AND owner_uid = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members WHERE workspace_id = ws_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND workspace_id = ws_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger to auto-create public.profiles row when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'User')
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL PRIVATE TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLICIES: profiles
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile or shared workspace profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- POLICIES: workspaces
-- ----------------------------------------------------------------------------
CREATE POLICY "Workspace members can view workspace"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(id));

CREATE POLICY "Workspace members can update workspace"
  ON public.workspaces FOR UPDATE
  USING (public.is_workspace_member(id))
  WITH CHECK (public.is_workspace_member(id));

CREATE POLICY "Authenticated users can create workspace"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Owners can delete workspace"
  ON public.workspaces FOR DELETE
  USING (auth.uid() = owner_uid);

-- ----------------------------------------------------------------------------
-- POLICIES: workspace_members
-- ----------------------------------------------------------------------------
CREATE POLICY "Workspace members can view members"
  ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id) OR auth.uid() = user_id);

CREATE POLICY "Workspace members can update members"
  ON public.workspace_members FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete members"
  ON public.workspace_members FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- ----------------------------------------------------------------------------
-- POLICIES: pairing_codes
-- Any authenticated user can read a 6-digit code to join a partner's workspace.
-- Only the owner can create or delete their code.
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read pairing codes"
  ON public.pairing_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can insert pairing code"
  ON public.pairing_codes FOR INSERT
  WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY "Owners can delete pairing code"
  ON public.pairing_codes FOR DELETE
  USING (auth.uid() = owner_uid);

-- ----------------------------------------------------------------------------
-- POLICIES: health_logs
-- ----------------------------------------------------------------------------
CREATE POLICY "Workspace members can view health logs"
  ON public.health_logs FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert health logs"
  ON public.health_logs FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update health logs"
  ON public.health_logs FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete health logs"
  ON public.health_logs FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- ----------------------------------------------------------------------------
-- POLICIES: care_products
-- ----------------------------------------------------------------------------
CREATE POLICY "Workspace members can view care products"
  ON public.care_products FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert care products"
  ON public.care_products FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update care products"
  ON public.care_products FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete care products"
  ON public.care_products FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- ----------------------------------------------------------------------------
-- POLICIES: routine_completions
-- ----------------------------------------------------------------------------
CREATE POLICY "Workspace members can view routine completions"
  ON public.routine_completions FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert routine completions"
  ON public.routine_completions FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update routine completions"
  ON public.routine_completions FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete routine completions"
  ON public.routine_completions FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- ----------------------------------------------------------------------------
-- POLICIES: wardrobe_items
-- ----------------------------------------------------------------------------
CREATE POLICY "Workspace members can view wardrobe items"
  ON public.wardrobe_items FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert wardrobe items"
  ON public.wardrobe_items FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update wardrobe items"
  ON public.wardrobe_items FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete wardrobe items"
  ON public.wardrobe_items FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- ----------------------------------------------------------------------------
-- POLICIES: outfits
-- ----------------------------------------------------------------------------
CREATE POLICY "Workspace members can view outfits"
  ON public.outfits FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert outfits"
  ON public.outfits FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can update outfits"
  ON public.outfits FOR UPDATE
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can delete outfits"
  ON public.outfits FOR DELETE
  USING (public.is_workspace_member(workspace_id));

-- ============================================================================
-- SUPABASE REALTIME CONFIGURATION
-- Enable replication on all collaborative tables
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.health_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.care_products;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.routine_completions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wardrobe_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.outfits;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipping realtime publication alteration (tables may already be published or publication does not exist).';
END;
$$;
