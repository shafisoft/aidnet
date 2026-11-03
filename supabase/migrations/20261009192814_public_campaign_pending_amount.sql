-- ====================================================================
-- Public campaign reads expose pending donations
-- ====================================================================
-- Donor-reported transfers ("I donated") stay `pending` until the org
-- confirms them, and raised_amount only ever counts confirmed reports.
-- Surface the pending total next to raised_amount so cards and detail
-- views can show "confirmed + awaiting confirmation vs goal" — without
-- it, a donor's reported donation is invisible until someone reviews it
-- and the fundraiser gets no sense of money in flight. Both public
-- readers are re-created verbatim from their current definitions with
-- the one added column (RETURNS TABLE columns map to PostgREST by name,
-- so the insertion point is cosmetic).

-- --------------------------------------------------------------------
-- get_public_campaigns — verbatim from 20261008133626 (live overload).
-- Postgres cannot CREATE OR REPLACE across a return-type change, so the
-- function is dropped first; grants are re-applied to match the locked
-- RPC surface (20261008200032).
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
SET search_path = donate, shared, extensions, private
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

-- --------------------------------------------------------------------
-- get_public_campaign_by_slug — verbatim from 20261008131049 (live body);
-- same drop-before-replace and grant re-application.
-- --------------------------------------------------------------------
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
        FROM campaign_payment_methods x
        WHERE x.campaign_id = c.id
      ),
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
