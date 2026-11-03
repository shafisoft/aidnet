-- ====================================================================
-- Admin oversight + abuse reports for personal fundraisers
-- ====================================================================
-- Personal campaigns skip the review queue (publish_campaign), so the
-- system admin needs AFTER-publish visibility and a takedown lever, and
-- the public needs a way to flag a suspicious campaign.
--   1. get_public_campaigns — re-created VERBATIM from
--      20261009192814 (the current live definition) so it carries this
--      migration's one change: `AND o.status = 'active'` was already in
--      the 10-09 body, but hand-applied stacks that predate 10-09 (the
--      podman platform stack has no migration ledger and missed the
--      10-08/10-09 stream) ran a list without the suspended-org filter
--      and without pending_amount — this section brings them current.
--      The detail read (get_public_campaign_by_slug) is re-created
--      verbatim from 10-09 for the same drift backfill; on ledged
--      stacks it is an identical no-op.
--   2. get_personal_campaigns — system-admin list of every personal
--      fundraiser (live first), the post-publish review surface. Existing
--      reject_campaign (admin-only) is the takedown: it flips status to
--      'rejected' and both public reads filter status='live'.
--   3. campaign_abuse_reports — public fraud reports. Anon-writable via
--      report_campaign (only live campaigns can be reported; lengths
--      capped; reason constrained by CHECK). RLS deny-all: access only
--      through the SECURITY DEFINER functions. list/resolve are admin.
-- ====================================================================

SET search_path = donate, shared, extensions, private;

-- --------------------------------------------------------------------
-- 1. Public reads — current 10-09 bodies (drift backfill; on ledged
--    stacks these are byte-identical re-creations)
-- --------------------------------------------------------------------
DROP FUNCTION IF EXISTS donate.get_public_campaigns(BOOLEAN, UUID, INT);
CREATE OR REPLACE FUNCTION donate.get_public_campaigns(
  zakat_filter BOOLEAN DEFAULT NULL,
  org_filter UUID DEFAULT NULL,
  result_limit INT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  org_name TEXT,
  org_slug TEXT,
  org_logo_url TEXT,
  org_description TEXT,
  title TEXT,
  slug TEXT,
  description TEXT,
  cover_image_url TEXT,
  goal_amount NUMERIC,
  raised_amount NUMERIC,
  pending_amount NUMERIC,
  currency VARCHAR,
  start_date DATE,
  end_date DATE,
  is_zakat_eligible BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  address TEXT,
  donation_methods JSONB,
  tags JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'donate', 'shared', 'extensions', 'private'
AS $$
  SELECT
    c.id,
    c.org_id,
    COALESCE(meta.name, o.name),
    o.slug,
    COALESCE(meta.logo_url, o.logo_url),
    COALESCE(meta.description, o.description),
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
    c.start_date,
    c.end_date,
    c.is_zakat_eligible,
    c.created_at,
    c.updated_at,
    c.address,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', dm.id,
        'bkash_number', dm.bkash_number,
        'bkash_account_name', dm.bkash_account_name,
        'nagad_number', dm.nagad_number,
        'nagad_account_name', dm.nagad_account_name,
        'rocket_number', dm.rocket_number,
        'rocket_account_name', dm.rocket_account_name,
        'bank_name', dm.bank_name,
        'bank_account_number', dm.bank_account_number,
        'bank_routing_number', dm.bank_routing_number,
        'bank_branch', dm.bank_branch,
        'donation_url', dm.donation_url,
        'qr_image_url', dm.qr_image_url,
        'instructions', dm.instructions,
        'is_preferred', dm.is_preferred
      ))
      FROM donation_methods dm
      WHERE dm.organization_id = c.org_id
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'slug', t.slug,
        'label', t.label,
        'label_bn', t.label_bn
      ))
      FROM campaign_tag_map ctm
      JOIN campaign_tags t ON t.id = ctm.tag_id
      WHERE ctm.campaign_id = c.id
    ), '[]'::jsonb)
  FROM campaigns c
  JOIN organizations o ON o.id = c.org_id
  LEFT JOIN org_meta meta ON meta.organization_id = o.id
  WHERE c.status = 'live'
    AND c.is_active = true
    AND o.status = 'active'
    AND o.id IN (
      SELECT mem.organization_id
      FROM organization_members mem
      WHERE mem.organization_id = o.id AND mem.status = 'active'
    )
    AND (zakat_filter IS NULL OR c.is_zakat_eligible = zakat_filter)
    AND (org_filter IS NULL OR c.org_id = org_filter)
  ORDER BY c.updated_at DESC, c.created_at DESC, c.id DESC
  LIMIT result_limit;
