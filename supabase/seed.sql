-- ====================================================================
-- supabase/seed.sql
-- ====================================================================
-- NOTE: This file is applied automatically by `supabase db reset`.
--
-- It intentionally does NOT create auth users. Raw SQL inserts into
-- auth.users are NOT visible to GoTrue (login requires a scrypt password
-- hash that only GoTrue's Auth API produces), so auth accounts + all
-- demo data that depends on them (org, campaigns, donation methods) are
-- seeded by `./supabase/seed-auth.sh`, which must be run AFTER
-- `supabase db reset`:
--
--     supabase db reset
--     ./supabase/seed-auth.sh
--
-- Credentials produced:
--   admin@donate.app   / Password123!  (system admin - NO org membership)
--   owner@donate.app   / Password123!  (org owner - owns demo org)
--   member@donate.app  / Password123!  (plain org member)
-- ====================================================================

-- Product schema chain (post 2026-11-04 platform cutover: `private` was
-- merged into `donate_private` and `public` retired — see AGENTS.md).
SET search_path = donate, donate_private, shared, extensions;

-- ===========================================================================

-- ===========================================================================
-- Plan capability matrix (post feature-gating infrastructure)
-- Per product decision, EVERY tier includes the core capabilities:
-- members, invites, campaigns, settings. Tier differentiation moves
-- to USAGE LIMITS in a future phase; the features array remains the
-- enforcement surface (can_perform -> has_feature).
-- Plus two dedicated plans used by e2e to prove campaign gating both ways.
-- ===========================================================================
UPDATE subscription_plans
SET features = '["members","invites","campaigns","settings"]'::jsonb
WHERE name IN ('Free', 'Pro', 'Enterprise');

INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features, is_active)
VALUES
  ('E2E With Campaigns',  'test tier: campaigns enabled',  0, 0,
   '["members","invites","campaigns","settings"]'::jsonb, true),
  ('E2E No Campaigns',    'test tier: campaigns excluded', 0, 0,
   '["members","invites","settings"]'::jsonb, true)
ON CONFLICT DO NOTHING;
