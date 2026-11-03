-- ====================================================================
-- Personal fundraisers: self-publish + directory exclusion
-- ====================================================================
-- 20261008131048_personal_orgs.sql introduced kind='personal' orgs and
-- ensure_my_personal_org(). This migration completes the individual
-- path with the two pieces that path still lacked:
--   1. publish_campaign — an individual goes live WITHOUT the system
--      admin review step (org campaigns keep submit_campaign_for_review
--      → verify_campaign). Skipping review needs a fraud budget, so the
--      function enforces caps: one live campaign per personal org, goal
--      cap, duration cap. Mirrors client/src/lib/personalLimits.ts — a
--      settings table as single source is deliberately out of scope.
--   2. get_public_orgs — personal orgs are a tenancy container, not a
--      directory entry (their campaigns are the public surface), so the
--      /orgs directory filters to kind='organization'.
-- ====================================================================

-- --------------------------------------------------------------------
-- publish_campaign — self-publish for personal orgs only
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION donate.publish_campaign(p_campaign_id UUID)
RETURNS SETOF donate.campaigns AS $$
DECLARE
  v_org_id UUID;
  v_status donate.campaign_status;
  v_kind TEXT;
  v_goal NUMERIC;
  v_end_date DATE;
BEGIN
  SELECT c.org_id, c.status, c.goal_amount, c.end_date
    INTO v_org_id, v_status, v_goal, v_end_date
  FROM donate.campaigns c
  WHERE c.id = p_campaign_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  SELECT o.kind INTO v_kind
  FROM donate.organizations o
  WHERE o.id = v_org_id;

  IF v_kind IS DISTINCT FROM 'personal' THEN
    RAISE EXCEPTION 'Only personal fundraisers publish directly';
  END IF;

  IF NOT can_perform('campaigns:update', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'Only draft or rejected campaigns can be published';
  END IF;

  -- Fraud budget for skipping review (see file header):
  IF EXISTS (
    SELECT 1 FROM donate.campaigns c2
    WHERE c2.org_id = v_org_id AND c2.status = 'live'
  ) THEN
    RAISE EXCEPTION 'A personal fundraiser can have one live campaign at a time';
  END IF;

  IF v_goal IS NOT NULL AND v_goal > 100000 THEN
    RAISE EXCEPTION 'Personal campaign goal is capped at 100,000';
  END IF;

  IF v_end_date IS NOT NULL AND v_end_date > (CURRENT_DATE + INTERVAL '90 days') THEN
    RAISE EXCEPTION 'Personal campaigns can run for at most 90 days';
  END IF;

  RETURN QUERY
  UPDATE donate.campaigns
  SET status = 'live', updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION donate.publish_campaign(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.publish_campaign(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- get_organization — carry `kind` so the client can branch on the current
-- org (Publish vs Submit-for-review, personal caps) exactly like
-- get_my_organizations does. Return type changes, so DROP first (that
-- loses grants; they are re-issued right after).
-- --------------------------------------------------------------------
DROP FUNCTION IF EXISTS donate.get_organization(UUID);
CREATE OR REPLACE FUNCTION donate.get_organization(target_org_id UUID)
RETURNS TABLE(
  id UUID, slug TEXT, status TEXT, created_by UUID,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  member_count BIGINT, kind TEXT,
  name TEXT, description TEXT, logo_url TEXT, website_url TEXT,
  contact_email TEXT, contact_phone TEXT, address TEXT,
  social_links JSONB, settings JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT
    o.id,
    o.slug,
    o.status,
    o.created_by,
    o.created_at,
    o.updated_at,
    COUNT(DISTINCT mem.user_id) AS member_count,
    o.kind,
    COALESCE(om.name, o.name) AS name,
    COALESCE(om.description, o.description) AS description,
    om.logo_url,
    om.website_url,
    om.contact_email,
    om.contact_phone,
    om.address,
    om.social_links,
    om.settings
  FROM donate.organizations o
  LEFT JOIN donate.organization_members mem
    ON o.id = mem.organization_id AND mem.status = 'active'
  LEFT JOIN donate.org_meta om
    ON o.id = om.organization_id
  WHERE o.id = target_org_id
    AND can_perform('org:read', target_org_id)
  GROUP BY o.id, o.slug, o.status, o.created_by, o.created_at, o.updated_at, o.kind,
           COALESCE(om.name, o.name), COALESCE(om.description, o.description), om.logo_url, om.website_url, om.contact_email,
           om.contact_phone, om.address, om.social_links, om.settings;
$$;

REVOKE EXECUTE ON FUNCTION donate.get_organization(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_organization(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- get_public_orgs — the directory stays organization-focused
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION donate.get_public_orgs()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT o.id, o.name, o.slug, o.description, o.created_at
  FROM donate.organizations o
  WHERE o.kind = 'organization'
    AND EXISTS (
      SELECT 1
      FROM donate.organization_members om
      WHERE om.organization_id = o.id
        AND om.status = 'active'
    )
  ORDER BY o.name;
$$;

REVOKE EXECUTE ON FUNCTION donate.get_public_orgs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.get_public_orgs() TO anon, authenticated;
