-- ====================================================================
-- donate platform cutover — co-living migration for the shared project
-- (tightened posture: donate = exposed functions, donate_private = tables)
-- ====================================================================
-- donate's standalone hosted project (lgqbtvenxuuctjkncbhq) is retired;
-- this stream now deploys by the platform co-living playbook
-- (../platform/PLAYBOOK.md). The frozen initial schema
-- (20240814160000) is superseded: it created the shared layer and role
-- chains that the SHARED project already owns (platform repo's
-- 20261007000000_foundation). This migration delivers the CURRENT
-- donate schema, dumped verbatim from the authoritative local stack
-- (podman, phase 2 included) on 2026-11-04, in the platform's standard
-- "tightened posture" (same as prep_app/ledger/officerider/pcare/zikr):
--
--   * `donate`  — the EXPOSED schema: 95 RPC functions (+ the
--     campaign_status enum) only; no tables reachable by clients
--   * `donate_private` — tables, views, RLS helper functions, and the
--     client table grants + RLS they carry (donate runs a SECURITY
--     INVOKER CRUD surface — 29 of its 95 functions — so, like zikr's
--     recorded exception, authorization = scoped grants + RLS policies
--     on these tables; the exposed schema itself stays functions-only)
--     (legacy `private` schema merged in and dropped)
--   * role search_path chains: donate, donate_private, shared, extensions
--   * the `http` extension (verify_turnstile's siteverify calls)
--
-- Teardown first: re-applying over a previous layout (either the
-- pre-posture cutover or the legacy standalone schema) rebuilds both
-- schemas from this file alone. Fresh environments apply as-is.
-- The 18 earlier stream files are repair-marked as applied on the
-- shared project (superseded-stream pattern per PLAYBOOK): their
-- effects are contained here; they must never replay.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
-- Images pre-installing pgcrypto in another schema skip the IF NOT EXISTS
-- above without relocating; donate's DDL calls extensions.gen_random_bytes
-- qualified, so pin the schema.
DO $ext$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgcrypto' AND n.nspname <> 'extensions'
  ) THEN
    EXECUTE 'ALTER EXTENSION pgcrypto SET SCHEMA extensions';
  END IF;
END
$ext$;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- --------------------------------------------------------------------
-- Teardown — idempotent on fresh stacks, rebuilding on re-applies
-- --------------------------------------------------------------------
DROP SCHEMA IF EXISTS "private" CASCADE;
DROP SCHEMA IF EXISTS "donate_private" CASCADE;
DROP SCHEMA IF EXISTS "donate" CASCADE;

-- Role search_path chains (product schema first per PLAYBOOK; policy
-- expressions resolve donate_private helpers under client roles)
ALTER ROLE anon          IN DATABASE postgres SET search_path = donate, donate_private, shared, extensions;
ALTER ROLE authenticated IN DATABASE postgres SET search_path = donate, donate_private, shared, extensions;
ALTER ROLE authenticator IN DATABASE postgres SET search_path = donate, donate_private, shared, extensions;
ALTER ROLE service_role  IN DATABASE postgres SET search_path = donate, donate_private, shared, extensions;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: donate; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA donate;


ALTER SCHEMA donate OWNER TO postgres;

--
-- Name: donate_private; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA donate_private;


ALTER SCHEMA donate_private OWNER TO postgres;

--
-- Name: campaign_status; Type: TYPE; Schema: donate; Owner: postgres
--

CREATE TYPE donate.campaign_status AS ENUM (
    'draft',
    'pending_review',
    'live',
    'rejected',
    'closed'
);


ALTER TYPE donate.campaign_status OWNER TO postgres;

