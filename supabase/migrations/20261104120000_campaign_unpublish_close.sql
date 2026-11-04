-- Campaign lifecycle exits (2026-11-04): a live campaign previously had no
-- way back — the only transition out of 'live' was admin reject_campaign,
-- and the 'closed' enum value was unreachable by any function.
--
-- unpublish_campaign: live → draft. Drops the campaign from public view
--   immediately (public reads filter status = 'live'), and makes it
--   editable again: personal orgs re-publish directly, organizations
--   resubmit for review.
-- close_campaign: live → closed. Terminal cancel — the campaign leaves
--   public view permanently (propose_donation already requires 'live').
--
-- Both are org-side actions, gated by can_perform('campaigns:update') like
-- submit/publish before them.

CREATE FUNCTION donate.unpublish_campaign(p_campaign_id uuid) RETURNS SETOF donate_private.campaigns
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
  v_status donate.campaign_status;
BEGIN
  SELECT c.org_id, c.status
    INTO v_org_id, v_status
  FROM "donate_private".campaigns c
  WHERE c.id = p_campaign_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF NOT can_perform('campaigns:update', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'Only a live campaign can be unpublished';
  END IF;

  RETURN QUERY
  UPDATE "donate_private".campaigns
  SET status = 'draft', updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$;

CREATE FUNCTION donate.close_campaign(p_campaign_id uuid) RETURNS SETOF donate_private.campaigns
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
  v_status donate.campaign_status;
BEGIN
  SELECT c.org_id, c.status
    INTO v_org_id, v_status
  FROM "donate_private".campaigns c
  WHERE c.id = p_campaign_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF NOT can_perform('campaigns:update', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'Only a live campaign can be closed';
  END IF;

  RETURN QUERY
  UPDATE "donate_private".campaigns
  SET status = 'closed', updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$;


ALTER FUNCTION donate.unpublish_campaign(p_campaign_id uuid) OWNER TO postgres;

ALTER FUNCTION donate.close_campaign(p_campaign_id uuid) OWNER TO postgres;

--
-- ACL — anon never executes org-side lifecycle actions.
--

REVOKE ALL ON FUNCTION donate.unpublish_campaign(p_campaign_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.unpublish_campaign(p_campaign_id uuid) TO authenticated;

REVOKE ALL ON FUNCTION donate.close_campaign(p_campaign_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.close_campaign(p_campaign_id uuid) TO authenticated;