$$;

REVOKE EXECUTE ON FUNCTION donate.get_public_campaigns(BOOLEAN, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.get_public_campaigns(BOOLEAN, UUID, INT) TO anon, authenticated;

DROP FUNCTION IF EXISTS donate.get_public_campaign_by_slug(TEXT);
CREATE OR REPLACE FUNCTION donate.get_public_campaign_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  goal_amount NUMERIC,
  raised_amount NUMERIC,
  pending_amount NUMERIC,
  currency TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  cover_image_url TEXT,
  is_zakat_eligible BOOLEAN,
  org_id UUID,
  org_name TEXT,
  org_slug TEXT,
  org_description TEXT,
  org_logo_url TEXT,
  address TEXT,
  donation_methods JSONB,
  tags JSONB
) AS $$
  SELECT
    c.id,
    c.title,
    c.slug,
    c.description,
    c.goal_amount,
    c.raised_amount,
    COALESCE((
      SELECT SUM(dr.amount) FROM donation_reports dr
      WHERE dr.campaign_id = c.id AND dr.status = 'pending'
    ), 0) AS pending_amount,
    c.currency,
    c.start_date,
    c.end_date,
    c.cover_image_url,
    c.is_zakat_eligible,
    c.org_id,
    COALESCE(om.name, o.name) AS org_name,
    o.slug AS org_slug,
    COALESCE(om.description, o.description) AS org_description,
    COALESCE(om.logo_url, o.logo_url) AS org_logo_url,
    c.address,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'bkash_number', x.bkash_number,
          'bkash_account_name', x.bkash_account_name,
          'nagad_number', x.nagad_number,
          'nagad_account_name', x.nagad_account_name,
          'rocket_number', x.rocket_number,
          'rocket_account_name', x.rocket_account_name,
          'bank_name', x.bank_name,
          'bank_account_number', x.bank_account_number,
          'bank_account_name', x.bank_account_name,
          'donation_url', x.donation_url,
          'qr_image_url', x.qr_image_url,
          'instructions', x.instructions,
          'is_preferred', x.is_preferred
        ) ORDER BY x.is_preferred DESC, x.id)
        FROM donation_methods x
        WHERE x.organization_id = c.org_id
      ),
      '[]'::jsonb
    ) AS donation_methods,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'label', t.label,
          'slug', t.slug
        ) ORDER BY t.label
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) AS tags
  FROM campaigns c
  JOIN organizations o ON c.org_id = o.id
  LEFT JOIN org_meta om ON o.id = om.organization_id
  LEFT JOIN campaign_tag_map ctm ON c.id = ctm.campaign_id
  LEFT JOIN campaign_tags t ON ctm.tag_id = t.id
  WHERE c.status = 'live'
    AND o.status = 'active'
    AND c.slug = p_slug
  GROUP BY c.id, o.id, om.organization_id
  ORDER BY c.created_at DESC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION donate.get_public_campaign_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.get_public_campaign_by_slug(TEXT) TO anon, authenticated;

-- --------------------------------------------------------------------
-- 2. Post-publish review surface — admin sees every personal fundraiser
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION donate.get_personal_campaigns()
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  status TEXT,
  goal_amount NUMERIC,
  currency VARCHAR,
  created_at TIMESTAMPTZ,
  org_id UUID,
  org_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT
    c.id,
    c.title,
    c.slug,
    c.status::text,
    c.goal_amount,
    c.currency,
    c.created_at,
    o.id,
    COALESCE(om.name, o.name)
  FROM donate.campaigns c
  JOIN donate.organizations o ON o.id = c.org_id
  LEFT JOIN donate.org_meta om ON om.organization_id = o.id
  WHERE o.kind = 'personal'
  ORDER BY (c.status = 'live') DESC, c.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION donate.get_personal_campaigns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_personal_campaigns() TO authenticated;

