-- Public campaign payment info (2026-11-04): two fixes in one rewrite of
-- donate.get_public_campaign_by_slug.
--
-- 1. Visibility: the previous body read ONLY the org-level donation_methods
--    table, but the owner UI writes per-campaign campaign_payment_methods —
--    so donors saw "No donation methods listed yet." even when the campaign
--    declared channels. Source is now the campaign row first, org-level
--    methods as fallback.
--
-- 2. Grouping: the payload was a flat 13-key blob that dropped
--    bank_routing_number and bank_branch. The new payload groups payment
--    info into one jsonb object:
--
--      {
--        "mobile": [ {"provider":"bkash","number":..,"account_name":..}, … ],
--        "bank":   { "bank_name":.., "account_number":.., "account_name":..,
--                    "routing_number":.., "branch":.. } | null,
--        "donation_url":.., "qr_image_url":.., "instructions":..,
--        "is_preferred": bool
--      }
--
--    Empty channels are omitted; when nothing at all is declared the whole
--    value is NULL. The guard uses ->> (text) because jsonb_build_object
--    renders SQL NULL keys as JSON null, which IS NOT SQL NULL.
--
-- get_public_campaigns (the list endpoint) is unchanged — nothing renders
-- its methods blob.

CREATE OR REPLACE FUNCTION donate.get_public_campaign_by_slug(p_slug text) RETURNS TABLE(id uuid, title text, slug text, description text, goal_amount numeric, raised_amount numeric, pending_amount numeric, currency text, start_date timestamp with time zone, end_date timestamp with time zone, cover_image_url text, is_zakat_eligible boolean, org_id uuid, org_name text, org_slug text, org_description text, org_logo_url text, address text, donation_methods jsonb, tags jsonb)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
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
    (
      SELECT CASE
               WHEN jsonb_array_length(info->'mobile') > 0
                 OR (info->>'bank') IS NOT NULL
                 OR (info->>'donation_url') IS NOT NULL
                 OR (info->>'qr_image_url') IS NOT NULL
                 OR (info->>'instructions') IS NOT NULL
               THEN info
             END
      FROM (
        SELECT jsonb_build_object(
          'mobile', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'provider', p.provider,
              'number', p.number_val,
              'account_name', p.name_val
            ) ORDER BY p.ord)
            FROM (VALUES
              ('bkash'::text, 1, m.bkash_number, m.bkash_account_name),
              ('nagad'::text, 2, m.nagad_number, m.nagad_account_name),
              ('rocket'::text, 3, m.rocket_number, m.rocket_account_name)
            ) AS p(provider, ord, number_val, name_val)
            WHERE p.number_val IS NOT NULL AND btrim(p.number_val) <> ''
          ), '[]'::jsonb),
          'bank', CASE
            WHEN NULLIF(btrim(COALESCE(m.bank_name, '')), '') IS NOT NULL
              OR NULLIF(btrim(COALESCE(m.bank_account_number, '')), '') IS NOT NULL
            THEN jsonb_build_object(
              'bank_name', m.bank_name,
              'account_number', m.bank_account_number,
              'account_name', m.bank_account_name,
              'routing_number', m.bank_routing_number,
              'branch', m.bank_branch
            )
          END,
          'donation_url', NULLIF(btrim(m.donation_url), ''),
          'qr_image_url', NULLIF(btrim(m.qr_image_url), ''),
          'instructions', NULLIF(btrim(m.instructions), ''),
          'is_preferred', COALESCE(m.is_preferred, false)
        ) AS info
        FROM (
          SELECT cpm.bkash_number, cpm.bkash_account_name,
                 cpm.nagad_number, cpm.nagad_account_name,
                 cpm.rocket_number, cpm.rocket_account_name,
                 cpm.bank_name, cpm.bank_account_number,
                 cpm.bank_account_name, cpm.bank_routing_number,
                 cpm.bank_branch, cpm.donation_url,
                 cpm.qr_image_url, cpm.instructions,
                 cpm.is_preferred
          FROM campaign_payment_methods cpm
          WHERE cpm.campaign_id = c.id
          UNION ALL
          SELECT dm.bkash_number, dm.bkash_account_name,
                 dm.nagad_number, dm.nagad_account_name,
                 dm.rocket_number, dm.rocket_account_name,
                 dm.bank_name, dm.bank_account_number,
                 dm.bank_account_name, dm.bank_routing_number,
                 dm.bank_branch, dm.donation_url,
                 dm.qr_image_url, dm.instructions,
                 dm.is_preferred
          FROM donation_methods dm
          WHERE dm.organization_id = c.org_id
            AND NOT EXISTS (
              SELECT 1 FROM campaign_payment_methods cpm2
              WHERE cpm2.campaign_id = c.id
            )
          ORDER BY is_preferred DESC NULLS LAST
          LIMIT 1
        ) m
      ) build
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
$$;


ALTER FUNCTION donate.get_public_campaign_by_slug(p_slug text) OWNER TO postgres;

-- Grants carry over unchanged through CREATE OR REPLACE; reassert them so
-- the anon read path cannot regress.
GRANT ALL ON FUNCTION donate.get_public_campaign_by_slug(p_slug text) TO anon;
GRANT ALL ON FUNCTION donate.get_public_campaign_by_slug(p_slug text) TO authenticated;