--
-- Name: accept_invite(text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.accept_invite(p_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_invite invites;
  v_user_email TEXT;
BEGIN
  SELECT * INTO v_invite FROM invites
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > NOW()
  FOR UPDATE;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  SELECT lower(email) INTO v_user_email FROM auth.users WHERE id = auth.uid();

  IF v_user_email IS NULL OR lower(v_invite.email) <> v_user_email THEN
    RAISE EXCEPTION 'Invite issued for a different email';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
  VALUES (v_invite.organization_id, auth.uid(), v_invite.role, 'active', v_invite.invited_by)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE invites SET accepted_at = NOW() WHERE id = v_invite.id;
  RETURN true;
END;
$$;


ALTER FUNCTION donate.accept_invite(p_token text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: organization_members; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    user_id uuid,
    role text DEFAULT 'member'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    is_owner boolean DEFAULT false NOT NULL,
    invited_by uuid,
    joined_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.organization_members OWNER TO postgres;

--
-- Name: member_view; Type: VIEW; Schema: donate_private; Owner: postgres
--

CREATE VIEW donate_private.member_view AS
 SELECT om.id,
    om.organization_id,
    om.user_id,
    p.email,
    p.full_name,
    p.avatar_url,
    om.role,
    om.status,
    om.joined_at,
    om.created_at
   FROM (donate_private.organization_members om
     JOIN shared.profiles p ON ((om.user_id = p.id)));


ALTER VIEW donate_private.member_view OWNER TO postgres;

--
-- Name: add_organization_member(uuid, text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.add_organization_member(target_org_id uuid, target_user_email text, member_role text DEFAULT 'member'::text) RETURNS SETOF donate_private.member_view
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF NOT can_perform('members:create', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO target_user_id FROM profiles WHERE email = target_user_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
  VALUES (target_org_id, target_user_id, member_role, 'active', auth.uid())
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = member_role, updated_at = NOW();

  RETURN QUERY SELECT * FROM member_view WHERE organization_id = target_org_id AND user_id = target_user_id;
END;
$$;


ALTER FUNCTION donate.add_organization_member(target_org_id uuid, target_user_email text, member_role text) OWNER TO postgres;

--
-- Name: approve_org_request(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.approve_org_request(p_request_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_request org_requests;
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  -- Get the request details
  SELECT * INTO v_request
  FROM org_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found or not in pending status';
  END IF;

  -- Create the organization (name is NOT NULL on the base table; org_meta
  -- below remains the editable metadata source)
  INSERT INTO organizations (name, slug, created_by, status)
  VALUES (v_request.org_name, v_request.org_slug, v_request.user_id, 'active')
  RETURNING id INTO v_org_id;

  -- Create org_meta with initial data
  INSERT INTO org_meta (organization_id, name, description, updated_by)
  VALUES (v_org_id, v_request.org_name, v_request.org_description, auth.uid());

  -- Add user as org_admin + owner
  INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
  VALUES (v_org_id, v_request.user_id, 'admin', 'active', true);

  -- Update request status
  UPDATE org_requests
  SET status = 'approved',
      created_org_id = v_org_id,
      reviewed_at = NOW(),
      reviewed_by = auth.uid()
  WHERE id = p_request_id;

  RETURN v_org_id;
END;
$$;


ALTER FUNCTION donate.approve_org_request(p_request_id uuid) OWNER TO postgres;

--
-- Name: attach_default_plan(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.attach_default_plan() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  IF v_free_plan_id IS NULL THEN
    RETURN NEW; -- plans not seeded yet; nothing to attach
  END IF;

  INSERT INTO organization_subscriptions
    (organization_id, plan_id, status, current_period_start, current_period_end)
  SELECT NEW.id, v_free_plan_id, 'active', NOW(), NOW() + interval '1 month'
  WHERE NOT EXISTS (
    SELECT 1 FROM organization_subscriptions
    WHERE organization_id = NEW.id
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION donate.attach_default_plan() OWNER TO postgres;

--
-- Name: audit_action(uuid, uuid, text, text, uuid, jsonb); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.audit_action(audit_user_id uuid, audit_org_id uuid, action_name text, p_resource_type text DEFAULT NULL::text, p_resource_id uuid DEFAULT NULL::uuid, audit_metadata jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  INSERT INTO "donate_private".audit_logs (
    user_id, organization_id, action, resource_type, resource_id, metadata, ip_address, user_agent
  ) VALUES (
    audit_user_id, audit_org_id, action_name, p_resource_type, p_resource_id, audit_metadata,
    inet_client_addr(),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown')
  );
  RETURN (SELECT id FROM audit_logs ORDER BY created_at DESC LIMIT 1);
END;
$$;


ALTER FUNCTION donate.audit_action(audit_user_id uuid, audit_org_id uuid, action_name text, p_resource_type text, p_resource_id uuid, audit_metadata jsonb) OWNER TO postgres;

--
-- Name: audit_table_changes(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.audit_table_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  operation TEXT;
  v_resource_id UUID;
  v_org_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    operation := TG_TABLE_NAME || '.deleted';
    old_data := to_jsonb(OLD);
    v_resource_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    operation := TG_TABLE_NAME || '.updated';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    v_resource_id := NEW.id;
  ELSIF TG_OP = 'INSERT' THEN
    operation := TG_TABLE_NAME || '.created';
    new_data := to_jsonb(NEW);
    v_resource_id := NEW.id;
  END IF;

  IF TG_TABLE_NAME = 'organizations' THEN
    v_org_id := v_resource_id;
  ELSIF TG_TABLE_NAME = 'organization_members' THEN
    IF TG_OP = 'DELETE' THEN
      v_org_id := OLD.organization_id;
    ELSE
      v_org_id := NEW.organization_id;
    END IF;
  ELSE
    v_org_id := NULL;
  END IF;

  INSERT INTO "donate_private".audit_logs (user_id, organization_id, action, resource_type, resource_id, metadata, ip_address)
  VALUES (auth.uid(), v_org_id, operation, TG_TABLE_NAME, v_resource_id,
    jsonb_build_object('old', old_data, 'new', new_data, 'operation', TG_OP), inet_client_addr());

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


ALTER FUNCTION donate.audit_table_changes() OWNER TO postgres;

--
-- Name: bootstrap_system_admin(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.bootstrap_system_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_system_admin = true) THEN
    RETURN true;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE is_system_admin = true) THEN
    RAISE EXCEPTION 'System admin already exists. Use grant_system_admin() instead.';
  END IF;

  UPDATE profiles SET is_system_admin = true WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No profile found for current user'; END IF;
  RETURN true;
END;
$$;


ALTER FUNCTION donate.bootstrap_system_admin() OWNER TO postgres;

--
-- Name: can_perform(text, uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.can_perform(permission_name text, p_org_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_status TEXT;
  v_feature    TEXT;
BEGIN
  -- (1) System admin transcends org and tier
  IF donate_private.rls_is_system_admin() THEN
    RETURN TRUE;
  END IF;

  -- (2) Org existence + suspension contract
  v_org_status := donate_private.rls_org_status(p_org_id);
  IF v_org_status IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_org_status = 'suspended'
     AND permission_name NOT IN ('org:read', 'org:update') THEN
    RETURN FALSE; -- suspended: only org info/metadata management
  END IF;

  -- (3) Active membership holding the role permission (owner shortcut)
  IF NOT (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.is_owner = true
    )
    OR EXISTS (
      SELECT 1
      FROM organization_members om
      JOIN role_permissions rp ON rp.role = om.role
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND rp.permission IN (permission_name, '*')
    )
  ) THEN
    RETURN FALSE;
  END IF;

  -- (4) Plan-managed subscription feature (data-driven; unmanaged namespaces
  --     like 'org' pass on the role check alone)
  v_feature := split_part(permission_name, ':', 1);

  IF EXISTS (
    SELECT 1 FROM subscription_plans
    WHERE is_active = true AND features ? v_feature
  ) THEN
    RETURN has_feature(p_org_id, v_feature);
  END IF;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION donate.can_perform(permission_name text, p_org_id uuid) OWNER TO postgres;

--
-- Name: cancel_subscription(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.cancel_subscription(p_org_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_sub organization_subscriptions%ROWTYPE;
BEGIN
  -- Verify owner (owner-only via is_owner short-circuit in can_perform)
  IF NOT can_perform('subscription:manage', p_org_id) THEN
    RAISE EXCEPTION 'Only organization owners can cancel subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'active'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'No active subscription found';
  END IF;

  UPDATE organization_subscriptions
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = v_sub.id;

  INSERT INTO subscription_history (organization_id, plan_id, action, notes)
  VALUES (p_org_id, v_sub.plan_id, 'cancelled', 'Subscription cancelled by owner');

  RETURN true;
END;
$$;


ALTER FUNCTION donate.cancel_subscription(p_org_id uuid) OWNER TO postgres;

--
-- Name: organization_subscriptions; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.organization_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    billing_period text DEFAULT 'monthly'::text NOT NULL,
    current_period_start timestamp with time zone DEFAULT now(),
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.organization_subscriptions OWNER TO postgres;

--
-- Name: change_plan(uuid, uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.change_plan(p_org_id uuid, p_new_plan_id uuid, p_billing_period text) RETURNS donate_private.organization_subscriptions
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_old_sub organization_subscriptions%ROWTYPE;
  v_new_plan subscription_plans;
  v_new_sub organization_subscriptions;
  v_period_end TIMESTAMPTZ;
  v_action TEXT;
BEGIN
  -- Verify owner (owner-only via is_owner short-circuit in can_perform)
  IF NOT can_perform('subscription:manage', p_org_id) THEN
    RAISE EXCEPTION 'Only organization owners can change plans';
  END IF;

  -- Get current active subscription
  SELECT * INTO v_old_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'active'
  LIMIT 1;

  IF v_old_sub IS NULL THEN
    RAISE EXCEPTION 'No active subscription found. Use subscribe_to_plan instead.';
  END IF;

  -- Verify new plan exists and is active
  SELECT * INTO v_new_plan
  FROM subscription_plans
  WHERE id = p_new_plan_id AND is_active = true;

  IF v_new_plan IS NULL THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Determine action
  IF v_new_plan.price_monthly > (
    SELECT price_monthly FROM subscription_plans WHERE id = v_old_sub.plan_id
  ) THEN
    v_action := 'upgraded';
  ELSIF v_new_plan.price_monthly < (
    SELECT price_monthly FROM subscription_plans WHERE id = v_old_sub.plan_id
  ) THEN
    v_action := 'downgraded';
  ELSE
    v_action := 'changed';
  END IF;

  -- Expire old subscription
  UPDATE organization_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE id = v_old_sub.id;

  -- Calculate period end
  IF p_billing_period = 'yearly' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Create new subscription
  INSERT INTO organization_subscriptions (
    organization_id, plan_id, status, billing_period,
    current_period_start, current_period_end
  )
  VALUES (p_org_id, p_new_plan_id, 'active', p_billing_period, NOW(), v_period_end)
  RETURNING * INTO v_new_sub;

  -- Record history
  INSERT INTO subscription_history (organization_id, plan_id, action, amount, payment_status, notes)
  VALUES (
    p_org_id, p_new_plan_id, v_action,
    CASE WHEN p_billing_period = 'yearly' THEN v_new_plan.price_yearly ELSE v_new_plan.price_monthly END,
    'paid',
    v_action || ' to ' || v_new_plan.name
  );

  RETURN v_new_sub;
END;
$$;


ALTER FUNCTION donate.change_plan(p_org_id uuid, p_new_plan_id uuid, p_billing_period text) OWNER TO postgres;

--
-- Name: confirm_donation_report(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.confirm_donation_report(p_report_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  SELECT campaign_id INTO v_campaign_id FROM donation_reports
  WHERE donation_reports.id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT can_perform('donations:manage', (
    SELECT org_id FROM campaigns WHERE campaigns.id = v_campaign_id
  )) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE donation_reports
  SET status = 'confirmed', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE donation_reports.id = p_report_id AND donation_reports.status = 'pending';
  IF NOT FOUND THEN RETURN false; END IF;

  PERFORM sync_campaign_raised(v_campaign_id);
  RETURN true;
END;
$$;


ALTER FUNCTION donate.confirm_donation_report(p_report_id uuid) OWNER TO postgres;

--
-- Name: campaigns; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    cover_image_url text,
    goal_amount numeric(14,2),
    raised_amount numeric(14,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'BDT'::character varying,
    start_date date,
    end_date date,
    is_zakat_eligible boolean DEFAULT false,
    status donate.campaign_status DEFAULT 'draft'::donate.campaign_status,
    created_by uuid,
    verified_by uuid,
    verified_at timestamp with time zone,
    verification_notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    address text,
    CONSTRAINT campaigns_raised_amount_check CHECK ((raised_amount >= (0)::numeric))
);


ALTER TABLE donate_private.campaigns OWNER TO postgres;

--
-- Name: create_campaign(uuid, text, text, text, text, numeric, character varying, date, date, boolean, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.create_campaign(p_org_id uuid, p_title text, p_slug text, p_description text DEFAULT NULL::text, p_cover_image_url text DEFAULT NULL::text, p_goal_amount numeric DEFAULT NULL::numeric, p_currency character varying DEFAULT 'BDT'::character varying, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_is_zakat_eligible boolean DEFAULT false, p_address text DEFAULT NULL::text) RETURNS SETOF donate_private.campaigns
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('campaigns:create', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO campaigns (
    org_id, title, slug, description, cover_image_url, goal_amount,
    currency, start_date, end_date, is_zakat_eligible, address,
    created_by, status
  )
  VALUES (
    p_org_id, p_title, p_slug, p_description, p_cover_image_url, p_goal_amount,
    p_currency, p_start_date, p_end_date, p_is_zakat_eligible, p_address,
    auth.uid(), 'draft'
  )
  RETURNING *;
END;
$$;


ALTER FUNCTION donate.create_campaign(p_org_id uuid, p_title text, p_slug text, p_description text, p_cover_image_url text, p_goal_amount numeric, p_currency character varying, p_start_date date, p_end_date date, p_is_zakat_eligible boolean, p_address text) OWNER TO postgres;

--
-- Name: invites; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email text NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    role text DEFAULT 'member'::text,
    invited_by uuid,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.invites OWNER TO postgres;

--
-- Name: create_invite(uuid, text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.create_invite(p_organization_id uuid, p_email text, p_role text DEFAULT 'member'::text) RETURNS SETOF donate_private.invites
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('invites:create', p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO invites (organization_id, email, role, invited_by)
  VALUES (p_organization_id, p_email, p_role, auth.uid())
  RETURNING *;
END;
$$;


ALTER FUNCTION donate.create_invite(p_organization_id uuid, p_email text, p_role text) OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    description text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    created_by uuid,
    org_type text DEFAULT 'organization'::text NOT NULL,
    kind text DEFAULT 'organization'::text NOT NULL,
    CONSTRAINT organizations_kind_check CHECK ((kind = ANY (ARRAY['organization'::text, 'personal'::text]))),
    CONSTRAINT organizations_org_type_check CHECK ((org_type = ANY (ARRAY['organization'::text, 'individual'::text])))
);


ALTER TABLE donate_private.organizations OWNER TO postgres;

--
-- Name: organization_view; Type: VIEW; Schema: donate_private; Owner: postgres
--

CREATE VIEW donate_private.organization_view AS
 SELECT o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.description,
    o.settings,
    o.created_at,
    o.updated_at,
    om.user_id,
    om.role AS user_role,
    om.status AS membership_status,
    om.joined_at
   FROM (donate_private.organizations o
     LEFT JOIN donate_private.organization_members om ON ((o.id = om.organization_id)));


ALTER VIEW donate_private.organization_view OWNER TO postgres;

--
-- Name: create_organization(text, text, text, jsonb); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.create_organization(org_name text, org_slug text, org_description text DEFAULT NULL::text, org_settings jsonb DEFAULT '{}'::jsonb) RETURNS SETOF donate_private.organization_view
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  new_org organizations;
BEGIN
  INSERT INTO organizations (name, slug, description, settings)
  VALUES (org_name, org_slug, org_description, org_settings)
  RETURNING * INTO new_org;

  INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
  VALUES (new_org.id, auth.uid(), 'admin', 'active', true);

  RETURN QUERY SELECT * FROM organization_view WHERE id = new_org.id;
END;
$$;


ALTER FUNCTION donate.create_organization(org_name text, org_slug text, org_description text, org_settings jsonb) OWNER TO postgres;

--
-- Name: create_personal_org(text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.create_personal_org(p_name text, p_slug text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $_$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_final_slug TEXT;
  v_attempt INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Slug may only use lowercase letters, numbers and dashes';
  END IF;

  -- One personal workspace per person.
  IF EXISTS (
    SELECT 1
    FROM "donate_private".organization_members om
    JOIN "donate_private".organizations o ON o.id = om.organization_id
    WHERE om.user_id = v_user_id
      AND om.is_owner = true
      AND o.org_type = 'individual'
  ) THEN
    RAISE EXCEPTION 'Personal workspace already exists';
  END IF;

  -- The client sends a base slug; uniqueness comes from a short random
  -- suffix added here so personal workspaces never collide and never
  -- need a retry round-trip.
  FOR v_attempt IN 1..5 LOOP
    v_final_slug := p_slug || '-' || substr(md5(random()::text), 1, 4);
    BEGIN
      INSERT INTO "donate_private".organizations (name, slug, created_by, status, org_type)
      VALUES (btrim(p_name), v_final_slug, v_user_id, 'active', 'individual')
      RETURNING id INTO v_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt = 5 THEN
        RAISE EXCEPTION 'Could not allocate a unique slug, please retry';
      END IF;
    END;
  END LOOP;

  INSERT INTO "donate_private".org_meta (organization_id, name, updated_by)
  VALUES (v_org_id, btrim(p_name), v_user_id);

  -- Mirrors approve_org_request: creator becomes admin + owner.
  INSERT INTO "donate_private".organization_members (organization_id, user_id, role, status, is_owner)
  VALUES (v_org_id, v_user_id, 'admin', 'active', true);

  RETURN v_org_id;
END;
$_$;


ALTER FUNCTION donate.create_personal_org(p_name text, p_slug text) OWNER TO postgres;

--
-- Name: subscription_plans; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price_monthly numeric DEFAULT 0,
    price_yearly numeric DEFAULT 0,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.subscription_plans OWNER TO postgres;

--
-- Name: create_subscription_plan(text, text, numeric, numeric, jsonb); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.create_subscription_plan(p_name text, p_description text, p_price_monthly numeric, p_price_yearly numeric, p_features jsonb) RETURNS donate_private.subscription_plans
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  new_plan subscription_plans;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can create subscription plans';
  END IF;

  INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features)
  VALUES (p_name, p_description, p_price_monthly, p_price_yearly, p_features)
  RETURNING * INTO new_plan;

  RETURN new_plan;
END;
$$;


ALTER FUNCTION donate.create_subscription_plan(p_name text, p_description text, p_price_monthly numeric, p_price_yearly numeric, p_features jsonb) OWNER TO postgres;

--
-- Name: todos; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.todos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    completed boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.todos OWNER TO postgres;

--
-- Name: create_todo(uuid, text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.create_todo(p_organization_id uuid, p_title text, p_description text DEFAULT NULL::text) RETURNS SETOF donate_private.todos
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('todos:create', p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO todos (organization_id, title, description, created_by)
  VALUES (p_organization_id, p_title, p_description, auth.uid())
  RETURNING *;
END;
$$;


ALTER FUNCTION donate.create_todo(p_organization_id uuid, p_title text, p_description text) OWNER TO postgres;

--
-- Name: delete_campaign(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.delete_campaign(p_campaign_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
  v_status campaign_status;
BEGIN
  SELECT org_id, status INTO v_org_id, v_status FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF NOT is_system_admin() AND v_status = 'live' THEN
    RAISE EXCEPTION 'Cannot delete a live campaign';
  END IF;

  IF NOT can_perform('campaigns:delete', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM campaigns WHERE id = p_campaign_id;
  RETURN true;
END;
$$;


ALTER FUNCTION donate.delete_campaign(p_campaign_id uuid) OWNER TO postgres;

--
-- Name: delete_organization(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.delete_organization(target_org_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('org:delete', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM organizations WHERE id = target_org_id;
  RETURN true;
END;
$$;


ALTER FUNCTION donate.delete_organization(target_org_id uuid) OWNER TO postgres;

--
-- Name: delete_todo(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.delete_todo(p_todo_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  DELETE FROM todos WHERE id = p_todo_id
  AND can_perform('todos:delete', todos.organization_id);
  RETURN true;
END;
$$;


ALTER FUNCTION donate.delete_todo(p_todo_id uuid) OWNER TO postgres;

--
-- Name: ensure_my_personal_org(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.ensure_my_personal_org() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_uid UUID;
  v_org_id UUID;
  v_name TEXT;
  v_base_slug TEXT;
  v_slug TEXT;
  v_attempt INT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Idempotent: return the existing personal org (matches the partial
  -- unique index exactly).
  SELECT id INTO v_org_id
  FROM organizations
  WHERE kind = 'personal' AND created_by = v_uid
  LIMIT 1;
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  SELECT COALESCE(NULLIF(p.full_name, ''), split_part(p.email, '@', 1), 'Fundraiser')
    INTO v_name
  FROM shared.profiles p
  WHERE p.id = v_uid;

  v_base_slug := lower(regexp_replace(COALESCE(v_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'fundraiser';
  END IF;

  v_slug := v_base_slug;
  v_org_id := NULL;
  FOR v_attempt IN 1..5 LOOP
    BEGIN
      -- trg_attach_default_plan arms the new org with the Free plan.
      INSERT INTO organizations (name, slug, created_by, status, kind)
      VALUES (v_name, v_slug, v_uid, 'active', 'personal')
      RETURNING id INTO v_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_slug := v_base_slug || '-' || substr(md5(random()::text), 1, 6);
    END;
  END LOOP;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Could not allocate a unique organization slug';
  END IF;

  INSERT INTO org_meta (organization_id, name, updated_by)
  VALUES (v_org_id, v_name, v_uid);

  -- Same membership shape as approve_org_request: sole admin + owner.
  INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
  VALUES (v_org_id, v_uid, 'admin', 'active', true);

  RETURN v_org_id;
END;
$$;


ALTER FUNCTION donate.ensure_my_personal_org() OWNER TO postgres;

--
-- Name: get_all_org_requests(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_all_org_requests() RETURNS TABLE(id uuid, user_id uuid, user_email text, user_name text, org_name text, org_slug text, org_description text, status text, rejection_reason text, requested_at timestamp with time zone, reviewed_at timestamp with time zone, reviewed_by_email text, created_org_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    p.email AS user_email,
    p.full_name AS user_name,
    r.org_name,
    r.org_slug,
    r.org_description,
    r.status,
    r.rejection_reason,
    r.requested_at,
    r.reviewed_at,
    reviewer.email AS reviewed_by_email,
    r.created_org_id
  FROM org_requests r
  JOIN profiles p ON r.user_id = p.id
  LEFT JOIN profiles reviewer ON r.reviewed_by = reviewer.id
  ORDER BY
    CASE r.status
      WHEN 'pending' THEN 1
      WHEN 'approved' THEN 2
      WHEN 'rejected' THEN 3
    END,
    r.requested_at DESC,
    r.id DESC;
END;
$$;


ALTER FUNCTION donate.get_all_org_requests() OWNER TO postgres;

--
-- Name: get_all_organizations(integer, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_all_organizations(p_limit integer DEFAULT 20, p_cursor text DEFAULT NULL::text) RETURNS TABLE(id uuid, slug text, status text, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, member_count bigint, name text, description text, logo_url text, website_url text, contact_email text, contact_phone text, address text, social_links jsonb, settings jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;
  RETURN QUERY
    SELECT
      o.id,
      o.slug,
      o.status,
      o.created_by,
      o.created_at,
      o.updated_at,
      COUNT(DISTINCT mem.user_id) AS member_count,
      COALESCE(om.name, o.name) AS name,
      COALESCE(om.description, o.description) AS description,
      om.logo_url,
      om.website_url,
      om.contact_email,
      om.contact_phone,
      om.address,
      om.social_links,
      om.settings
    FROM organizations o
    LEFT JOIN organization_members mem
      ON o.id = mem.organization_id AND mem.status = 'active'
    LEFT JOIN org_meta om
      ON o.id = om.organization_id
    WHERE (p_cursor IS NULL OR o.id::text > p_cursor)
    GROUP BY o.id, o.slug, o.status, o.created_by, o.created_at, o.updated_at,
             om.name, om.description, om.logo_url, om.website_url, om.contact_email,
             om.contact_phone, om.address, om.social_links, om.settings
    ORDER BY o.id ASC
    LIMIT v_limit;
END;
$$;


ALTER FUNCTION donate.get_all_organizations(p_limit integer, p_cursor text) OWNER TO postgres;

--
-- Name: get_campaign(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_campaign(p_campaign_id uuid) RETURNS SETOF donate_private.campaigns
    LANGUAGE sql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT * FROM campaigns
  WHERE id = p_campaign_id
    AND (
      can_perform('campaigns:read', org_id)
      OR is_system_admin()
    );
$$;


ALTER FUNCTION donate.get_campaign(p_campaign_id uuid) OWNER TO postgres;

--
-- Name: get_campaign_beneficiary(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_campaign_beneficiary(p_campaign_id uuid) RETURNS TABLE(full_name text, relationship text, phone text, national_id text, document_url text, notes text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT (can_perform('campaigns:read', v_org_id) OR is_system_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT cb.full_name, cb.relationship, cb.phone, cb.national_id,
         cb.document_url, cb.notes
  FROM campaign_beneficiary cb
  WHERE cb.campaign_id = p_campaign_id;
END;
$$;


ALTER FUNCTION donate.get_campaign_beneficiary(p_campaign_id uuid) OWNER TO postgres;

--
-- Name: get_campaign_by_slug(text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_campaign_by_slug(p_slug text) RETURNS SETOF donate_private.campaigns
    LANGUAGE sql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT * FROM campaigns
  WHERE slug = p_slug
    AND (
      can_perform('campaigns:read', org_id)
      OR is_system_admin()
      OR (status = 'live' AND is_active)
    );
$$;


ALTER FUNCTION donate.get_campaign_by_slug(p_slug text) OWNER TO postgres;

--
-- Name: get_campaign_payment_methods(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_campaign_payment_methods(p_campaign_id uuid) RETURNS TABLE(campaign_id uuid, bkash_number text, bkash_account_name text, nagad_number text, nagad_account_name text, rocket_number text, rocket_account_name text, bank_name text, bank_account_number text, bank_account_name text, bank_routing_number text, bank_branch text, donation_url text, qr_image_url text, instructions text, is_preferred boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT (can_perform('campaigns:read', v_org_id) OR is_system_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT cpm.campaign_id, cpm.bkash_number, cpm.bkash_account_name,
         cpm.nagad_number, cpm.nagad_account_name, cpm.rocket_number,
         cpm.rocket_account_name, cpm.bank_name, cpm.bank_account_number,
         cpm.bank_account_name, cpm.bank_routing_number, cpm.bank_branch,
         cpm.donation_url, cpm.qr_image_url, cpm.instructions,
         cpm.is_preferred
  FROM campaign_payment_methods cpm
  WHERE cpm.campaign_id = p_campaign_id;
END;
$$;


ALTER FUNCTION donate.get_campaign_payment_methods(p_campaign_id uuid) OWNER TO postgres;

--
-- Name: get_campaign_tag_ids(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_campaign_tag_ids(p_campaign_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT m.tag_id
  FROM campaign_tag_map m
  WHERE m.campaign_id = p_campaign_id
    AND can_perform(
      'campaigns:read',
      (SELECT c.org_id FROM campaigns c WHERE c.id = p_campaign_id)
    )
  ORDER BY m.tag_id ASC;
$$;


ALTER FUNCTION donate.get_campaign_tag_ids(p_campaign_id uuid) OWNER TO postgres;

--
-- Name: campaign_tags; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.campaign_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    label_bn text
);


ALTER TABLE donate_private.campaign_tags OWNER TO postgres;

--
-- Name: get_campaign_tags(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_campaign_tags() RETURNS SETOF donate_private.campaign_tags
    LANGUAGE sql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT * FROM campaign_tags ORDER BY label ASC;
$$;


ALTER FUNCTION donate.get_campaign_tags() OWNER TO postgres;

--
-- Name: get_campaigns(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_campaigns(p_org_id uuid) RETURNS SETOF donate_private.campaigns
    LANGUAGE sql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT * FROM campaigns
  WHERE org_id = p_org_id
    AND can_perform('campaigns:read', p_org_id)
  ORDER BY created_at DESC;
$$;


ALTER FUNCTION donate.get_campaigns(p_org_id uuid) OWNER TO postgres;

--
-- Name: donation_methods; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.donation_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    bkash_number text,
    bkash_account_name text,
    nagad_number text,
    nagad_account_name text,
    rocket_number text,
    rocket_account_name text,
    bank_name text,
    bank_account_number text,
    bank_account_name text,
    bank_routing_number text,
    bank_branch text,
    donation_url text,
    qr_image_url text,
    instructions text,
    is_preferred boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.donation_methods OWNER TO postgres;

--
-- Name: get_donation_methods(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_donation_methods(p_org_id uuid) RETURNS SETOF donate_private.donation_methods
    LANGUAGE sql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT * FROM donation_methods
  WHERE organization_id = p_org_id
    AND can_perform('org:read', p_org_id)
  ORDER BY is_preferred DESC, created_at ASC;
$$;


ALTER FUNCTION donate.get_donation_methods(p_org_id uuid) OWNER TO postgres;

--
-- Name: get_invites(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_invites(p_organization_id uuid) RETURNS SETOF donate_private.invites
    LANGUAGE sql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT * FROM invites
  WHERE organization_id = p_organization_id
  AND accepted_at IS NULL
  AND expires_at > NOW()
  AND can_perform('invites:read', p_organization_id);
$$;


ALTER FUNCTION donate.get_invites(p_organization_id uuid) OWNER TO postgres;

--
-- Name: get_membership(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_membership(p_org_id uuid) RETURNS TABLE(role text, permissions text[], is_active boolean, is_owner boolean)
    LANGUAGE sql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT om.role,
    (SELECT ARRAY_AGG(rp.permission) FROM role_permissions rp WHERE rp.role = om.role) AS permissions,
    (om.status = 'active') AS is_active,
    om.is_owner
  FROM organization_members om
  WHERE om.organization_id = p_org_id AND om.user_id = auth.uid();
$$;


ALTER FUNCTION donate.get_membership(p_org_id uuid) OWNER TO postgres;

--
-- Name: get_my_org_requests(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_my_org_requests() RETURNS TABLE(id uuid, org_name text, org_slug text, org_description text, status text, rejection_reason text, requested_at timestamp with time zone, reviewed_at timestamp with time zone, created_org_id uuid)
    LANGUAGE sql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT
    id, org_name, org_slug, org_description, status, rejection_reason,
    requested_at, reviewed_at, created_org_id
  FROM org_requests
  WHERE user_id = auth.uid()
  ORDER BY requested_at DESC, id DESC;
$$;


ALTER FUNCTION donate.get_my_org_requests() OWNER TO postgres;

--
-- Name: get_my_organizations(integer, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_my_organizations(p_limit integer DEFAULT 20, p_cursor text DEFAULT NULL::text) RETURNS TABLE(id uuid, slug text, status text, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, user_id uuid, user_role text, membership_status text, joined_at timestamp with time zone, name text, description text, logo_url text, website_url text, contact_email text, contact_phone text, address text, social_links jsonb, settings jsonb, kind text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT
    o.id,
    o.slug,
    o.status,
    o.created_by,
    o.created_at,
    o.updated_at,
    om.user_id,
    om.role AS user_role,
    om.status AS membership_status,
    om.joined_at,
    COALESCE(m.name, o.name) AS name,
    COALESCE(m.description, o.description) AS description,
    m.logo_url,
    m.website_url,
    m.contact_email,
    m.contact_phone,
    m.address,
    m.social_links,
    m.settings,
    o.kind
  FROM organizations o
  LEFT JOIN organization_members om
    ON o.id = om.organization_id
  LEFT JOIN org_meta m
    ON o.id = m.organization_id
  WHERE om.user_id = auth.uid()
    AND (p_cursor IS NULL OR o.id::text > p_cursor)
  ORDER BY o.id ASC
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
$$;


ALTER FUNCTION donate.get_my_organizations(p_limit integer, p_cursor text) OWNER TO postgres;

--
-- Name: get_my_profile(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_my_profile() RETURNS SETOF shared.profiles
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT * FROM profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION donate.get_my_profile() OWNER TO postgres;

--
-- Name: get_my_subscription(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_my_subscription(p_org_id uuid) RETURNS TABLE(id uuid, plan_id uuid, plan_name text, description text, price_monthly numeric, price_yearly numeric, features jsonb, status text, billing_period text, current_period_start timestamp with time zone, current_period_end timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT
    os.id,
    sp.id AS plan_id,
    sp.name AS plan_name,
    sp.description,
    sp.price_monthly,
    sp.price_yearly,
    sp.features,
    os.status,
    os.billing_period,
    os.current_period_start,
    os.current_period_end
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.organization_id = p_org_id
    AND os.status = 'active'
    AND (
      is_system_admin()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = p_org_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
      )
    )
  LIMIT 1;
$$;


ALTER FUNCTION donate.get_my_subscription(p_org_id uuid) OWNER TO postgres;

--
-- Name: org_meta; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.org_meta (
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    logo_url text,
    website_url text,
    contact_email text,
    contact_phone text,
    address text,
    social_links jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.org_meta OWNER TO postgres;

--
-- Name: get_org_meta(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_org_meta(p_org_id uuid) RETURNS SETOF donate_private.org_meta
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('org:read', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY SELECT * FROM org_meta WHERE organization_id = p_org_id;
END;
$$;


ALTER FUNCTION donate.get_org_meta(p_org_id uuid) OWNER TO postgres;

--
-- Name: get_org_overview(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_org_overview(p_org_id uuid) RETURNS TABLE(pending_donation_reports bigint, confirmed_donations bigint, raised_total numeric, live_campaigns bigint, pending_review_campaigns bigint, draft_campaigns bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('org:read', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM donation_reports r
      WHERE r.org_id = p_org_id AND r.status = 'pending'),
    (SELECT COUNT(*) FROM donation_reports r
      WHERE r.org_id = p_org_id AND r.status = 'confirmed'),
    (SELECT COALESCE(SUM(c.raised_amount), 0) FROM campaigns c
      WHERE c.org_id = p_org_id),
    (SELECT COUNT(*) FROM campaigns c
      WHERE c.org_id = p_org_id AND c.status = 'live'),
    (SELECT COUNT(*) FROM campaigns c
      WHERE c.org_id = p_org_id AND c.status = 'pending_review'),
    (SELECT COUNT(*) FROM campaigns c
      WHERE c.org_id = p_org_id AND c.status = 'draft');
END;
$$;


ALTER FUNCTION donate.get_org_overview(p_org_id uuid) OWNER TO postgres;

--
-- Name: get_organization(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_organization(target_org_id uuid) RETURNS TABLE(id uuid, slug text, status text, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, member_count bigint, kind text, name text, description text, logo_url text, website_url text, contact_email text, contact_phone text, address text, social_links jsonb, settings jsonb)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
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
  FROM "donate_private".organizations o
  LEFT JOIN "donate_private".organization_members mem
    ON o.id = mem.organization_id AND mem.status = 'active'
  LEFT JOIN "donate_private".org_meta om
    ON o.id = om.organization_id
  WHERE o.id = target_org_id
    AND can_perform('org:read', target_org_id)
  GROUP BY o.id, o.slug, o.status, o.created_by, o.created_at, o.updated_at, o.kind,
           COALESCE(om.name, o.name), COALESCE(om.description, o.description), om.logo_url, om.website_url, om.contact_email,
           om.contact_phone, om.address, om.social_links, om.settings;
$$;


ALTER FUNCTION donate.get_organization(target_org_id uuid) OWNER TO postgres;

--
-- Name: get_organization_members(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_organization_members(target_org_id uuid) RETURNS SETOF donate_private.member_view
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('members:read', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized to view members';
  END IF;

  RETURN QUERY
  SELECT * FROM member_view WHERE organization_id = target_org_id;
END;
$$;


ALTER FUNCTION donate.get_organization_members(target_org_id uuid) OWNER TO postgres;

--
-- Name: get_organization_subscriptions(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_organization_subscriptions() RETURNS TABLE(id uuid, organization_id uuid, org_name text, plan_name text, status text, billing_period text, price_monthly numeric, price_yearly numeric, current_period_start timestamp with time zone, current_period_end timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT
    os.id, os.organization_id, o.name AS org_name, sp.name AS plan_name,
    os.status, os.billing_period, sp.price_monthly, sp.price_yearly,
    os.current_period_start, os.current_period_end, os.created_at
  FROM organization_subscriptions os
  JOIN organizations o ON os.organization_id = o.id
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE is_system_admin()
  ORDER BY os.created_at DESC, os.id DESC;
$$;


ALTER FUNCTION donate.get_organization_subscriptions() OWNER TO postgres;

--
-- Name: get_pending_campaigns(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_pending_campaigns() RETURNS SETOF donate_private.campaigns
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY
  SELECT * FROM campaigns
  WHERE status = 'pending_review'
  ORDER BY created_at ASC;
END;
$$;


ALTER FUNCTION donate.get_pending_campaigns() OWNER TO postgres;

--
-- Name: get_personal_campaigns(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_personal_campaigns() RETURNS TABLE(id uuid, title text, slug text, status text, goal_amount numeric, currency character varying, created_at timestamp with time zone, org_id uuid, org_name text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
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
  FROM "donate_private".campaigns c
  JOIN "donate_private".organizations o ON o.id = c.org_id
  LEFT JOIN "donate_private".org_meta om ON om.organization_id = o.id
  WHERE o.kind = 'personal'
  ORDER BY (c.status = 'live') DESC, c.created_at DESC;
$$;


ALTER FUNCTION donate.get_personal_campaigns() OWNER TO postgres;

--
-- Name: get_public_campaign_by_slug(text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_public_campaign_by_slug(p_slug text) RETURNS TABLE(id uuid, title text, slug text, description text, goal_amount numeric, raised_amount numeric, pending_amount numeric, currency text, start_date timestamp with time zone, end_date timestamp with time zone, cover_image_url text, is_zakat_eligible boolean, org_id uuid, org_name text, org_slug text, org_description text, org_logo_url text, address text, donation_methods jsonb, tags jsonb)
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
$$;


ALTER FUNCTION donate.get_public_campaign_by_slug(p_slug text) OWNER TO postgres;

--
-- Name: get_public_campaigns(boolean, uuid, integer); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_public_campaigns(zakat_filter boolean DEFAULT NULL::boolean, org_filter uuid DEFAULT NULL::uuid, result_limit integer DEFAULT NULL::integer) RETURNS TABLE(id uuid, org_id uuid, org_name text, org_slug text, org_logo_url text, org_description text, title text, slug text, description text, cover_image_url text, goal_amount numeric, raised_amount numeric, pending_amount numeric, currency character varying, start_date date, end_date date, is_zakat_eligible boolean, created_at timestamp with time zone, updated_at timestamp with time zone, address text, donation_methods jsonb, tags jsonb)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
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


ALTER FUNCTION donate.get_public_campaigns(zakat_filter boolean, org_filter uuid, result_limit integer) OWNER TO postgres;

--
-- Name: get_public_donation_reports(uuid, integer); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_public_donation_reports(p_campaign_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(id uuid, amount numeric, currency character varying, method text, donor_name text, created_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT r.id, r.amount, r.currency, r.method, r.donor_name, r.created_at
  FROM donation_reports r
  WHERE r.campaign_id = p_campaign_id AND r.status = 'confirmed'
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;


ALTER FUNCTION donate.get_public_donation_reports(p_campaign_id uuid, p_limit integer) OWNER TO postgres;

--
-- Name: get_public_org_by_slug(text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_public_org_by_slug(org_slug text) RETURNS TABLE(id uuid, name text, slug text, description text, created_at timestamp with time zone, logo_url text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT o.id, o.name, o.slug, o.description, o.created_at, o.logo_url
  FROM "donate_private".organizations o
  WHERE o.slug = org_slug
    AND EXISTS (
      SELECT 1
      FROM "donate_private".organization_members om
      WHERE om.organization_id = o.id
        AND om.status = 'active'
    );
$$;


ALTER FUNCTION donate.get_public_org_by_slug(org_slug text) OWNER TO postgres;

--
-- Name: get_public_orgs(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_public_orgs() RETURNS TABLE(id uuid, name text, slug text, description text, created_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT o.id, o.name, o.slug, o.description, o.created_at
  FROM "donate_private".organizations o
  WHERE o.kind = 'organization'
    AND EXISTS (
      SELECT 1
      FROM "donate_private".organization_members om
      WHERE om.organization_id = o.id
        AND om.status = 'active'
    )
  ORDER BY o.name;
$$;


ALTER FUNCTION donate.get_public_orgs() OWNER TO postgres;

--
-- Name: get_subscription_history(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_subscription_history(p_org_id uuid) RETURNS TABLE(id uuid, organization_id uuid, org_name text, plan_name text, action text, amount numeric, payment_status text, invoice_number text, notes text, created_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT
    sh.id, sh.organization_id, o.name AS org_name, sp.name AS plan_name,
    sh.action, sh.amount, sh.payment_status, sh.invoice_number,
    sh.notes, sh.created_at
  FROM subscription_history sh
  JOIN organizations o ON sh.organization_id = o.id
  JOIN subscription_plans sp ON sh.plan_id = sp.id
  WHERE sh.organization_id = p_org_id
    AND can_perform('org:read', p_org_id)
  ORDER BY sh.created_at DESC, sh.id DESC;
$$;


ALTER FUNCTION donate.get_subscription_history(p_org_id uuid) OWNER TO postgres;

--
-- Name: get_subscription_plans(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_subscription_plans() RETURNS SETOF donate_private.subscription_plans
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT * FROM subscription_plans ORDER BY price_monthly ASC, price_yearly ASC;
$$;


ALTER FUNCTION donate.get_subscription_plans() OWNER TO postgres;

--
-- Name: profile_view; Type: VIEW; Schema: donate_private; Owner: postgres
--

CREATE VIEW donate_private.profile_view AS
 SELECT id,
    email,
    full_name,
    avatar_url,
    metadata,
    created_at,
    updated_at
   FROM shared.profiles;


ALTER VIEW donate_private.profile_view OWNER TO postgres;

--
-- Name: get_system_admins(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_system_admins() RETURNS SETOF donate_private.profile_view
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY SELECT * FROM shared.profiles WHERE is_system_admin = true;
END;
$$;


ALTER FUNCTION donate.get_system_admins() OWNER TO postgres;

--
-- Name: get_system_stats(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_system_stats() RETURNS TABLE(total_orgs bigint, total_users bigint, total_members bigint, recent_signups bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM organizations),
    (SELECT COUNT(*) FROM shared.profiles),
    (SELECT COUNT(*) FROM organization_members),
    (SELECT COUNT(*) FROM shared.profiles WHERE created_at > NOW() - INTERVAL '7 days');
END;
$$;


ALTER FUNCTION donate.get_system_stats() OWNER TO postgres;

--
-- Name: get_todos(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_todos(p_organization_id uuid) RETURNS SETOF donate_private.todos
    LANGUAGE sql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT * FROM todos WHERE organization_id = p_organization_id
  AND can_perform('todos:read', p_organization_id)
  ORDER BY created_at DESC;
$$;


ALTER FUNCTION donate.get_todos(p_organization_id uuid) OWNER TO postgres;

--
-- Name: get_user_profile(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.get_user_profile(target_user_id uuid) RETURNS SETOF donate_private.profile_view
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT pv.*
  FROM profile_view pv
  WHERE pv.id = target_user_id
    AND (
      is_system_admin()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND om.status = 'active'
          AND EXISTS (
            SELECT 1 FROM organization_members om2
            WHERE om2.user_id = target_user_id
              AND om2.organization_id = om.organization_id
              AND om2.status = 'active'
          )
      )
    );
$$;


ALTER FUNCTION donate.get_user_profile(target_user_id uuid) OWNER TO postgres;

--
-- Name: grant_system_admin(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.grant_system_admin(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  UPDATE profiles SET is_system_admin = true WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$;


ALTER FUNCTION donate.grant_system_admin(target_user_id uuid) OWNER TO postgres;

--
-- Name: has_feature(uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.has_feature(p_org_id uuid, p_feature text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE os.organization_id = p_org_id
      AND os.status = 'active'
      AND sp.is_active = true
      AND os.current_period_end > NOW()
      AND sp.features ? p_feature
      AND (
        is_system_admin()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.user_id = auth.uid()
            AND om.organization_id = p_org_id
            AND om.status = 'active'
        )
      )
  );
$$;


ALTER FUNCTION donate.has_feature(p_org_id uuid, p_feature text) OWNER TO postgres;

--
-- Name: is_system_admin(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.is_system_admin() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT COALESCE(
    (SELECT is_system_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION donate.is_system_admin() OWNER TO postgres;

--
-- Name: list_campaign_abuse_reports(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.list_campaign_abuse_reports() RETURNS TABLE(id uuid, campaign_id uuid, campaign_title text, campaign_slug text, reason text, details text, contact text, created_at timestamp with time zone, resolved_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
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
  FROM "donate_private".campaign_abuse_reports r
  JOIN "donate_private".campaigns c ON c.id = r.campaign_id
  ORDER BY r.resolved_at IS NULL DESC, r.created_at DESC
  LIMIT 200;
$$;


ALTER FUNCTION donate.list_campaign_abuse_reports() OWNER TO postgres;

--
-- Name: list_donation_reports(uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.list_donation_reports(p_campaign_id uuid, p_status text DEFAULT 'pending'::text) RETURNS TABLE(id uuid, amount numeric, currency character varying, method text, reference text, donor_name text, message text, status text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE campaigns.id = p_campaign_id;
  IF NOT can_perform('donations:manage', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id, r.amount, r.currency, r.method, r.reference,
         r.donor_name, r.message, r.status, r.created_at
  FROM donation_reports r
  WHERE r.campaign_id = p_campaign_id
    AND r.status = p_status
  ORDER BY r.created_at DESC;
END;
$$;


ALTER FUNCTION donate.list_donation_reports(p_campaign_id uuid, p_status text) OWNER TO postgres;

--
-- Name: list_org_donation_reports(uuid, text, integer); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.list_org_donation_reports(p_org_id uuid, p_status text DEFAULT 'pending'::text, p_limit integer DEFAULT 100) RETURNS TABLE(id uuid, campaign_id uuid, campaign_title text, amount numeric, currency character varying, method text, reference text, donor_name text, message text, status text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('donations:manage', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id, r.campaign_id, c.title, r.amount, r.currency, r.method,
         r.reference, r.donor_name, r.message, r.status, r.created_at
  FROM donation_reports r
  JOIN campaigns c ON c.id = r.campaign_id
  WHERE r.org_id = p_org_id
    AND (p_status = '' OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$;


ALTER FUNCTION donate.list_org_donation_reports(p_org_id uuid, p_status text, p_limit integer) OWNER TO postgres;

--
-- Name: pause_subscription(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.pause_subscription(p_org_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_sub organization_subscriptions%ROWTYPE;
  v_plan subscription_plans%ROWTYPE;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can pause subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'active'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for this organization';
  END IF;

  UPDATE organization_subscriptions
  SET status = 'paused', updated_at = NOW()
  WHERE id = v_sub.id;

  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_sub.plan_id;

  INSERT INTO subscription_history (organization_id, plan_id, action, notes)
  VALUES (p_org_id, v_sub.plan_id, 'paused', 'Subscription paused by system admin');

  RETURN true;
END;
$$;


ALTER FUNCTION donate.pause_subscription(p_org_id uuid) OWNER TO postgres;

--
-- Name: propose_donation(uuid, numeric, text, text, text, text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.propose_donation(p_campaign_id uuid, p_amount numeric, p_method text DEFAULT 'other'::text, p_reference text DEFAULT NULL::text, p_donor_name text DEFAULT NULL::text, p_message text DEFAULT NULL::text, p_turnstile_token text DEFAULT NULL::text) RETURNS TABLE(id uuid, status text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_campaign campaigns;
  v_ip_hash TEXT;
  v_report_id UUID;
  v_status TEXT;
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE campaigns.id = p_campaign_id;
  IF NOT FOUND OR v_campaign.status <> 'live' THEN
    RAISE EXCEPTION 'Campaign not open for donations';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  -- Turnstile first: never spend a rate-limit slot on an unverified bot.
  v_ip_hash := MD5(COALESCE(
    current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''
  ));
  IF NOT verify_turnstile(p_turnstile_token, NULLIF(v_ip_hash, '')) THEN
    RAISE EXCEPTION 'Verification failed. Please try again.';
  END IF;

  -- Abuse caps: per-reporter cooldown and per-campaign queue ceiling.
  IF (
    SELECT COUNT(*) FROM donation_reports
    WHERE reporter_ip_hash = v_ip_hash
      AND donation_reports.created_at > NOW() - INTERVAL '24 hours'
  ) >= 10 THEN
    RAISE EXCEPTION 'Too many reports from this device. Try again later.';
  END IF;
  IF (
    SELECT COUNT(*) FROM donation_reports
    WHERE donation_reports.campaign_id = p_campaign_id
      AND donation_reports.status = 'pending'
  ) >= 200 THEN
    RAISE EXCEPTION 'This campaign has too many reports awaiting review.';
  END IF;

  INSERT INTO donation_reports (
    campaign_id, org_id, amount, currency, method,
    reference, donor_name, message, reporter_ip_hash
  ) VALUES (
    p_campaign_id, v_campaign.org_id, p_amount, v_campaign.currency,
    LEFT(p_method, 40), LEFT(p_reference, 120), LEFT(p_donor_name, 80),
    LEFT(p_message, 500), v_ip_hash
  ) RETURNING donation_reports.id, donation_reports.status,
    donation_reports.created_at
    INTO v_report_id, v_status, v_created_at;

  RETURN QUERY SELECT v_report_id, v_status, v_created_at;
END;
$$;


ALTER FUNCTION donate.propose_donation(p_campaign_id uuid, p_amount numeric, p_method text, p_reference text, p_donor_name text, p_message text, p_turnstile_token text) OWNER TO postgres;

--
-- Name: publish_campaign(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.publish_campaign(p_campaign_id uuid) RETURNS SETOF donate_private.campaigns
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
  v_status donate.campaign_status;
  v_kind TEXT;
  v_goal NUMERIC;
  v_end_date DATE;
BEGIN
  SELECT c.org_id, c.status, c.goal_amount, c.end_date
    INTO v_org_id, v_status, v_goal, v_end_date
  FROM "donate_private".campaigns c
  WHERE c.id = p_campaign_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  SELECT o.kind INTO v_kind
  FROM "donate_private".organizations o
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
    SELECT 1 FROM "donate_private".campaigns c2
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
  UPDATE "donate_private".campaigns
  SET status = 'live', updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$;


ALTER FUNCTION donate.publish_campaign(p_campaign_id uuid) OWNER TO postgres;

--
-- Name: reject_campaign(uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.reject_campaign(p_campaign_id uuid, p_notes text DEFAULT NULL::text) RETURNS SETOF donate_private.campaigns
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY
  UPDATE campaigns
  SET
    status = 'rejected',
    verified_by = auth.uid(),
    verified_at = NOW(),
    verification_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$;


ALTER FUNCTION donate.reject_campaign(p_campaign_id uuid, p_notes text) OWNER TO postgres;

--
-- Name: reject_donation_report(uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.reject_donation_report(p_report_id uuid, p_note text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  SELECT campaign_id INTO v_campaign_id FROM donation_reports
  WHERE donation_reports.id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT can_perform('donations:manage', (
    SELECT org_id FROM campaigns WHERE campaigns.id = v_campaign_id
  )) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE donation_reports
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = NOW(),
      review_note = LEFT(p_note, 300)
  WHERE donation_reports.id = p_report_id AND donation_reports.status = 'pending';
  IF NOT FOUND THEN RETURN false; END IF;

  PERFORM sync_campaign_raised(v_campaign_id);
  RETURN true;
END;
$$;


ALTER FUNCTION donate.reject_donation_report(p_report_id uuid, p_note text) OWNER TO postgres;

--
-- Name: reject_org_request(uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.reject_org_request(p_request_id uuid, p_rejection_reason text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  UPDATE org_requests
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      reviewed_at = NOW(),
      reviewed_by = auth.uid()
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not in pending status';
  END IF;

  RETURN true;
END;
$$;


ALTER FUNCTION donate.reject_org_request(p_request_id uuid, p_rejection_reason text) OWNER TO postgres;

--
-- Name: remove_organization_member(uuid, uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.remove_organization_member(target_org_id uuid, target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('members:delete', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM organization_members WHERE organization_id = target_org_id AND user_id = target_user_id;
  RETURN true;
END;
$$;


ALTER FUNCTION donate.remove_organization_member(target_org_id uuid, target_user_id uuid) OWNER TO postgres;

--
-- Name: report_campaign(uuid, text, text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text DEFAULT NULL::text, p_contact text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_reporter UUID := auth.uid();
  v_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "donate_private".campaigns
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

  INSERT INTO "donate_private".campaign_abuse_reports
    (campaign_id, reason, details, contact, reporter_id)
  VALUES
    (p_campaign_id, p_reason, left(p_details, 2000), left(p_contact, 200), v_reporter)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text) OWNER TO postgres;

--
-- Name: report_campaign(uuid, text, text, text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text DEFAULT NULL::text, p_contact text DEFAULT NULL::text, p_turnstile_token text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_reporter UUID := auth.uid();
  v_ip_hash TEXT;
  v_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "donate_private".campaigns
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
    SELECT COUNT(*) FROM "donate_private".campaign_abuse_reports
    WHERE reporter_ip_hash = v_ip_hash
      AND created_at > NOW() - INTERVAL '24 hours'
  ) >= 10 THEN
    RAISE EXCEPTION 'Too many reports from this device. Try again later.';
  END IF;
  IF (
    SELECT COUNT(*) FROM "donate_private".campaign_abuse_reports
    WHERE campaign_id = p_campaign_id AND resolved_at IS NULL
  ) >= 50 THEN
    RAISE EXCEPTION 'This campaign has too many reports awaiting review.';
  END IF;

  INSERT INTO "donate_private".campaign_abuse_reports
    (campaign_id, reason, details, contact, reporter_id, reporter_ip_hash)
  VALUES
    (p_campaign_id, p_reason, left(p_details, 2000), left(p_contact, 200),
     v_reporter, v_ip_hash)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text, p_turnstile_token text) OWNER TO postgres;

--
-- Name: resolve_campaign_abuse_report(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.resolve_campaign_abuse_report(p_report_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  UPDATE "donate_private".campaign_abuse_reports
  SET resolved_by = auth.uid(), resolved_at = NOW()
  WHERE id = p_report_id AND resolved_at IS NULL
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Report not found or already resolved';
  END IF;
  RETURN v_id;
END;
$$;


ALTER FUNCTION donate.resolve_campaign_abuse_report(p_report_id uuid) OWNER TO postgres;

--
-- Name: revoke_invite(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.revoke_invite(p_invite_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM invites i
    WHERE i.id = p_invite_id AND can_perform('invites:delete', i.organization_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM invites WHERE id = p_invite_id;
  RETURN true;
END;
$$;


ALTER FUNCTION donate.revoke_invite(p_invite_id uuid) OWNER TO postgres;

--
-- Name: revoke_system_admin(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.revoke_system_admin(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own system admin status';
  END IF;

  UPDATE profiles SET is_system_admin = false WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$;


ALTER FUNCTION donate.revoke_system_admin(target_user_id uuid) OWNER TO postgres;

--
-- Name: set_campaign_beneficiary(uuid, text, text, text, text, text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.set_campaign_beneficiary(p_campaign_id uuid, p_full_name text, p_relationship text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_national_id text DEFAULT NULL::text, p_document_url text DEFAULT NULL::text, p_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF NOT (can_perform('campaigns:update', v_org_id) OR is_system_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO campaign_beneficiary AS cb
    (campaign_id, full_name, relationship, phone, national_id, document_url, notes)
  VALUES
    (p_campaign_id, p_full_name, p_relationship, p_phone, p_national_id,
     p_document_url, p_notes)
  ON CONFLICT (campaign_id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      relationship = EXCLUDED.relationship,
      phone = EXCLUDED.phone,
      national_id = EXCLUDED.national_id,
      document_url = EXCLUDED.document_url,
      notes = EXCLUDED.notes,
      updated_at = NOW();
END;
$$;


ALTER FUNCTION donate.set_campaign_beneficiary(p_campaign_id uuid, p_full_name text, p_relationship text, p_phone text, p_national_id text, p_document_url text, p_notes text) OWNER TO postgres;

--
-- Name: set_campaign_payment_methods(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, boolean); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.set_campaign_payment_methods(p_campaign_id uuid, p_bkash_number text DEFAULT NULL::text, p_bkash_account_name text DEFAULT NULL::text, p_nagad_number text DEFAULT NULL::text, p_nagad_account_name text DEFAULT NULL::text, p_rocket_number text DEFAULT NULL::text, p_rocket_account_name text DEFAULT NULL::text, p_bank_name text DEFAULT NULL::text, p_bank_account_number text DEFAULT NULL::text, p_bank_account_name text DEFAULT NULL::text, p_bank_routing_number text DEFAULT NULL::text, p_bank_branch text DEFAULT NULL::text, p_donation_url text DEFAULT NULL::text, p_qr_image_url text DEFAULT NULL::text, p_instructions text DEFAULT NULL::text, p_is_preferred boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF NOT (can_perform('campaigns:update', v_org_id) OR is_system_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO campaign_payment_methods AS cpm
    (campaign_id, bkash_number, bkash_account_name, nagad_number,
     nagad_account_name, rocket_number, rocket_account_name, bank_name,
     bank_account_number, bank_account_name, bank_routing_number, bank_branch,
     donation_url, qr_image_url, instructions, is_preferred)
  VALUES
    (p_campaign_id, p_bkash_number, p_bkash_account_name, p_nagad_number,
     p_nagad_account_name, p_rocket_number, p_rocket_account_name, p_bank_name,
     p_bank_account_number, p_bank_account_name, p_bank_routing_number,
     p_bank_branch, p_donation_url, p_qr_image_url, p_instructions,
     p_is_preferred)
  ON CONFLICT (campaign_id) DO UPDATE
  SET bkash_number = EXCLUDED.bkash_number,
      bkash_account_name = EXCLUDED.bkash_account_name,
      nagad_number = EXCLUDED.nagad_number,
      nagad_account_name = EXCLUDED.nagad_account_name,
      rocket_number = EXCLUDED.rocket_number,
      rocket_account_name = EXCLUDED.rocket_account_name,
      bank_name = EXCLUDED.bank_name,
      bank_account_number = EXCLUDED.bank_account_number,
      bank_account_name = EXCLUDED.bank_account_name,
      bank_routing_number = EXCLUDED.bank_routing_number,
      bank_branch = EXCLUDED.bank_branch,
      donation_url = EXCLUDED.donation_url,
      qr_image_url = EXCLUDED.qr_image_url,
      instructions = EXCLUDED.instructions,
      is_preferred = EXCLUDED.is_preferred,
      updated_at = NOW();
END;
$$;


ALTER FUNCTION donate.set_campaign_payment_methods(p_campaign_id uuid, p_bkash_number text, p_bkash_account_name text, p_nagad_number text, p_nagad_account_name text, p_rocket_number text, p_rocket_account_name text, p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_bank_routing_number text, p_bank_branch text, p_donation_url text, p_qr_image_url text, p_instructions text, p_is_preferred boolean) OWNER TO postgres;

--
-- Name: set_campaign_tags(uuid, uuid[]); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.set_campaign_tags(p_campaign_id uuid, p_tag_ids uuid[]) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF NOT can_perform('campaigns:update', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM campaign_tag_map WHERE campaign_id = p_campaign_id;

  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    INSERT INTO campaign_tag_map (campaign_id, tag_id)
    SELECT p_campaign_id, unnest(p_tag_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN true;
END;
$$;


ALTER FUNCTION donate.set_campaign_tags(p_campaign_id uuid, p_tag_ids uuid[]) OWNER TO postgres;

--
-- Name: set_org_status(uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.set_org_status(p_org_id uuid, p_status text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  IF p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status: must be active or suspended';
  END IF;

  UPDATE organizations SET status = p_status WHERE id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  RETURN true;
END;
$$;


ALTER FUNCTION donate.set_org_status(p_org_id uuid, p_status text) OWNER TO postgres;

--
-- Name: set_system_admin(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.set_system_admin(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  UPDATE profiles SET is_system_admin = true WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$;


ALTER FUNCTION donate.set_system_admin(p_user_id uuid) OWNER TO postgres;

--
-- Name: submit_campaign_for_review(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.submit_campaign_for_review(p_campaign_id uuid) RETURNS SETOF donate_private.campaigns
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
  v_status campaign_status;
BEGIN
  SELECT org_id, status INTO v_org_id, v_status FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF v_status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'Only draft or rejected campaigns can be submitted';
  END IF;

  IF NOT can_perform('campaigns:update', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  UPDATE campaigns
  SET status = 'pending_review', updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$;


ALTER FUNCTION donate.submit_campaign_for_review(p_campaign_id uuid) OWNER TO postgres;

--
-- Name: submit_org_request(text, text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.submit_org_request(p_org_name text, p_org_slug text, p_org_description text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  INSERT INTO org_requests (user_id, org_name, org_slug, org_description)
  VALUES (auth.uid(), p_org_name, p_org_slug, p_org_description)
  RETURNING id;
$$;


ALTER FUNCTION donate.submit_org_request(p_org_name text, p_org_slug text, p_org_description text) OWNER TO postgres;

--
-- Name: subscribe_to_plan(uuid, uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.subscribe_to_plan(p_org_id uuid, p_plan_id uuid, p_billing_period text) RETURNS donate_private.organization_subscriptions
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_new_sub organization_subscriptions;
  v_plan subscription_plans;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Verify owner (owner-only via is_owner short-circuit in can_perform)
  IF NOT can_perform('subscription:manage', p_org_id) THEN
    RAISE EXCEPTION 'Only organization owners can subscribe to plans';
  END IF;

  -- Verify plan exists and is active
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = p_plan_id AND is_active = true;

  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Expire existing active subscription
  UPDATE organization_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE organization_id = p_org_id AND status = 'active';

  -- Calculate period end
  IF p_billing_period = 'yearly' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Create new subscription
  INSERT INTO organization_subscriptions (
    organization_id, plan_id, status, billing_period,
    current_period_start, current_period_end
  )
  VALUES (p_org_id, p_plan_id, 'active', p_billing_period, NOW(), v_period_end)
  RETURNING * INTO v_new_sub;

  -- Record history
  INSERT INTO subscription_history (organization_id, plan_id, action, amount, payment_status, notes)
  VALUES (
    p_org_id, p_plan_id, 'subscribed',
    CASE WHEN p_billing_period = 'yearly' THEN v_plan.price_yearly ELSE v_plan.price_monthly END,
    'paid',
    'Initial subscription to ' || v_plan.name
  );

  RETURN v_new_sub;
END;
$$;


ALTER FUNCTION donate.subscribe_to_plan(p_org_id uuid, p_plan_id uuid, p_billing_period text) OWNER TO postgres;

--
-- Name: sync_campaign_raised(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.sync_campaign_raised(p_campaign_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  UPDATE campaigns c
  SET raised_amount = COALESCE((
        SELECT SUM(amount) FROM donation_reports
        WHERE campaign_id = c.id AND status = 'confirmed'
      ), 0),
      updated_at = NOW()
  WHERE c.id = p_campaign_id;
$$;


ALTER FUNCTION donate.sync_campaign_raised(p_campaign_id uuid) OWNER TO postgres;

--
-- Name: unpause_subscription(uuid); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.unpause_subscription(p_org_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_sub organization_subscriptions%ROWTYPE;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can unpause subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'paused'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'No paused subscription found for this organization';
  END IF;

  UPDATE organization_subscriptions
  SET status = 'active', updated_at = NOW()
  WHERE id = v_sub.id;

  INSERT INTO subscription_history (organization_id, plan_id, action, notes)
  VALUES (p_org_id, v_sub.plan_id, 'renewed', 'Subscription unpaused by system admin');

  RETURN true;
END;
$$;


ALTER FUNCTION donate.unpause_subscription(p_org_id uuid) OWNER TO postgres;

--
-- Name: update_campaign(uuid, text, text, text, text, numeric, character varying, date, date, boolean, donate.campaign_status, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.update_campaign(p_campaign_id uuid, p_title text DEFAULT NULL::text, p_slug text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_cover_image_url text DEFAULT NULL::text, p_goal_amount numeric DEFAULT NULL::numeric, p_currency character varying DEFAULT NULL::character varying, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_is_zakat_eligible boolean DEFAULT NULL::boolean, p_status donate.campaign_status DEFAULT NULL::donate.campaign_status, p_address text DEFAULT NULL::text) RETURNS SETOF donate_private.campaigns
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_org_id UUID;
  v_status campaign_status;
BEGIN
  SELECT org_id, status INTO v_org_id, v_status FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  -- Only system admin may change status to/from live or rejected.
  IF p_status IS NOT NULL AND p_status <> v_status THEN
    IF NOT is_system_admin() THEN
      RAISE EXCEPTION 'Only a system admin may change campaign status';
    END IF;
  END IF;

  -- Members may edit non-published campaigns only.
  IF NOT is_system_admin() AND v_status IN ('live', 'rejected') THEN
    RAISE EXCEPTION 'Cannot edit a published or rejected campaign';
  END IF;

  IF NOT can_perform('campaigns:update', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  UPDATE campaigns
  SET
    title = COALESCE(p_title, title),
    slug = COALESCE(p_slug, slug),
    description = COALESCE(p_description, description),
    cover_image_url = COALESCE(p_cover_image_url, cover_image_url),
    goal_amount = COALESCE(p_goal_amount, goal_amount),
    currency = COALESCE(p_currency, currency),
    start_date = COALESCE(p_start_date, start_date),
    end_date = COALESCE(p_end_date, end_date),
    is_zakat_eligible = COALESCE(p_is_zakat_eligible, is_zakat_eligible),
    status = COALESCE(p_status, status),
    updated_at = NOW(),
    address = p_address
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$;


ALTER FUNCTION donate.update_campaign(p_campaign_id uuid, p_title text, p_slug text, p_description text, p_cover_image_url text, p_goal_amount numeric, p_currency character varying, p_start_date date, p_end_date date, p_is_zakat_eligible boolean, p_status donate.campaign_status, p_address text) OWNER TO postgres;

--
-- Name: update_member_role(uuid, uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.update_member_role(target_org_id uuid, target_user_id uuid, new_role text) RETURNS SETOF donate_private.member_view
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('members:update', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE organization_members SET role = new_role, updated_at = NOW()
  WHERE organization_id = target_org_id AND user_id = target_user_id;

  RETURN QUERY SELECT * FROM member_view WHERE organization_id = target_org_id AND user_id = target_user_id;
END;
$$;


ALTER FUNCTION donate.update_member_role(target_org_id uuid, target_user_id uuid, new_role text) OWNER TO postgres;

--
-- Name: update_my_profile(text, text, jsonb); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.update_my_profile(new_full_name text DEFAULT NULL::text, new_avatar_url text DEFAULT NULL::text, new_metadata jsonb DEFAULT NULL::jsonb) RETURNS SETOF donate_private.profile_view
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  UPDATE profiles
  SET
    full_name = COALESCE(new_full_name, full_name),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    metadata = COALESCE(new_metadata, metadata),
    updated_at = NOW()
  WHERE id = auth.uid();

  RETURN QUERY SELECT * FROM profile_view WHERE id = auth.uid();
END;
$$;


ALTER FUNCTION donate.update_my_profile(new_full_name text, new_avatar_url text, new_metadata jsonb) OWNER TO postgres;

--
-- Name: update_org_meta(uuid, text, text, text, text, text, text, text, jsonb, jsonb); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.update_org_meta(p_org_id uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_logo_url text DEFAULT NULL::text, p_website_url text DEFAULT NULL::text, p_contact_email text DEFAULT NULL::text, p_contact_phone text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_social_links jsonb DEFAULT NULL::jsonb, p_settings jsonb DEFAULT NULL::jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('org:update', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE org_meta SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    logo_url = COALESCE(p_logo_url, logo_url),
    website_url = COALESCE(p_website_url, website_url),
    contact_email = COALESCE(p_contact_email, contact_email),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    address = COALESCE(p_address, address),
    social_links = COALESCE(p_social_links, social_links),
    settings = COALESCE(p_settings, settings),
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE organization_id = p_org_id;

  IF NOT FOUND THEN
    -- Baseline row seeded from the organizations record so the editor has
    -- something coherent to upsert against.
    INSERT INTO org_meta (organization_id, name, description, updated_by)
    SELECT o.id, o.name, o.description, auth.uid()
    FROM organizations o WHERE o.id = p_org_id;
  END IF;

  RETURN true;
END;
$$;


ALTER FUNCTION donate.update_org_meta(p_org_id uuid, p_name text, p_description text, p_logo_url text, p_website_url text, p_contact_email text, p_contact_phone text, p_address text, p_social_links jsonb, p_settings jsonb) OWNER TO postgres;

--
-- Name: update_organization(uuid, text, text, text, jsonb); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.update_organization(target_org_id uuid, new_name text DEFAULT NULL::text, new_slug text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_settings jsonb DEFAULT NULL::jsonb) RETURNS SETOF donate_private.organization_view
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT can_perform('org:update', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE organizations
  SET
    name = COALESCE(new_name, name),
    slug = COALESCE(new_slug, slug),
    description = COALESCE(new_description, description),
    settings = COALESCE(new_settings, settings),
    updated_at = NOW()
  WHERE id = target_org_id;

  RETURN QUERY SELECT * FROM organization_view WHERE id = target_org_id;
END;
$$;


ALTER FUNCTION donate.update_organization(target_org_id uuid, new_name text, new_slug text, new_description text, new_settings jsonb) OWNER TO postgres;

--
-- Name: update_subscription_plan(uuid, text, text, numeric, numeric, jsonb, boolean); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.update_subscription_plan(p_plan_id uuid, p_name text, p_description text, p_price_monthly numeric, p_price_yearly numeric, p_features jsonb, p_is_active boolean) RETURNS donate_private.subscription_plans
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  updated_plan subscription_plans;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can update subscription plans';
  END IF;

  UPDATE subscription_plans
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    price_monthly = COALESCE(p_price_monthly, price_monthly),
    price_yearly = COALESCE(p_price_yearly, price_yearly),
    features = COALESCE(p_features, features),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_plan_id
  RETURNING * INTO updated_plan;

  IF updated_plan IS NULL THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  RETURN updated_plan;
END;
$$;


ALTER FUNCTION donate.update_subscription_plan(p_plan_id uuid, p_name text, p_description text, p_price_monthly numeric, p_price_yearly numeric, p_features jsonb, p_is_active boolean) OWNER TO postgres;

--
-- Name: update_todo(uuid, text, text, boolean); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.update_todo(p_todo_id uuid, p_title text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_completed boolean DEFAULT NULL::boolean) RETURNS SETOF donate_private.todos
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  UPDATE todos
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    completed = COALESCE(p_completed, completed),
    updated_at = NOW()
  WHERE id = p_todo_id
  AND can_perform('todos:update', todos.organization_id);

  RETURN QUERY SELECT * FROM todos WHERE id = p_todo_id;
END;
$$;


ALTER FUNCTION donate.update_todo(p_todo_id uuid, p_title text, p_description text, p_completed boolean) OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION donate.update_updated_at_column() OWNER TO postgres;

--
-- Name: upsert_donation_methods(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, boolean); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.upsert_donation_methods(p_org_id uuid, p_bkash_number text DEFAULT NULL::text, p_bkash_account_name text DEFAULT NULL::text, p_nagad_number text DEFAULT NULL::text, p_nagad_account_name text DEFAULT NULL::text, p_rocket_number text DEFAULT NULL::text, p_rocket_account_name text DEFAULT NULL::text, p_bank_name text DEFAULT NULL::text, p_bank_account_number text DEFAULT NULL::text, p_bank_account_name text DEFAULT NULL::text, p_bank_routing_number text DEFAULT NULL::text, p_bank_branch text DEFAULT NULL::text, p_donation_url text DEFAULT NULL::text, p_qr_image_url text DEFAULT NULL::text, p_instructions text DEFAULT NULL::text, p_is_preferred boolean DEFAULT false) RETURNS SETOF donate_private.donation_methods
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT can_perform('campaigns:update', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO v_id FROM donation_methods WHERE organization_id = p_org_id;

  IF v_id IS NULL THEN
    RETURN QUERY
    INSERT INTO donation_methods (
      organization_id, bkash_number, bkash_account_name, nagad_number, nagad_account_name,
      rocket_number, rocket_account_name, bank_name, bank_account_number, bank_account_name,
      bank_routing_number, bank_branch, donation_url, qr_image_url, instructions, is_preferred
    )
    VALUES (
      p_org_id, p_bkash_number, p_bkash_account_name, p_nagad_number, p_nagad_account_name,
      p_rocket_number, p_rocket_account_name, p_bank_name, p_bank_account_number, p_bank_account_name,
      p_bank_routing_number, p_bank_branch, p_donation_url, p_qr_image_url, p_instructions, p_is_preferred
    )
    RETURNING *;
  ELSE
    RETURN QUERY
    UPDATE donation_methods
    SET
      bkash_number = COALESCE(p_bkash_number, bkash_number),
      bkash_account_name = COALESCE(p_bkash_account_name, bkash_account_name),
      nagad_number = COALESCE(p_nagad_number, nagad_number),
      nagad_account_name = COALESCE(p_nagad_account_name, nagad_account_name),
      rocket_number = COALESCE(p_rocket_number, rocket_number),
      rocket_account_name = COALESCE(p_rocket_account_name, rocket_account_name),
      bank_name = COALESCE(p_bank_name, bank_name),
      bank_account_number = COALESCE(p_bank_account_number, bank_account_number),
      bank_account_name = COALESCE(p_bank_account_name, bank_account_name),
      bank_routing_number = COALESCE(p_bank_routing_number, bank_routing_number),
      bank_branch = COALESCE(p_bank_branch, bank_branch),
      donation_url = COALESCE(p_donation_url, donation_url),
      qr_image_url = COALESCE(p_qr_image_url, qr_image_url),
      instructions = COALESCE(p_instructions, instructions),
      is_preferred = COALESCE(p_is_preferred, is_preferred),
      updated_at = NOW()
    WHERE id = v_id
    RETURNING *;
  END IF;
END;
$$;


ALTER FUNCTION donate.upsert_donation_methods(p_org_id uuid, p_bkash_number text, p_bkash_account_name text, p_nagad_number text, p_nagad_account_name text, p_rocket_number text, p_rocket_account_name text, p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_bank_routing_number text, p_bank_branch text, p_donation_url text, p_qr_image_url text, p_instructions text, p_is_preferred boolean) OWNER TO postgres;

--
-- Name: validate_invite(text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.validate_invite(p_token text, p_email text) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT o.name
  FROM invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = p_token
    AND lower(i.email) = lower(p_email)
    AND i.accepted_at IS NULL
    AND i.expires_at > NOW()
$$;


ALTER FUNCTION donate.validate_invite(p_token text, p_email text) OWNER TO postgres;

--
-- Name: verify_campaign(uuid, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.verify_campaign(p_campaign_id uuid, p_notes text DEFAULT NULL::text) RETURNS SETOF donate_private.campaigns
    LANGUAGE plpgsql
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY
  UPDATE campaigns
  SET
    status = 'live',
    verified_by = auth.uid(),
    verified_at = NOW(),
    verification_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$;


ALTER FUNCTION donate.verify_campaign(p_campaign_id uuid, p_notes text) OWNER TO postgres;

--
-- Name: verify_turnstile(text, text); Type: FUNCTION; Schema: donate; Owner: postgres
--

CREATE FUNCTION donate.verify_turnstile(p_token text, p_remoteip text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
DECLARE
  secret TEXT;
  response http_response;
BEGIN
  SELECT value INTO secret
  FROM "donate_private".platform_settings WHERE key = 'turnstile_secret_key';
  IF secret IS NULL OR secret = '' THEN
    RETURN true; -- verification not configured (dev/e2e)
  END IF;

  BEGIN
    SELECT http INTO response
    FROM http_post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'secret=' || secret
        || '&response=' || COALESCE(p_token, '')
        || COALESCE('&remoteip=' || p_remoteip, ''),
      'application/x-www-form-urlencoded'
    );
    RETURN COALESCE((response.content::jsonb ->> 'success')::boolean, false);
  EXCEPTION WHEN OTHERS THEN
    -- Fail closed: an unreachable verifier must not open the gate.
    RETURN false;
  END;
END;
$$;


ALTER FUNCTION donate.verify_turnstile(p_token text, p_remoteip text) OWNER TO postgres;

--
-- Name: get_user_org_ids(); Type: FUNCTION; Schema: donate_private; Owner: postgres
--

CREATE FUNCTION donate_private.get_user_org_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT organization_id
  FROM "donate_private".organization_members
  WHERE user_id = auth.uid()
    AND status = 'active'
$$;


ALTER FUNCTION donate_private.get_user_org_ids() OWNER TO postgres;

--
-- Name: rls_has_role_permission(uuid, text); Type: FUNCTION; Schema: donate_private; Owner: postgres
--

CREATE FUNCTION donate_private.rls_has_role_permission(p_org_id uuid, p_permission text) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    JOIN role_permissions rp ON rp.role = om.role
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND rp.permission IN (p_permission, '*')
  );
$$;


ALTER FUNCTION donate_private.rls_has_role_permission(p_org_id uuid, p_permission text) OWNER TO postgres;

--
-- Name: rls_is_active_member(uuid); Type: FUNCTION; Schema: donate_private; Owner: postgres
--

CREATE FUNCTION donate_private.rls_is_active_member(p_org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  -- Own membership row: permitted by organization_members' self-row policy
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;


ALTER FUNCTION donate_private.rls_is_active_member(p_org_id uuid) OWNER TO postgres;

--
-- Name: rls_is_owner(uuid); Type: FUNCTION; Schema: donate_private; Owner: postgres
--

CREATE FUNCTION donate_private.rls_is_owner(p_org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND is_owner = true
  );
$$;


ALTER FUNCTION donate_private.rls_is_owner(p_org_id uuid) OWNER TO postgres;

--
-- Name: rls_is_system_admin(); Type: FUNCTION; Schema: donate_private; Owner: postgres
--

CREATE FUNCTION donate_private.rls_is_system_admin() RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  -- Reads the CALLER'S OWN profile row (permitted by profiles' own-row policy)
  SELECT COALESCE(
    (SELECT is_system_admin FROM profiles WHERE id = auth.uid()), false
  );
$$;


ALTER FUNCTION donate_private.rls_is_system_admin() OWNER TO postgres;

--
-- Name: rls_org_status(uuid); Type: FUNCTION; Schema: donate_private; Owner: postgres
--

CREATE FUNCTION donate_private.rls_org_status(p_org_id uuid) RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT status FROM organizations WHERE id = p_org_id;
$$;


ALTER FUNCTION donate_private.rls_org_status(p_org_id uuid) OWNER TO postgres;

--
-- Name: rls_uid(); Type: FUNCTION; Schema: donate_private; Owner: postgres
--

CREATE FUNCTION donate_private.rls_uid() RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path TO 'donate', 'donate_private', 'shared', 'extensions'
    AS $$
  SELECT auth.uid();
$$;


ALTER FUNCTION donate_private.rls_uid() OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    action text NOT NULL,
    resource_type text,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.audit_logs OWNER TO postgres;

--
-- Name: campaign_abuse_reports; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.campaign_abuse_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    contact text,
    reporter_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    reporter_ip_hash text,
    CONSTRAINT campaign_abuse_reports_reason_check CHECK ((reason = ANY (ARRAY['fraud'::text, 'misleading'::text, 'completed'::text, 'other'::text])))
);


ALTER TABLE donate_private.campaign_abuse_reports OWNER TO postgres;

--
-- Name: campaign_beneficiary; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.campaign_beneficiary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    full_name text NOT NULL,
    relationship text,
    phone text,
    national_id text,
    document_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.campaign_beneficiary OWNER TO postgres;

--
-- Name: campaign_payment_methods; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.campaign_payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    bkash_number text,
    bkash_account_name text,
    nagad_number text,
    nagad_account_name text,
    rocket_number text,
    rocket_account_name text,
    bank_name text,
    bank_account_number text,
    bank_account_name text,
    bank_routing_number text,
    bank_branch text,
    donation_url text,
    qr_image_url text,
    instructions text,
    is_preferred boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.campaign_payment_methods OWNER TO postgres;

--
-- Name: campaign_tag_map; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.campaign_tag_map (
    campaign_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.campaign_tag_map OWNER TO postgres;

--
-- Name: donation_reports; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.donation_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    org_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    currency character varying(3) NOT NULL,
    method text DEFAULT 'other'::text NOT NULL,
    reference text,
    donor_name text,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    reporter_ip_hash text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_note text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT donation_reports_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT donation_reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text])))
);


ALTER TABLE donate_private.donation_reports OWNER TO postgres;

--
-- Name: org_requests; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.org_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    org_name text NOT NULL,
    org_slug text NOT NULL,
    org_description text,
    status text DEFAULT 'pending'::text,
    rejection_reason text,
    requested_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_org_id uuid
);


ALTER TABLE donate_private.org_requests OWNER TO postgres;

--
-- Name: organization_detail_view; Type: VIEW; Schema: donate_private; Owner: postgres
--

CREATE VIEW donate_private.organization_detail_view AS
 SELECT o.id,
    o.name,
    o.slug,
    o.logo_url,
    o.description,
    o.settings,
    o.created_at,
    o.updated_at,
    count(DISTINCT om.user_id) AS member_count
   FROM (donate_private.organizations o
     LEFT JOIN donate_private.organization_members om ON (((o.id = om.organization_id) AND (om.status = 'active'::text))))
  GROUP BY o.id, o.name, o.slug, o.logo_url, o.description, o.settings, o.created_at, o.updated_at;


ALTER VIEW donate_private.organization_detail_view OWNER TO postgres;

--
-- Name: platform_settings; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.platform_settings (
    key text NOT NULL,
    value text DEFAULT ''::text NOT NULL
);


ALTER TABLE donate_private.platform_settings OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    permission text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_system_role boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.roles OWNER TO postgres;

--
-- Name: role_view; Type: VIEW; Schema: donate_private; Owner: postgres
--

CREATE VIEW donate_private.role_view AS
 SELECT id,
    name,
    description,
    is_system_role,
    created_at
   FROM donate_private.roles r;


ALTER VIEW donate_private.role_view OWNER TO postgres;

--
-- Name: subscription_history; Type: TABLE; Schema: donate_private; Owner: postgres
--

CREATE TABLE donate_private.subscription_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    action text NOT NULL,
    amount numeric DEFAULT 0,
    payment_status text DEFAULT 'paid'::text,
    invoice_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE donate_private.subscription_history OWNER TO postgres;

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: campaign_abuse_reports campaign_abuse_reports_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_abuse_reports
    ADD CONSTRAINT campaign_abuse_reports_pkey PRIMARY KEY (id);


--
-- Name: campaign_beneficiary campaign_beneficiary_campaign_id_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_beneficiary
    ADD CONSTRAINT campaign_beneficiary_campaign_id_key UNIQUE (campaign_id);


--
-- Name: campaign_beneficiary campaign_beneficiary_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_beneficiary
    ADD CONSTRAINT campaign_beneficiary_pkey PRIMARY KEY (id);


--
-- Name: campaign_payment_methods campaign_payment_methods_campaign_id_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_payment_methods
    ADD CONSTRAINT campaign_payment_methods_campaign_id_key UNIQUE (campaign_id);


--
-- Name: campaign_payment_methods campaign_payment_methods_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_payment_methods
    ADD CONSTRAINT campaign_payment_methods_pkey PRIMARY KEY (id);


--
-- Name: campaign_tag_map campaign_tag_map_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_tag_map
    ADD CONSTRAINT campaign_tag_map_pkey PRIMARY KEY (campaign_id, tag_id);


--
-- Name: campaign_tags campaign_tags_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_tags
    ADD CONSTRAINT campaign_tags_pkey PRIMARY KEY (id);


--
-- Name: campaign_tags campaign_tags_slug_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_tags
    ADD CONSTRAINT campaign_tags_slug_key UNIQUE (slug);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_slug_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaigns
    ADD CONSTRAINT campaigns_slug_key UNIQUE (slug);


--
-- Name: donation_methods donation_methods_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.donation_methods
    ADD CONSTRAINT donation_methods_pkey PRIMARY KEY (id);


--
-- Name: donation_reports donation_reports_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.donation_reports
    ADD CONSTRAINT donation_reports_pkey PRIMARY KEY (id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: invites invites_token_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.invites
    ADD CONSTRAINT invites_token_key UNIQUE (token);


--
-- Name: org_meta org_meta_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.org_meta
    ADD CONSTRAINT org_meta_pkey PRIMARY KEY (organization_id);


--
-- Name: org_requests org_requests_org_slug_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.org_requests
    ADD CONSTRAINT org_requests_org_slug_key UNIQUE (org_slug);


--
-- Name: org_requests org_requests_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.org_requests
    ADD CONSTRAINT org_requests_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organization_subscriptions organization_subscriptions_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organization_subscriptions
    ADD CONSTRAINT organization_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (key);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_permission_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.role_permissions
    ADD CONSTRAINT role_permissions_role_permission_key UNIQUE (role, permission);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: subscription_history subscription_history_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.subscription_history
    ADD CONSTRAINT subscription_history_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON donate_private.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON donate_private.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_org_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_audit_logs_org_id ON donate_private.audit_logs USING btree (organization_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON donate_private.audit_logs USING btree (user_id);


--
-- Name: idx_campaign_tag_map_campaign_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_campaign_tag_map_campaign_id ON donate_private.campaign_tag_map USING btree (campaign_id);


--
-- Name: idx_campaign_tag_map_tag_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_campaign_tag_map_tag_id ON donate_private.campaign_tag_map USING btree (tag_id);


--
-- Name: idx_campaign_tags_slug; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_campaign_tags_slug ON donate_private.campaign_tags USING btree (slug);


--
-- Name: idx_campaigns_created_at; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_campaigns_created_at ON donate_private.campaigns USING btree (created_at DESC);


--
-- Name: idx_campaigns_org_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_campaigns_org_id ON donate_private.campaigns USING btree (org_id);


--
-- Name: idx_campaigns_slug; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_campaigns_slug ON donate_private.campaigns USING btree (slug);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_campaigns_status ON donate_private.campaigns USING btree (status);


--
-- Name: idx_campaigns_updated_at; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_campaigns_updated_at ON donate_private.campaigns USING btree (updated_at DESC);


--
-- Name: idx_campaigns_zakat; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_campaigns_zakat ON donate_private.campaigns USING btree (is_zakat_eligible);


--
-- Name: idx_donation_methods_org_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_donation_methods_org_id ON donate_private.donation_methods USING btree (organization_id);


--
-- Name: idx_donation_reports_campaign_status; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_donation_reports_campaign_status ON donate_private.donation_reports USING btree (campaign_id, status);


--
-- Name: idx_donation_reports_ip_created; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_donation_reports_ip_created ON donate_private.donation_reports USING btree (reporter_ip_hash, created_at);


--
-- Name: idx_invites_email; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_invites_email ON donate_private.invites USING btree (email);


--
-- Name: idx_invites_organization_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_invites_organization_id ON donate_private.invites USING btree (organization_id);


--
-- Name: idx_invites_token; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_invites_token ON donate_private.invites USING btree (token);


--
-- Name: idx_organization_members_org_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_organization_members_org_id ON donate_private.organization_members USING btree (organization_id);


--
-- Name: idx_organization_members_status; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_organization_members_status ON donate_private.organization_members USING btree (status);


--
-- Name: idx_organization_members_user_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_organization_members_user_id ON donate_private.organization_members USING btree (user_id);


--
-- Name: idx_organization_subscriptions_org_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_organization_subscriptions_org_id ON donate_private.organization_subscriptions USING btree (organization_id);


--
-- Name: idx_organization_subscriptions_plan_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_organization_subscriptions_plan_id ON donate_private.organization_subscriptions USING btree (plan_id);


--
-- Name: idx_organization_subscriptions_status; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_organization_subscriptions_status ON donate_private.organization_subscriptions USING btree (status);


--
-- Name: idx_organizations_slug; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_organizations_slug ON donate_private.organizations USING btree (slug);


--
-- Name: idx_role_permissions_permission; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_role_permissions_permission ON donate_private.role_permissions USING btree (permission);


--
-- Name: idx_role_permissions_role; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_role_permissions_role ON donate_private.role_permissions USING btree (role);


--
-- Name: idx_subscription_history_created_at; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_subscription_history_created_at ON donate_private.subscription_history USING btree (created_at);


--
-- Name: idx_subscription_history_org_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_subscription_history_org_id ON donate_private.subscription_history USING btree (organization_id);


--
-- Name: idx_subscription_history_plan_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_subscription_history_plan_id ON donate_private.subscription_history USING btree (plan_id);


--
-- Name: idx_subscription_plans_is_active; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_subscription_plans_is_active ON donate_private.subscription_plans USING btree (is_active);


--
-- Name: idx_todos_created_by; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_todos_created_by ON donate_private.todos USING btree (created_by);


--
-- Name: idx_todos_organization_id; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE INDEX idx_todos_organization_id ON donate_private.todos USING btree (organization_id);


--
-- Name: uq_personal_org_per_user; Type: INDEX; Schema: donate_private; Owner: postgres
--

CREATE UNIQUE INDEX uq_personal_org_per_user ON donate_private.organizations USING btree (created_by) WHERE (kind = 'personal'::text);


--
-- Name: donation_reports audit_donation_reports_changes; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER audit_donation_reports_changes AFTER INSERT OR DELETE OR UPDATE ON donate_private.donation_reports FOR EACH ROW EXECUTE FUNCTION donate.audit_table_changes();


--
-- Name: organization_members audit_organization_members_changes; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER audit_organization_members_changes AFTER INSERT OR DELETE OR UPDATE ON donate_private.organization_members FOR EACH ROW EXECUTE FUNCTION donate.audit_table_changes();


--
-- Name: organizations audit_organizations_changes; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER audit_organizations_changes AFTER INSERT OR DELETE OR UPDATE ON donate_private.organizations FOR EACH ROW EXECUTE FUNCTION donate.audit_table_changes();


--
-- Name: organizations trg_attach_default_plan; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER trg_attach_default_plan AFTER INSERT ON donate_private.organizations FOR EACH ROW EXECUTE FUNCTION donate.attach_default_plan();


--
-- Name: campaigns update_campaigns_updated_at; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON donate_private.campaigns FOR EACH ROW EXECUTE FUNCTION donate.update_updated_at_column();


--
-- Name: donation_methods update_donation_methods_updated_at; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER update_donation_methods_updated_at BEFORE UPDATE ON donate_private.donation_methods FOR EACH ROW EXECUTE FUNCTION donate.update_updated_at_column();


--
-- Name: donation_reports update_donation_reports_updated_at; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER update_donation_reports_updated_at BEFORE UPDATE ON donate_private.donation_reports FOR EACH ROW EXECUTE FUNCTION donate.update_updated_at_column();


--
-- Name: organization_members update_organization_members_updated_at; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON donate_private.organization_members FOR EACH ROW EXECUTE FUNCTION donate.update_updated_at_column();


--
-- Name: organization_subscriptions update_organization_subscriptions_updated_at; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER update_organization_subscriptions_updated_at BEFORE UPDATE ON donate_private.organization_subscriptions FOR EACH ROW EXECUTE FUNCTION donate.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON donate_private.organizations FOR EACH ROW EXECUTE FUNCTION donate.update_updated_at_column();


--
-- Name: subscription_plans update_subscription_plans_updated_at; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON donate_private.subscription_plans FOR EACH ROW EXECUTE FUNCTION donate.update_updated_at_column();


--
-- Name: todos update_todos_updated_at; Type: TRIGGER; Schema: donate_private; Owner: postgres
--

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON donate_private.todos FOR EACH ROW EXECUTE FUNCTION donate.update_updated_at_column();


--
-- Name: audit_logs audit_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.audit_logs
    ADD CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES donate_private.organizations(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES shared.profiles(id) ON DELETE SET NULL;


--
-- Name: campaign_abuse_reports campaign_abuse_reports_campaign_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_abuse_reports
    ADD CONSTRAINT campaign_abuse_reports_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES donate_private.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_abuse_reports campaign_abuse_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_abuse_reports
    ADD CONSTRAINT campaign_abuse_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES shared.profiles(id) ON DELETE SET NULL;


--
-- Name: campaign_abuse_reports campaign_abuse_reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_abuse_reports
    ADD CONSTRAINT campaign_abuse_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES shared.profiles(id) ON DELETE SET NULL;


--
-- Name: campaign_beneficiary campaign_beneficiary_campaign_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_beneficiary
    ADD CONSTRAINT campaign_beneficiary_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES donate_private.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_payment_methods campaign_payment_methods_campaign_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_payment_methods
    ADD CONSTRAINT campaign_payment_methods_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES donate_private.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_tag_map campaign_tag_map_campaign_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_tag_map
    ADD CONSTRAINT campaign_tag_map_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES donate_private.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_tag_map campaign_tag_map_tag_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaign_tag_map
    ADD CONSTRAINT campaign_tag_map_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES donate_private.campaign_tags(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaigns
    ADD CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES shared.profiles(id);


--
-- Name: campaigns campaigns_org_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaigns
    ADD CONSTRAINT campaigns_org_id_fkey FOREIGN KEY (org_id) REFERENCES donate_private.organizations(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_verified_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.campaigns
    ADD CONSTRAINT campaigns_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES shared.profiles(id);


--
-- Name: donation_methods donation_methods_organization_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.donation_methods
    ADD CONSTRAINT donation_methods_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES donate_private.organizations(id) ON DELETE CASCADE;


--
-- Name: donation_reports donation_reports_campaign_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.donation_reports
    ADD CONSTRAINT donation_reports_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES donate_private.campaigns(id) ON DELETE CASCADE;


--
-- Name: donation_reports donation_reports_org_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.donation_reports
    ADD CONSTRAINT donation_reports_org_id_fkey FOREIGN KEY (org_id) REFERENCES donate_private.organizations(id) ON DELETE CASCADE;


--
-- Name: donation_reports donation_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.donation_reports
    ADD CONSTRAINT donation_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES shared.profiles(id);


--
-- Name: invites invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.invites
    ADD CONSTRAINT invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES shared.profiles(id);


--
-- Name: invites invites_organization_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.invites
    ADD CONSTRAINT invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES donate_private.organizations(id) ON DELETE CASCADE;


--
-- Name: org_meta org_meta_organization_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.org_meta
    ADD CONSTRAINT org_meta_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES donate_private.organizations(id) ON DELETE CASCADE;


--
-- Name: org_meta org_meta_updated_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.org_meta
    ADD CONSTRAINT org_meta_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES shared.profiles(id) ON DELETE SET NULL;


--
-- Name: org_requests org_requests_created_org_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.org_requests
    ADD CONSTRAINT org_requests_created_org_id_fkey FOREIGN KEY (created_org_id) REFERENCES donate_private.organizations(id) ON DELETE SET NULL;


--
-- Name: org_requests org_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.org_requests
    ADD CONSTRAINT org_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES shared.profiles(id) ON DELETE SET NULL;


--
-- Name: org_requests org_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.org_requests
    ADD CONSTRAINT org_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES shared.profiles(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organization_members
    ADD CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES shared.profiles(id);


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES donate_private.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES shared.profiles(id) ON DELETE CASCADE;


--
-- Name: organization_subscriptions organization_subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organization_subscriptions
    ADD CONSTRAINT organization_subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES donate_private.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_subscriptions organization_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organization_subscriptions
    ADD CONSTRAINT organization_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES donate_private.subscription_plans(id);


--
-- Name: organizations organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES shared.profiles(id);


--
-- Name: role_permissions role_permissions_role_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.role_permissions
    ADD CONSTRAINT role_permissions_role_fkey FOREIGN KEY (role) REFERENCES donate_private.roles(name) ON DELETE CASCADE;


--
-- Name: subscription_history subscription_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.subscription_history
    ADD CONSTRAINT subscription_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES donate_private.organizations(id) ON DELETE CASCADE;


--
-- Name: subscription_history subscription_history_plan_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.subscription_history
    ADD CONSTRAINT subscription_history_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES donate_private.subscription_plans(id);


--
-- Name: todos todos_created_by_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.todos
    ADD CONSTRAINT todos_created_by_fkey FOREIGN KEY (created_by) REFERENCES shared.profiles(id);


--
-- Name: todos todos_organization_id_fkey; Type: FK CONSTRAINT; Schema: donate_private; Owner: postgres
--

ALTER TABLE ONLY donate_private.todos
    ADD CONSTRAINT todos_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES donate_private.organizations(id) ON DELETE CASCADE;


--
-- Name: invites Admins can create invites; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Admins can create invites" ON donate_private.invites FOR INSERT WITH CHECK (donate.can_perform('invites:create'::text, organization_id));


--
-- Name: invites Admins can delete invites; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Admins can delete invites" ON donate_private.invites FOR DELETE USING (donate.can_perform('invites:delete'::text, organization_id));


--
-- Name: organization_members Admins can delete members; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Admins can delete members" ON donate_private.organization_members FOR DELETE USING (donate.can_perform('members:delete'::text, organization_id));


--
-- Name: organizations Admins can delete organizations; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Admins can delete organizations" ON donate_private.organizations FOR DELETE USING (donate.can_perform('org:delete'::text, id));


--
-- Name: organization_members Admins can insert members; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Admins can insert members" ON donate_private.organization_members FOR INSERT WITH CHECK (donate.can_perform('members:create'::text, organization_id));


--
-- Name: organization_members Admins can update members; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Admins can update members" ON donate_private.organization_members FOR UPDATE USING (donate.can_perform('members:update'::text, organization_id));


--
-- Name: organizations Admins can update organizations; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Admins can update organizations" ON donate_private.organizations FOR UPDATE USING (donate.can_perform('org:update'::text, id));


--
-- Name: campaigns Anon can view live campaigns; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Anon can view live campaigns" ON donate_private.campaigns FOR SELECT TO anon USING (((status = 'live'::donate.campaign_status) AND (is_active = true)));


--
-- Name: campaign_tags Authenticated can read campaign_tags; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Authenticated can read campaign_tags" ON donate_private.campaign_tags FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: role_permissions Authenticated can read role_permissions; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Authenticated can read role_permissions" ON donate_private.role_permissions FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: campaigns Members can create campaigns; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can create campaigns" ON donate_private.campaigns FOR INSERT TO authenticated WITH CHECK (donate.can_perform('campaigns:create'::text, org_id));


--
-- Name: todos Members can create todos; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can create todos" ON donate_private.todos FOR INSERT WITH CHECK (donate.can_perform('todos:create'::text, organization_id));


--
-- Name: campaigns Members can delete campaigns; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can delete campaigns" ON donate_private.campaigns FOR DELETE TO authenticated USING (donate.can_perform('campaigns:delete'::text, org_id));


--
-- Name: todos Members can delete todos; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can delete todos" ON donate_private.todos FOR DELETE USING (donate.can_perform('todos:delete'::text, organization_id));


--
-- Name: campaign_tag_map Members can manage campaign_tag_map; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can manage campaign_tag_map" ON donate_private.campaign_tag_map TO authenticated USING (donate.can_perform('campaigns:update'::text, ( SELECT campaigns.org_id
   FROM donate_private.campaigns
  WHERE (campaigns.id = campaign_tag_map.campaign_id)))) WITH CHECK (donate.can_perform('campaigns:update'::text, ( SELECT campaigns.org_id
   FROM donate_private.campaigns
  WHERE (campaigns.id = campaign_tag_map.campaign_id))));


--
-- Name: donation_methods Members can manage donation_methods; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can manage donation_methods" ON donate_private.donation_methods TO authenticated USING (donate.can_perform('campaigns:update'::text, organization_id)) WITH CHECK (donate.can_perform('campaigns:update'::text, organization_id));


--
-- Name: org_meta Members can read their org metadata; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can read their org metadata" ON donate_private.org_meta FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM donate_private.organization_members
  WHERE ((organization_members.organization_id = org_meta.organization_id) AND (organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text)))));


--
-- Name: campaigns Members can update campaigns; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can update campaigns" ON donate_private.campaigns FOR UPDATE TO authenticated USING (donate.can_perform('campaigns:update'::text, org_id)) WITH CHECK (donate.can_perform('campaigns:update'::text, org_id));


--
-- Name: todos Members can update todos; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can update todos" ON donate_private.todos FOR UPDATE USING (donate.can_perform('todos:update'::text, organization_id));


--
-- Name: campaign_tag_map Members can view campaign_tag_map; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can view campaign_tag_map" ON donate_private.campaign_tag_map FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM donate_private.campaigns c
  WHERE ((c.id = campaign_tag_map.campaign_id) AND donate_private.rls_is_active_member(c.org_id)))) OR donate_private.rls_is_system_admin()));


--
-- Name: campaigns Members can view campaigns; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can view campaigns" ON donate_private.campaigns FOR SELECT TO authenticated USING ((donate_private.rls_is_active_member(org_id) OR donate_private.rls_is_system_admin()));


--
-- Name: donation_methods Members can view donation_methods; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can view donation_methods" ON donate_private.donation_methods FOR SELECT TO authenticated USING ((donate_private.rls_is_active_member(organization_id) OR donate_private.rls_is_system_admin()));


--
-- Name: organizations Members can view organizations; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can view organizations" ON donate_private.organizations FOR SELECT TO authenticated USING (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM donate_private.organization_members om
  WHERE ((om.organization_id = organizations.id) AND (om.user_id = auth.uid()) AND (om.status = 'active'::text)))) OR (EXISTS ( SELECT 1
   FROM shared.profiles me
  WHERE ((me.id = auth.uid()) AND me.is_system_admin)))));


--
-- Name: organization_members Members can view own memberships; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can view own memberships" ON donate_private.organization_members FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: subscription_history Members can view own org subscription history; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can view own org subscription history" ON donate_private.subscription_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM donate_private.organization_members
  WHERE ((organization_members.organization_id = subscription_history.organization_id) AND (organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text)))));


--
-- Name: todos Members can view todos; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members can view todos" ON donate_private.todos FOR SELECT TO authenticated USING ((donate_private.rls_is_active_member(organization_id) OR donate_private.rls_is_system_admin()));


--
-- Name: invites Members with invites:read can view invites; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Members with invites:read can view invites" ON donate_private.invites FOR SELECT TO authenticated USING ((donate_private.rls_is_system_admin() OR donate_private.rls_has_role_permission(organization_id, 'invites:read'::text)));


--
-- Name: subscription_history Owners can create own org subscription history; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Owners can create own org subscription history" ON donate_private.subscription_history FOR INSERT WITH CHECK (donate.can_perform('subscription:manage'::text, organization_id));


--
-- Name: organization_subscriptions Owners can view own subscription; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Owners can view own subscription" ON donate_private.organization_subscriptions FOR SELECT TO authenticated USING (donate_private.rls_is_owner(organization_id));


--
-- Name: campaign_tags System admin can manage campaign_tags; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "System admin can manage campaign_tags" ON donate_private.campaign_tags TO authenticated USING (donate.is_system_admin()) WITH CHECK (donate.is_system_admin());


--
-- Name: campaign_tag_map System admin full access campaign_tag_map; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "System admin full access campaign_tag_map" ON donate_private.campaign_tag_map TO authenticated USING (donate.is_system_admin()) WITH CHECK (donate.is_system_admin());


--
-- Name: campaigns System admin full access campaigns; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "System admin full access campaigns" ON donate_private.campaigns TO authenticated USING (donate.is_system_admin()) WITH CHECK (donate.is_system_admin());


--
-- Name: donation_methods System admin full access donation_methods; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "System admin full access donation_methods" ON donate_private.donation_methods TO authenticated USING (donate.is_system_admin()) WITH CHECK (donate.is_system_admin());


--
-- Name: organization_subscriptions System admins can manage org subscriptions; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "System admins can manage org subscriptions" ON donate_private.organization_subscriptions TO authenticated USING (donate.is_system_admin());


--
-- Name: subscription_plans System admins can manage subscription plans; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "System admins can manage subscription plans" ON donate_private.subscription_plans TO authenticated USING (donate.is_system_admin());


--
-- Name: subscription_history System admins can view subscription history; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "System admins can view subscription history" ON donate_private.subscription_history FOR SELECT TO authenticated USING (donate.is_system_admin());


--
-- Name: org_requests Users can create their own org requests; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Users can create their own org requests" ON donate_private.org_requests FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: org_requests Users can see their own org requests; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "Users can see their own org requests" ON donate_private.org_requests FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_abuse_reports; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.campaign_abuse_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_beneficiary; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.campaign_beneficiary ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_payment_methods; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.campaign_payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_tag_map; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.campaign_tag_map ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_tags; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.campaign_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs deny_all_audit_logs; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_audit_logs ON donate_private.audit_logs USING (false);


--
-- Name: campaign_beneficiary deny_all_campaign_beneficiary; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_campaign_beneficiary ON donate_private.campaign_beneficiary USING (false);


--
-- Name: campaign_payment_methods deny_all_campaign_payment_methods; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_campaign_payment_methods ON donate_private.campaign_payment_methods USING (false);


--
-- Name: campaign_tag_map deny_all_campaign_tag_map; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_campaign_tag_map ON donate_private.campaign_tag_map USING (false);


--
-- Name: campaign_tags deny_all_campaign_tags; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_campaign_tags ON donate_private.campaign_tags USING (false);


--
-- Name: campaigns deny_all_campaigns; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_campaigns ON donate_private.campaigns USING (false);


--
-- Name: donation_methods deny_all_donation_methods; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_donation_methods ON donate_private.donation_methods USING (false);


--
-- Name: donation_reports deny_all_donation_reports; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_donation_reports ON donate_private.donation_reports USING (false) WITH CHECK (false);


--
-- Name: invites deny_all_invites; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_invites ON donate_private.invites USING (false);


--
-- Name: organization_members deny_all_organization_members; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_organization_members ON donate_private.organization_members USING (false);


--
-- Name: organization_subscriptions deny_all_organization_subscriptions; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_organization_subscriptions ON donate_private.organization_subscriptions USING (false);


--
-- Name: organizations deny_all_organizations; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_organizations ON donate_private.organizations USING (false);


--
-- Name: role_permissions deny_all_role_permissions; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_role_permissions ON donate_private.role_permissions USING (false);


--
-- Name: roles deny_all_roles; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_roles ON donate_private.roles USING (false);


--
-- Name: subscription_history deny_all_subscription_history; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_subscription_history ON donate_private.subscription_history USING (false);


--
-- Name: subscription_plans deny_all_subscription_plans; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_subscription_plans ON donate_private.subscription_plans USING (false);


--
-- Name: todos deny_all_todos; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY deny_all_todos ON donate_private.todos USING (false);


--
-- Name: donation_methods; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.donation_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: donation_reports; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.donation_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: invites; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.invites ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_members members_can_read_same_org; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY members_can_read_same_org ON donate_private.organization_members FOR SELECT TO authenticated USING (((organization_id IN ( SELECT donate_private.get_user_org_ids() AS get_user_org_ids)) OR donate.is_system_admin()));


--
-- Name: org_meta org_admin can update their org metadata; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY "org_admin can update their org metadata" ON donate_private.org_meta FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM donate_private.organization_members
  WHERE ((organization_members.organization_id = org_meta.organization_id) AND (organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text) AND (organization_members.role = 'admin'::text)))));


--
-- Name: org_meta; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.org_meta ENABLE ROW LEVEL SECURITY;

--
-- Name: org_requests; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.org_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_members; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.organization_members ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_subscriptions; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.organization_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: roles; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_history; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.subscription_history ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_plans; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.subscription_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: todos; Type: ROW SECURITY; Schema: donate_private; Owner: postgres
--

ALTER TABLE donate_private.todos ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs users_view_own_audit_logs; Type: POLICY; Schema: donate_private; Owner: postgres
--

CREATE POLICY users_view_own_audit_logs ON donate_private.audit_logs FOR SELECT USING (((user_id = auth.uid()) OR (organization_id IN ( SELECT organization_members.organization_id
   FROM donate_private.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.status = 'active'::text))))));


--
-- Name: SCHEMA donate; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA donate TO anon;
GRANT USAGE ON SCHEMA donate TO authenticated;
GRANT USAGE ON SCHEMA donate TO authenticator;
GRANT USAGE ON SCHEMA donate TO service_role;


--
-- Name: SCHEMA donate_private; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA donate_private TO service_role;
GRANT USAGE ON SCHEMA donate_private TO anon;
GRANT USAGE ON SCHEMA donate_private TO authenticated;
GRANT USAGE ON SCHEMA donate_private TO authenticator;


--
-- Name: FUNCTION accept_invite(p_token text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.accept_invite(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.accept_invite(p_token text) TO authenticated;


--
-- Name: TABLE organization_members; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organization_members TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organization_members TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organization_members TO authenticated;


--
-- Name: TABLE member_view; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.member_view TO service_role;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.member_view TO anon;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.member_view TO authenticated;


--
-- Name: FUNCTION add_organization_member(target_org_id uuid, target_user_email text, member_role text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.add_organization_member(target_org_id uuid, target_user_email text, member_role text) TO authenticated;


--
-- Name: FUNCTION approve_org_request(p_request_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.approve_org_request(p_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.approve_org_request(p_request_id uuid) TO authenticated;


--
-- Name: FUNCTION bootstrap_system_admin(); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.bootstrap_system_admin() FROM PUBLIC;


--
-- Name: FUNCTION can_perform(permission_name text, p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.can_perform(permission_name text, p_org_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.can_perform(permission_name text, p_org_id uuid) TO authenticated;
GRANT ALL ON FUNCTION donate.can_perform(permission_name text, p_org_id uuid) TO anon;


--
-- Name: FUNCTION cancel_subscription(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.cancel_subscription(p_org_id uuid) TO authenticated;


--
-- Name: TABLE organization_subscriptions; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organization_subscriptions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organization_subscriptions TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organization_subscriptions TO authenticated;


--
-- Name: FUNCTION change_plan(p_org_id uuid, p_new_plan_id uuid, p_billing_period text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.change_plan(p_org_id uuid, p_new_plan_id uuid, p_billing_period text) TO authenticated;


--
-- Name: FUNCTION confirm_donation_report(p_report_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.confirm_donation_report(p_report_id uuid) TO authenticated;


--
-- Name: TABLE campaigns; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaigns TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaigns TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaigns TO authenticated;


--
-- Name: FUNCTION create_campaign(p_org_id uuid, p_title text, p_slug text, p_description text, p_cover_image_url text, p_goal_amount numeric, p_currency character varying, p_start_date date, p_end_date date, p_is_zakat_eligible boolean, p_address text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.create_campaign(p_org_id uuid, p_title text, p_slug text, p_description text, p_cover_image_url text, p_goal_amount numeric, p_currency character varying, p_start_date date, p_end_date date, p_is_zakat_eligible boolean, p_address text) TO authenticated;


--
-- Name: TABLE invites; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.invites TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.invites TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.invites TO authenticated;


--
-- Name: FUNCTION create_invite(p_organization_id uuid, p_email text, p_role text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.create_invite(p_organization_id uuid, p_email text, p_role text) TO authenticated;


--
-- Name: TABLE organizations; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organizations TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organizations TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organizations TO authenticated;


--
-- Name: TABLE organization_view; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organization_view TO service_role;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.organization_view TO anon;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.organization_view TO authenticated;


--
-- Name: FUNCTION create_organization(org_name text, org_slug text, org_description text, org_settings jsonb); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.create_organization(org_name text, org_slug text, org_description text, org_settings jsonb) FROM PUBLIC;


--
-- Name: FUNCTION create_personal_org(p_name text, p_slug text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.create_personal_org(p_name text, p_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.create_personal_org(p_name text, p_slug text) TO authenticated;


--
-- Name: TABLE subscription_plans; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.subscription_plans TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.subscription_plans TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.subscription_plans TO authenticated;


--
-- Name: FUNCTION create_subscription_plan(p_name text, p_description text, p_price_monthly numeric, p_price_yearly numeric, p_features jsonb); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.create_subscription_plan(p_name text, p_description text, p_price_monthly numeric, p_price_yearly numeric, p_features jsonb) TO authenticated;


--
-- Name: TABLE todos; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.todos TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.todos TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.todos TO authenticated;


--
-- Name: FUNCTION create_todo(p_organization_id uuid, p_title text, p_description text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.create_todo(p_organization_id uuid, p_title text, p_description text) TO authenticated;


--
-- Name: FUNCTION delete_campaign(p_campaign_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.delete_campaign(p_campaign_id uuid) TO authenticated;


--
-- Name: FUNCTION delete_organization(target_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.delete_organization(target_org_id uuid) TO authenticated;


--
-- Name: FUNCTION delete_todo(p_todo_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.delete_todo(p_todo_id uuid) TO authenticated;


--
-- Name: FUNCTION ensure_my_personal_org(); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.ensure_my_personal_org() FROM PUBLIC;
GRANT ALL ON FUNCTION donate.ensure_my_personal_org() TO authenticated;


--
-- Name: FUNCTION get_all_org_requests(); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_all_org_requests() FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_all_org_requests() TO authenticated;


--
-- Name: FUNCTION get_all_organizations(p_limit integer, p_cursor text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_all_organizations(p_limit integer, p_cursor text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_all_organizations(p_limit integer, p_cursor text) TO authenticated;


--
-- Name: FUNCTION get_campaign(p_campaign_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_campaign(p_campaign_id uuid) TO authenticated;


--
-- Name: FUNCTION get_campaign_beneficiary(p_campaign_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_campaign_beneficiary(p_campaign_id uuid) TO authenticated;


--
-- Name: FUNCTION get_campaign_by_slug(p_slug text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_campaign_by_slug(p_slug text) TO authenticated;


--
-- Name: FUNCTION get_campaign_payment_methods(p_campaign_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_campaign_payment_methods(p_campaign_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_campaign_payment_methods(p_campaign_id uuid) TO authenticated;


--
-- Name: FUNCTION get_campaign_tag_ids(p_campaign_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_campaign_tag_ids(p_campaign_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_campaign_tag_ids(p_campaign_id uuid) TO authenticated;


--
-- Name: TABLE campaign_tags; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_tags TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_tags TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_tags TO authenticated;


--
-- Name: FUNCTION get_campaign_tags(); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_campaign_tags() TO authenticated;


--
-- Name: FUNCTION get_campaigns(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_campaigns(p_org_id uuid) TO authenticated;


--
-- Name: TABLE donation_methods; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.donation_methods TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.donation_methods TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.donation_methods TO authenticated;


--
-- Name: FUNCTION get_donation_methods(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_donation_methods(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION get_invites(p_organization_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_invites(p_organization_id uuid) TO authenticated;


--
-- Name: FUNCTION get_membership(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_membership(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION get_my_org_requests(); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_my_org_requests() FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_my_org_requests() TO authenticated;


--
-- Name: FUNCTION get_my_organizations(p_limit integer, p_cursor text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_my_organizations(p_limit integer, p_cursor text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_my_organizations(p_limit integer, p_cursor text) TO authenticated;


--
-- Name: FUNCTION get_my_profile(); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_my_profile() TO authenticated;


--
-- Name: FUNCTION get_my_subscription(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_my_subscription(p_org_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_my_subscription(p_org_id uuid) TO authenticated;
GRANT ALL ON FUNCTION donate.get_my_subscription(p_org_id uuid) TO anon;


--
-- Name: TABLE org_meta; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.org_meta TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.org_meta TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.org_meta TO authenticated;


--
-- Name: FUNCTION get_org_meta(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_org_meta(p_org_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_org_meta(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION get_org_overview(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_org_overview(p_org_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_org_overview(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION get_organization(target_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_organization(target_org_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_organization(target_org_id uuid) TO authenticated;


--
-- Name: FUNCTION get_organization_members(target_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_organization_members(target_org_id uuid) TO authenticated;


--
-- Name: FUNCTION get_organization_subscriptions(); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_organization_subscriptions() TO authenticated;


--
-- Name: FUNCTION get_pending_campaigns(); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_pending_campaigns() TO authenticated;


--
-- Name: FUNCTION get_personal_campaigns(); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_personal_campaigns() FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_personal_campaigns() TO authenticated;


--
-- Name: FUNCTION get_public_campaign_by_slug(p_slug text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_public_campaign_by_slug(p_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_public_campaign_by_slug(p_slug text) TO anon;
GRANT ALL ON FUNCTION donate.get_public_campaign_by_slug(p_slug text) TO authenticated;


--
-- Name: FUNCTION get_public_campaigns(zakat_filter boolean, org_filter uuid, result_limit integer); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_public_campaigns(zakat_filter boolean, org_filter uuid, result_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_public_campaigns(zakat_filter boolean, org_filter uuid, result_limit integer) TO anon;
GRANT ALL ON FUNCTION donate.get_public_campaigns(zakat_filter boolean, org_filter uuid, result_limit integer) TO authenticated;


--
-- Name: FUNCTION get_public_donation_reports(p_campaign_id uuid, p_limit integer); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_public_donation_reports(p_campaign_id uuid, p_limit integer) TO anon;
GRANT ALL ON FUNCTION donate.get_public_donation_reports(p_campaign_id uuid, p_limit integer) TO authenticated;


--
-- Name: FUNCTION get_public_org_by_slug(org_slug text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_public_org_by_slug(org_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_public_org_by_slug(org_slug text) TO anon;
GRANT ALL ON FUNCTION donate.get_public_org_by_slug(org_slug text) TO authenticated;


--
-- Name: FUNCTION get_public_orgs(); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.get_public_orgs() FROM PUBLIC;
GRANT ALL ON FUNCTION donate.get_public_orgs() TO anon;
GRANT ALL ON FUNCTION donate.get_public_orgs() TO authenticated;


--
-- Name: FUNCTION get_subscription_history(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_subscription_history(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION get_subscription_plans(); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_subscription_plans() TO authenticated;


--
-- Name: TABLE profile_view; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.profile_view TO service_role;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.profile_view TO anon;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.profile_view TO authenticated;


--
-- Name: FUNCTION get_system_admins(); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_system_admins() TO authenticated;


--
-- Name: FUNCTION get_system_stats(); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_system_stats() TO authenticated;


--
-- Name: FUNCTION get_todos(p_organization_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_todos(p_organization_id uuid) TO authenticated;


--
-- Name: FUNCTION get_user_profile(target_user_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.get_user_profile(target_user_id uuid) TO authenticated;


--
-- Name: FUNCTION grant_system_admin(target_user_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.grant_system_admin(target_user_id uuid) TO authenticated;


--
-- Name: FUNCTION has_feature(p_org_id uuid, p_feature text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.has_feature(p_org_id uuid, p_feature text) TO authenticated;


--
-- Name: FUNCTION is_system_admin(); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.is_system_admin() TO authenticated;


--
-- Name: FUNCTION list_campaign_abuse_reports(); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.list_campaign_abuse_reports() FROM PUBLIC;
GRANT ALL ON FUNCTION donate.list_campaign_abuse_reports() TO authenticated;


--
-- Name: FUNCTION list_donation_reports(p_campaign_id uuid, p_status text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.list_donation_reports(p_campaign_id uuid, p_status text) TO authenticated;


--
-- Name: FUNCTION list_org_donation_reports(p_org_id uuid, p_status text, p_limit integer); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.list_org_donation_reports(p_org_id uuid, p_status text, p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.list_org_donation_reports(p_org_id uuid, p_status text, p_limit integer) TO authenticated;


--
-- Name: FUNCTION pause_subscription(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.pause_subscription(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION propose_donation(p_campaign_id uuid, p_amount numeric, p_method text, p_reference text, p_donor_name text, p_message text, p_turnstile_token text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.propose_donation(p_campaign_id uuid, p_amount numeric, p_method text, p_reference text, p_donor_name text, p_message text, p_turnstile_token text) TO anon;
GRANT ALL ON FUNCTION donate.propose_donation(p_campaign_id uuid, p_amount numeric, p_method text, p_reference text, p_donor_name text, p_message text, p_turnstile_token text) TO authenticated;


--
-- Name: FUNCTION publish_campaign(p_campaign_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.publish_campaign(p_campaign_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.publish_campaign(p_campaign_id uuid) TO authenticated;


--
-- Name: FUNCTION reject_campaign(p_campaign_id uuid, p_notes text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.reject_campaign(p_campaign_id uuid, p_notes text) TO authenticated;


--
-- Name: FUNCTION reject_donation_report(p_report_id uuid, p_note text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.reject_donation_report(p_report_id uuid, p_note text) TO authenticated;


--
-- Name: FUNCTION reject_org_request(p_request_id uuid, p_rejection_reason text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.reject_org_request(p_request_id uuid, p_rejection_reason text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.reject_org_request(p_request_id uuid, p_rejection_reason text) TO authenticated;


--
-- Name: FUNCTION remove_organization_member(target_org_id uuid, target_user_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.remove_organization_member(target_org_id uuid, target_user_id uuid) TO authenticated;


--
-- Name: FUNCTION report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text) TO anon;
GRANT ALL ON FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text) TO authenticated;


--
-- Name: FUNCTION report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text, p_turnstile_token text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text, p_turnstile_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text, p_turnstile_token text) TO anon;
GRANT ALL ON FUNCTION donate.report_campaign(p_campaign_id uuid, p_reason text, p_details text, p_contact text, p_turnstile_token text) TO authenticated;


--
-- Name: FUNCTION resolve_campaign_abuse_report(p_report_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.resolve_campaign_abuse_report(p_report_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.resolve_campaign_abuse_report(p_report_id uuid) TO authenticated;


--
-- Name: FUNCTION revoke_invite(p_invite_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.revoke_invite(p_invite_id uuid) TO authenticated;


--
-- Name: FUNCTION revoke_system_admin(target_user_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.revoke_system_admin(target_user_id uuid) TO authenticated;


--
-- Name: FUNCTION set_campaign_beneficiary(p_campaign_id uuid, p_full_name text, p_relationship text, p_phone text, p_national_id text, p_document_url text, p_notes text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.set_campaign_beneficiary(p_campaign_id uuid, p_full_name text, p_relationship text, p_phone text, p_national_id text, p_document_url text, p_notes text) TO authenticated;


--
-- Name: FUNCTION set_campaign_payment_methods(p_campaign_id uuid, p_bkash_number text, p_bkash_account_name text, p_nagad_number text, p_nagad_account_name text, p_rocket_number text, p_rocket_account_name text, p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_bank_routing_number text, p_bank_branch text, p_donation_url text, p_qr_image_url text, p_instructions text, p_is_preferred boolean); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.set_campaign_payment_methods(p_campaign_id uuid, p_bkash_number text, p_bkash_account_name text, p_nagad_number text, p_nagad_account_name text, p_rocket_number text, p_rocket_account_name text, p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_bank_routing_number text, p_bank_branch text, p_donation_url text, p_qr_image_url text, p_instructions text, p_is_preferred boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.set_campaign_payment_methods(p_campaign_id uuid, p_bkash_number text, p_bkash_account_name text, p_nagad_number text, p_nagad_account_name text, p_rocket_number text, p_rocket_account_name text, p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_bank_routing_number text, p_bank_branch text, p_donation_url text, p_qr_image_url text, p_instructions text, p_is_preferred boolean) TO authenticated;


--
-- Name: FUNCTION set_campaign_tags(p_campaign_id uuid, p_tag_ids uuid[]); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.set_campaign_tags(p_campaign_id uuid, p_tag_ids uuid[]) TO authenticated;


--
-- Name: FUNCTION set_org_status(p_org_id uuid, p_status text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.set_org_status(p_org_id uuid, p_status text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.set_org_status(p_org_id uuid, p_status text) TO authenticated;


--
-- Name: FUNCTION set_system_admin(p_user_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.set_system_admin(p_user_id uuid) FROM PUBLIC;


--
-- Name: FUNCTION submit_campaign_for_review(p_campaign_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.submit_campaign_for_review(p_campaign_id uuid) TO authenticated;


--
-- Name: FUNCTION submit_org_request(p_org_name text, p_org_slug text, p_org_description text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.submit_org_request(p_org_name text, p_org_slug text, p_org_description text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.submit_org_request(p_org_name text, p_org_slug text, p_org_description text) TO authenticated;


--
-- Name: FUNCTION subscribe_to_plan(p_org_id uuid, p_plan_id uuid, p_billing_period text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.subscribe_to_plan(p_org_id uuid, p_plan_id uuid, p_billing_period text) TO authenticated;


--
-- Name: FUNCTION unpause_subscription(p_org_id uuid); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.unpause_subscription(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION update_campaign(p_campaign_id uuid, p_title text, p_slug text, p_description text, p_cover_image_url text, p_goal_amount numeric, p_currency character varying, p_start_date date, p_end_date date, p_is_zakat_eligible boolean, p_status donate.campaign_status, p_address text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.update_campaign(p_campaign_id uuid, p_title text, p_slug text, p_description text, p_cover_image_url text, p_goal_amount numeric, p_currency character varying, p_start_date date, p_end_date date, p_is_zakat_eligible boolean, p_status donate.campaign_status, p_address text) TO authenticated;


--
-- Name: FUNCTION update_member_role(target_org_id uuid, target_user_id uuid, new_role text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.update_member_role(target_org_id uuid, target_user_id uuid, new_role text) TO authenticated;


--
-- Name: FUNCTION update_my_profile(new_full_name text, new_avatar_url text, new_metadata jsonb); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.update_my_profile(new_full_name text, new_avatar_url text, new_metadata jsonb) TO authenticated;


--
-- Name: FUNCTION update_org_meta(p_org_id uuid, p_name text, p_description text, p_logo_url text, p_website_url text, p_contact_email text, p_contact_phone text, p_address text, p_social_links jsonb, p_settings jsonb); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.update_org_meta(p_org_id uuid, p_name text, p_description text, p_logo_url text, p_website_url text, p_contact_email text, p_contact_phone text, p_address text, p_social_links jsonb, p_settings jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.update_org_meta(p_org_id uuid, p_name text, p_description text, p_logo_url text, p_website_url text, p_contact_email text, p_contact_phone text, p_address text, p_social_links jsonb, p_settings jsonb) TO authenticated;


--
-- Name: FUNCTION update_organization(target_org_id uuid, new_name text, new_slug text, new_description text, new_settings jsonb); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.update_organization(target_org_id uuid, new_name text, new_slug text, new_description text, new_settings jsonb) TO authenticated;


--
-- Name: FUNCTION update_subscription_plan(p_plan_id uuid, p_name text, p_description text, p_price_monthly numeric, p_price_yearly numeric, p_features jsonb, p_is_active boolean); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.update_subscription_plan(p_plan_id uuid, p_name text, p_description text, p_price_monthly numeric, p_price_yearly numeric, p_features jsonb, p_is_active boolean) TO authenticated;


--
-- Name: FUNCTION update_todo(p_todo_id uuid, p_title text, p_description text, p_completed boolean); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.update_todo(p_todo_id uuid, p_title text, p_description text, p_completed boolean) TO authenticated;


--
-- Name: FUNCTION upsert_donation_methods(p_org_id uuid, p_bkash_number text, p_bkash_account_name text, p_nagad_number text, p_nagad_account_name text, p_rocket_number text, p_rocket_account_name text, p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_bank_routing_number text, p_bank_branch text, p_donation_url text, p_qr_image_url text, p_instructions text, p_is_preferred boolean); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.upsert_donation_methods(p_org_id uuid, p_bkash_number text, p_bkash_account_name text, p_nagad_number text, p_nagad_account_name text, p_rocket_number text, p_rocket_account_name text, p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_bank_routing_number text, p_bank_branch text, p_donation_url text, p_qr_image_url text, p_instructions text, p_is_preferred boolean) TO authenticated;


--
-- Name: FUNCTION validate_invite(p_token text, p_email text); Type: ACL; Schema: donate; Owner: postgres
--

REVOKE ALL ON FUNCTION donate.validate_invite(p_token text, p_email text) FROM PUBLIC;
GRANT ALL ON FUNCTION donate.validate_invite(p_token text, p_email text) TO anon;
GRANT ALL ON FUNCTION donate.validate_invite(p_token text, p_email text) TO authenticated;


--
-- Name: FUNCTION verify_campaign(p_campaign_id uuid, p_notes text); Type: ACL; Schema: donate; Owner: postgres
--

GRANT ALL ON FUNCTION donate.verify_campaign(p_campaign_id uuid, p_notes text) TO authenticated;


--
-- Name: FUNCTION get_user_org_ids(); Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT ALL ON FUNCTION donate_private.get_user_org_ids() TO authenticated;


--
-- Name: FUNCTION rls_has_role_permission(p_org_id uuid, p_permission text); Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT ALL ON FUNCTION donate_private.rls_has_role_permission(p_org_id uuid, p_permission text) TO authenticated;


--
-- Name: FUNCTION rls_is_active_member(p_org_id uuid); Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT ALL ON FUNCTION donate_private.rls_is_active_member(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION rls_is_owner(p_org_id uuid); Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT ALL ON FUNCTION donate_private.rls_is_owner(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION rls_is_system_admin(); Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT ALL ON FUNCTION donate_private.rls_is_system_admin() TO authenticated;


--
-- Name: FUNCTION rls_org_status(p_org_id uuid); Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT ALL ON FUNCTION donate_private.rls_org_status(p_org_id uuid) TO authenticated;


--
-- Name: FUNCTION rls_uid(); Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT ALL ON FUNCTION donate_private.rls_uid() TO authenticated;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.audit_logs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.audit_logs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.audit_logs TO authenticated;


--
-- Name: TABLE campaign_abuse_reports; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_abuse_reports TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_abuse_reports TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_abuse_reports TO authenticated;


--
-- Name: TABLE campaign_beneficiary; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_beneficiary TO service_role;


--
-- Name: TABLE campaign_payment_methods; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_payment_methods TO service_role;


--
-- Name: TABLE campaign_tag_map; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_tag_map TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_tag_map TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.campaign_tag_map TO authenticated;


--
-- Name: TABLE donation_reports; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.donation_reports TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.donation_reports TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.donation_reports TO authenticated;


--
-- Name: TABLE org_requests; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.org_requests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.org_requests TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.org_requests TO authenticated;


--
-- Name: TABLE organization_detail_view; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.organization_detail_view TO service_role;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.organization_detail_view TO anon;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.organization_detail_view TO authenticated;


--
-- Name: TABLE platform_settings; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.platform_settings TO service_role;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.role_permissions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.role_permissions TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.role_permissions TO authenticated;


--
-- Name: TABLE roles; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.roles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.roles TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.roles TO authenticated;


--
-- Name: TABLE role_view; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.role_view TO service_role;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.role_view TO anon;
GRANT INSERT,DELETE,UPDATE ON TABLE donate_private.role_view TO authenticated;


--
-- Name: TABLE subscription_history; Type: ACL; Schema: donate_private; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.subscription_history TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.subscription_history TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE donate_private.subscription_history TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: donate; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA donate GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA donate GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA donate GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


