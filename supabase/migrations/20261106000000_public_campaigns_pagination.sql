-- ====================================================================
-- Public campaign listing: paginate + slim (2026-11-06)
-- ====================================================================
-- The previous body returned EVERY live campaign (result_limit defaulted
-- to NULL -> LIMIT NULL) with three correlated subqueries per row
-- (pending SUM, donation_methods blob, tags). On a free-tier database
-- /campaigns was O(all campaigns) per visit and shipped a payment-details
-- blob the list UI never renders.
--
-- New contract:
--   * Card-only payload — exactly what CampaignCard renders. Payment
--     methods and tags stay on get_public_campaign_by_slug, which the
--     detail page uses.
--   * Page size: caller may request 1..100, default 24. LIMIT can no
--     longer be NULL, so the endpoint is bounded by construction.
--   * p_offset capped at 5000 — a hard ceiling on deep scraping.
--   * ORDER BY created_at DESC, id DESC — stable across donation
--     confirms (confirm bumps updated_at via sync_campaign_raised,
--     which reshuffled the list mid-paging) and keyset-ready if paging
--     depth ever demands a cursor.
--   * The org-membership gate becomes EXISTS (same plan, clearer intent).
--
-- The pending SUM stays a correlated probe on
-- idx_donation_reports_campaign_status: a page touches at most the
-- returned campaigns and propose_donation caps pending reports at 200
-- per campaign, so denormalizing a pending counter is not worth the
-- drift risk yet.

DROP FUNCTION IF EXISTS donate.get_public_campaigns(boolean, uuid, integer);

CREATE FUNCTION donate.get_public_campaigns(
  zakat_filter boolean DEFAULT NULL,
  org_filter uuid DEFAULT NULL,
  result_limit integer DEFAULT NULL,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  org_id uuid,
  org_name text,
  title text,
  slug text,
  description text,
  cover_image_url text,
  goal_amount numeric,
  raised_amount numeric,
  pending_amount numeric,
  currency character varying,
  is_zakat_eligible boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
AS $$
  SELECT
    c.id,
    c.org_id,
    COALESCE(meta.name, o.name),
    c.title,
    c.slug,
    c.description,
    c.cover_image_url,
    c.goal_amount,
    c.raised_amount,
    COALESCE((
      SELECT SUM(dr.amount) FROM donation_reports dr
      WHERE dr.campaign_id = c.id AND dr.status = 'pending'
    ), 0) AS pending_amount,
    c.currency,
    c.is_zakat_eligible
  FROM campaigns c
  JOIN organizations o ON o.id = c.org_id
  LEFT JOIN org_meta meta ON meta.organization_id = o.id
  WHERE c.status = 'live'
    AND c.is_active = true
    AND o.status = 'active'
    AND EXISTS (
      SELECT 1 FROM organization_members mem
      WHERE mem.organization_id = o.id AND mem.status = 'active'
    )
    AND (zakat_filter IS NULL OR c.is_zakat_eligible = zakat_filter)
    AND (org_filter IS NULL OR c.org_id = org_filter)
  ORDER BY c.created_at DESC, c.id DESC
  -- GREATEST/LEAST ignore NULL args (PG >= 13), so the NULL default must
  -- be handled before clamping — otherwise NULL result_limit becomes 1.
  LIMIT CASE
          WHEN result_limit IS NULL THEN 24
          ELSE LEAST(GREATEST(result_limit, 1), 100)
        END
  OFFSET LEAST(GREATEST(COALESCE(p_offset, 0), 0), 5000);
$$;

ALTER FUNCTION donate.get_public_campaigns(boolean, uuid, integer, integer)
  OWNER TO postgres;

-- Grants do not survive the drop; re-assert the public surface exactly as
-- 20261008200032_lock_rpc_execute_surface.sql section C defined it.
REVOKE EXECUTE ON FUNCTION
  donate.get_public_campaigns(boolean, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  donate.get_public_campaigns(boolean, uuid, integer, integer)
  TO anon, authenticated;

-- Hot browse path: the default listing's filter and sort are both served
-- by one partial index. org_filter keeps idx_campaigns_org_id, zakat its
-- own index — the planner picks per call.
CREATE INDEX IF NOT EXISTS idx_campaigns_public_listing
  ON donate_private.campaigns (created_at DESC, id DESC)
  WHERE status = 'live'::donate.campaign_status AND is_active = true;
