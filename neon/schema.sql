-- ============================================================================
-- DuoSync — Complete Neon PostgreSQL Schema
-- High-Performance Relational Schema with Full Constraints & Indexes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'User',
  workspace_id UUID,
  default_slot TEXT NOT NULL DEFAULT 'partner1' CHECK (default_slot IN ('partner1', 'partner2')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT '₹',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  skincare_categories TEXT[] NOT NULL DEFAULT ARRAY['Cleanser','Toner','Serum','Moisturizer','Sunscreen','Lip Care'],
  haircare_categories TEXT[] NOT NULL DEFAULT ARRAY['Shampoo','Conditioner','Hair Mask','Hair Serum','Scalp Oil'],
  bodycare_categories TEXT[] NOT NULL DEFAULT ARRAY['Body Wash','Body Lotion','Body Scrub','Deodorant'],
  wardrobe_categories TEXT[] NOT NULL DEFAULT ARRAY['Shirts','T-Shirts','Polos','Hoodies & Sweats','Knitwear & Sweaters','Jeans','Trousers & Pants','Chinos','Shorts','Cargo Pants','Skirts','Jackets','Coats & Trench','Puffers & Parkas','Blazers & Suits','Sneakers','Boots','Loafers & Formals','Accessories','Bags & Backpacks','Watches'],
  product_ids TEXT[] NOT NULL DEFAULT '{}',
  last_sync_timestamp BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_workspace;
ALTER TABLE public.users ADD CONSTRAINT fk_users_workspace FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON public.users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_last_sync ON public.workspaces(id, last_sync_timestamp);

-- 3. WORKSPACE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
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

-- 4. PAIRING CODES TABLE
CREATE TABLE IF NOT EXISTS public.pairing_codes (
  code VARCHAR(6) PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL DEFAULT 'Partner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_ws ON public.pairing_codes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_owner ON public.pairing_codes(owner_id);

-- 5. HEALTH LOGS TABLE
CREATE TABLE IF NOT EXISTS public.health_logs (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_slot TEXT NOT NULL CHECK (profile_slot IN ('partner1', 'partner2')),
  date DATE NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0,
  steps INT NOT NULL DEFAULT 0,
  sleep_minutes INT NOT NULL DEFAULT 0,
  water_ml INT NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  updated_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, profile_slot, date)
);

CREATE INDEX IF NOT EXISTS idx_health_logs_ws_date ON public.health_logs(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_health_logs_ws_slot ON public.health_logs(workspace_id, profile_slot);

-- 6. CARE PRODUCTS TABLE
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
  image_url TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  updated_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_care_products_ws ON public.care_products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_care_products_slot ON public.care_products(workspace_id, profile_slot);

-- 7. ROUTINE COMPLETIONS TABLE
CREATE TABLE IF NOT EXISTS public.routine_completions (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_slot TEXT NOT NULL CHECK (profile_slot IN ('partner1', 'partner2')),
  product_id TEXT NOT NULL REFERENCES public.care_products(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  updated_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, profile_slot, product_id, date)
);

CREATE INDEX IF NOT EXISTS idx_routine_completions_ws_date ON public.routine_completions(workspace_id, date);

-- 8. WARDROBE ITEMS TABLE
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
  thumbnail_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_ws ON public.wardrobe_items(workspace_id);

-- 9. OUTFITS TABLE
CREATE TABLE IF NOT EXISTS public.outfits (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_slot TEXT NOT NULL CHECK (profile_slot IN ('partner1', 'partner2', 'shared')),
  name TEXT NOT NULL,
  occasion TEXT NOT NULL DEFAULT 'Casual',
  item_ids TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  updated_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outfits_ws ON public.outfits(workspace_id);