-- --------------------------------------------------------------------
-- 3. Abuse reports — the public's fraud lever
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donate.campaign_abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES donate.campaigns(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('fraud', 'misleading', 'completed', 'other')),
  details TEXT,
  contact TEXT,
  reporter_id UUID REFERENCES shared.profiles(id) ON DELETE SET NULL,
  reporter_ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_by UUID REFERENCES shared.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ
);
-- Applied on stacks that already ran the first draft of this migration.
ALTER TABLE donate.campaign_abuse_reports
  ADD COLUMN IF NOT EXISTS reporter_ip_hash TEXT;

-- report_campaign — anon-writable, live campaigns only. No auth needed:
-- a witness of a scam is usually NOT logged in. Turnstile (fail-closed,
-- disabled while no secret is configured) plus per-IP/per-campaign caps
-- keep the queue clean — same treatment as propose_donation.
CREATE OR REPLACE FUNCTION donate.report_campaign(
  p_campaign_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL,
  p_contact TEXT DEFAULT NULL,
  p_turnstile_token TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_reporter UUID := auth.uid();
  v_ip_hash TEXT;
  v_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM donate.campaigns
    WHERE id = p_campaign_id AND status = 'live'
  ) THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF p_reason NOT IN ('fraud', 'misleading', 'completed', 'other') THEN
    RAISE EXCEPTION 'Unknown reason';
  END IF;

  IF p_details IS NOT NULL AND length(p_details) > 2000 THEN
    RAISE EXCEPTION 'Details too long';
  END IF;

  IF p_contact IS NOT NULL AND length(p_contact) > 200 THEN
    RAISE EXCEPTION 'Contact too long';
  END IF;

  -- Turnstile first: never spend a rate-limit slot on an unverified bot.
  v_ip_hash := MD5(COALESCE(
    current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''
  ));
  IF NOT verify_turnstile(p_turnstile_token, NULLIF(v_ip_hash, '')) THEN
    RAISE EXCEPTION 'Verification failed. Please try again.';
  END IF;

  IF (
    SELECT COUNT(*) FROM donate.campaign_abuse_reports
    WHERE reporter_ip_hash = v_ip_hash
      AND created_at > NOW() - INTERVAL '24 hours'
  ) >= 10 THEN
    RAISE EXCEPTION 'Too many reports from this device. Try again later.';
  END IF;
  IF (
    SELECT COUNT(*) FROM donate.campaign_abuse_reports
    WHERE campaign_id = p_campaign_id AND resolved_at IS NULL
  ) >= 50 THEN
    RAISE EXCEPTION 'This campaign has too many reports awaiting review.';
  END IF;

  INSERT INTO donate.campaign_abuse_reports
    (campaign_id, reason, details, contact, reporter_id, reporter_ip_hash)
  VALUES
    (p_campaign_id, p_reason, left(p_details, 2000), left(p_contact, 200),
     v_reporter, v_ip_hash)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION donate.report_campaign(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.report_campaign(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION donate.list_campaign_abuse_reports()
RETURNS TABLE (
  id UUID,
  campaign_id UUID,
  campaign_title TEXT,
  campaign_slug TEXT,
  reason TEXT,
  details TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT
    r.id,
    r.campaign_id,
    c.title,
    c.slug,
    r.reason,
    r.details,
    r.contact,
    r.created_at,
    r.resolved_at
  FROM donate.campaign_abuse_reports r
  JOIN donate.campaigns c ON c.id = r.campaign_id
  ORDER BY r.resolved_at IS NULL DESC, r.created_at DESC
  LIMIT 200;
$$;

REVOKE EXECUTE ON FUNCTION donate.list_campaign_abuse_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.list_campaign_abuse_reports() TO authenticated;

CREATE OR REPLACE FUNCTION donate.resolve_campaign_abuse_report(p_report_id UUID)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  UPDATE donate.campaign_abuse_reports
  SET resolved_by = auth.uid(), resolved_at = NOW()
  WHERE id = p_report_id AND resolved_at IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Report not found or already resolved';
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION donate.resolve_campaign_abuse_report(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.resolve_campaign_abuse_report(UUID) TO authenticated;
