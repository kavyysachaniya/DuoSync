-- ==============================================================================
-- DuoSync: Complete Database Wipe & Data Reset Script
-- 
-- IMPORTANT WARNING:
-- This script permanently deletes ALL user accounts, workspaces, partner pairings,
-- daily health logs, skincare/haircare/bodycare products, routine completions,
-- and wardrobe items.
-- 
-- Schemas, table definitions, foreign key constraints, indexes, triggers,
-- functions, and RLS security policies remain completely INTACT.
-- ==============================================================================

-- 1. Neon PostgreSQL Data Reset (Active Backend)
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
RESTART IDENTITY CASCADE;

-- 2. Optional: If using Supabase Auth & PostgreSQL, also reset Supabase auth users & profiles:
-- TRUNCATE TABLE
--   public.outfits,
--   public.wardrobe_items,
--   public.routine_completions,
--   public.care_products,
--   public.health_logs,
--   public.pairing_codes,
--   public.workspace_members,
--   public.workspaces,
--   public.profiles
-- RESTART IDENTITY CASCADE;
-- 
-- DELETE FROM auth.users;
