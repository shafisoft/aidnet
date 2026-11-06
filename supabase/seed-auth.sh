#!/usr/bin/env bash
# ====================================================================
# supabase/seed-auth.sh
# --------------------------------------------------------------------
# Seeds login-able auth users + demo data for local dev / e2e.
# Must be run AFTER `supabase db reset` (which only applies seed.sql,
# and raw SQL auth.users inserts are invisible to GoTrue).
#
# Produces:
#   admin@donate.app      / Password123!  (system admin - NO org membership)
#   owner@donate.app      / Password123!  (org owner - owns demo org)
#   member@donate.app     / Password123!  (plain org member)
#   individual@donate.app / Password123!  (org-less - for personal-campaigns e2e;
#                                         the org-cleanup sweep below deletes any
#                                         personal org left by earlier runs, so
#                                         every run starts truly org-less)
#   + 30 LIVE demo campaigns (1 zakat) + donation methods for the org
# ====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="donate-local"
API_URL="${SUPABASE_API_URL:-http://127.0.0.1:55321}"
PW="Password123!"
ADMIN_EMAIL="admin@donate.app"
OWNER_EMAIL="owner@donate.app"
MEMBER_EMAIL="member@donate.app"
INDIVIDUAL_EMAIL="individual@donate.app"

# --- resolve service role key + db container -------------------------
# The shared docker/ stack lives in the sibling platform repo
# ($ROOT/../platform/docker). Key resolution order:
# SUPABASE_SERVICE_ROLE_KEY env -> that stack's .env -> `supabase status`
# (CLI-managed stack). DB access order: DB_CONTAINER env -> docker compose
# -> CLI project label.
PLATFORM_DOCKER="$ROOT/../platform/docker"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
if [ -z "$SERVICE_ROLE_KEY" ] && [ -f "$PLATFORM_DOCKER/.env" ]; then
  SERVICE_ROLE_KEY="$(grep -E '^SERVICE_ROLE_KEY=' "$PLATFORM_DOCKER/.env" | cut -d= -f2-)"
fi
if [ -z "$SERVICE_ROLE_KEY" ]; then
  SERVICE_ROLE_KEY="$(supabase status --output env 2>/dev/null | awk -F'"' '/SERVICE_ROLE_KEY/{print $2}' | tr -d '[:space:]' || true)"
fi
if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "ERROR: could not resolve SERVICE_ROLE_KEY (set SUPABASE_SERVICE_ROLE_KEY, or run the platform repo's docker/ stack, or 'supabase start')" >&2
  exit 1
fi

COMPOSE="docker compose -f $PLATFORM_DOCKER/docker-compose.yml --env-file $PLATFORM_DOCKER/.env"
# Product schema chain (donate strategy) — psql sessions here are the table
# owner (RLS bypass), but unqualified table refs still need the chain.
PGOPTIONS_SQL="-c search_path=donate,donate_private,shared,extensions"
if [ -n "${DB_CONTAINER:-}" ]; then
  psql() { docker exec -i -e PGOPTIONS="$PGOPTIONS_SQL" "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }
elif [ -n "$($COMPOSE ps -q db 2>/dev/null || true)" ]; then
  psql() { $COMPOSE exec -T -e PGOPTIONS="$PGOPTIONS_SQL" db psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }
else
  DB_CONTAINER="$(docker ps --filter "label=com.supabase.cli.project=${PROJECT}" --format '{{.Names}}' 2>/dev/null | grep -E 'db_' | head -1 || true)"
  if [ -z "$DB_CONTAINER" ]; then
    echo "ERROR: no db container found — start the platform repo's docker/ stack (sh ../platform/docker/bootstrap.sh) or 'supabase start'" >&2
    exit 1
  fi
  psql() { docker exec -i -e PGOPTIONS="$PGOPTIONS_SQL" "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }
fi

# --- create auth users via GoTrue (scrypt password) -------------------
create_user() {
  local email="$1"
  local resp
  resp="$(curl -s -X POST "${API_URL}/auth/v1/admin/users" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${PW}\",\"email_confirm\":true}")"
  # 200/201 = created, 409/400 with "already exists" = fine
  if echo "$resp" | grep -qiE '"id"'; then
    echo "  created ${email}"
  elif echo "$resp" | grep -qiE 'already exists|user.*exist'; then
    echo "  ${email} already exists (ok)"
  else
    echo "  WARN create ${email}: ${resp}" >&2
  fi
}

echo "==> creating auth users"
create_user "$ADMIN_EMAIL"
create_user "$OWNER_EMAIL"
create_user "$MEMBER_EMAIL"
create_user "$INDIVIDUAL_EMAIL"

# --- clean up orgs created by previous e2e runs -----------------------
# Tests create orgs via the request flow (random names + timestamps). Without
# cleanup they accumulate across runs, eventually exceeding the admin page's
# pagination limit and breaking locator-based tests. Keep only orgs owned by
# the three seeded users (admin has none; owner/member share demo-org).
# The audit trigger would otherwise try to log the deletion with a dangling
# organization_id FK, so disable it for the cleanup window.
echo "==> cleaning up orgs from previous e2e runs"
psql -c "
ALTER TABLE organizations DISABLE TRIGGER audit_organizations_changes;
ALTER TABLE organization_members DISABLE TRIGGER audit_organization_members_changes;
DELETE FROM organizations
WHERE created_by IS NULL
   OR created_by NOT IN (
     SELECT id FROM profiles
     WHERE email IN ('${ADMIN_EMAIL}', '${OWNER_EMAIL}', '${MEMBER_EMAIL}')
   );
ALTER TABLE organizations ENABLE TRIGGER audit_organizations_changes;
ALTER TABLE organization_members ENABLE TRIGGER audit_organization_members_changes;
" || echo "  (cleanup skipped — no orgs to delete or db not ready)"

# --- promote admin to system admin -----------------------------------
echo "==> promoting ${ADMIN_EMAIL} to system admin"
psql -c "UPDATE profiles SET is_system_admin = true WHERE email = '${ADMIN_EMAIL}';"

# --- create demo organization for org owner ---------------------------
echo "==> creating demo organization for ${OWNER_EMAIL}"
psql -c "
DO \$\$
DECLARE v_owner_id UUID; v_org_id UUID;
BEGIN
  SELECT id INTO v_owner_id FROM profiles WHERE email = '${OWNER_EMAIL}';
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'owner user not found'; END IF;

  -- Check if org already exists, get its ID
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-org';

  IF v_org_id IS NULL THEN
    -- Create the organization
    INSERT INTO organizations (name, slug, description)
    VALUES ('Demo Organization', 'demo-org', 'Organization for testing and demonstration purposes')
    RETURNING id INTO v_org_id;
  END IF;

  -- Add the owner as an org member with admin role and owner flag if not already a member
  INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
  VALUES (v_org_id, v_owner_id, 'admin', 'active', true)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Give the demo org an active Pro subscription (members, invites, settings).
  -- The org-create trigger may already have attached the baseline Free plan;
  -- upgrade (replace it) rather than skip, so demo always exercises Pro features.
  DELETE FROM organization_subscriptions s
  USING subscription_plans fp
  WHERE s.organization_id = v_org_id
    AND s.plan_id = fp.id AND fp.name = 'Free';

  INSERT INTO organization_subscriptions
    (organization_id, plan_id, status, billing_period,
     current_period_start, current_period_end)
  SELECT v_org_id, p.id, 'active', 'monthly', NOW(), NOW() + interval '1 month'
  FROM subscription_plans p
  WHERE p.name = 'Pro'
    AND NOT EXISTS (
      SELECT 1 FROM organization_subscriptions s
      JOIN subscription_plans pp ON pp.id = s.plan_id
      WHERE s.organization_id = v_org_id
        AND s.status = 'active' AND pp.name <> 'Free'
    );
END \$\$;
"

# --- link member into demo org -------------------------------------
echo "==> linking ${MEMBER_EMAIL} into demo org"
psql -c "
INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
SELECT o.id, p.id, 'member', 'active', false
FROM organizations o, profiles p
WHERE o.slug = 'demo-org' AND p.email = '${MEMBER_EMAIL}'
ON CONFLICT (organization_id, user_id) DO NOTHING;
"

# --- demo campaigns + donation methods -------------------------------
echo "==> seeding demo campaigns + donation methods"
psql -c "
DO \$\$
DECLARE v_org UUID; v_admin_id UUID; v_owner_id UUID;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'demo-org';
  SELECT id INTO v_admin_id FROM profiles WHERE email = '${ADMIN_EMAIL}';
  SELECT id INTO v_owner_id FROM profiles WHERE email = '${OWNER_EMAIL}';
  IF v_org IS NULL THEN RAISE EXCEPTION 'demo org not found'; END IF;

  -- 30 live campaigns: the /campaigns Load-more e2e needs more than one
  -- page (default page size 24). ON CONFLICT keeps re-runs idempotent.
  INSERT INTO campaigns (org_id, title, slug, description, goal_amount, currency, is_zakat_eligible, status, is_active, created_by)
  SELECT v_org, 'Demo Campaign ' || g, 'demo-campaign-' || g,
         'A humanitarian campaign seeded for local testing.', 100000 + g*1000, 'BDT',
         (g = 1), 'live', true, v_owner_id
  FROM generate_series(1,30) g
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO donation_methods (organization_id, bkash_number, bkash_account_name, nagad_number, bank_name, bank_account_number, donation_url, is_preferred)
  VALUES (v_org, '01700000000', 'Demo Organization', '01800000000', 'Demo Bank', '1234567890', 'https://demo.org/donate', true)
  ON CONFLICT DO NOTHING;
END \$\$;
"

# --- reference tags + a pre-tagged DRAFT campaign ---------------------
# Tag persistence e2e needs an EDITABLE campaign (update_campaign blocks
# editing live campaigns), so the tagged subject is a draft.
echo "==> seeding campaign tags"
psql -c "
INSERT INTO campaigns (org_id, title, slug, description, goal_amount, currency, is_zakat_eligible, status, is_active, created_by)
SELECT o.id, 'Demo Draft Tagged', 'demo-draft-tagged',
       'Draft campaign for tag persistence e2e.', 50000, 'BDT', false,
       'draft', true, p.id
FROM organizations o, profiles p
WHERE o.slug = 'demo-org' AND p.email = '${OWNER_EMAIL}'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO campaign_tags (slug, label) VALUES
  ('education', 'Education'),
  ('health', 'Health')
ON CONFLICT (slug) DO NOTHING;

-- Reset (not just add): earlier e2e runs legitimately mutate this selection,
-- and the seed must restore the exact expected state every run.
DELETE FROM campaign_tag_map
WHERE campaign_id = (SELECT id FROM campaigns WHERE slug = 'demo-draft-tagged');

INSERT INTO campaign_tag_map (campaign_id, tag_id)
SELECT c.id, t.id
FROM campaigns c, campaign_tags t
WHERE c.slug = 'demo-draft-tagged'
  AND t.slug IN ('education', 'health')
ON CONFLICT DO NOTHING;
"

# --- confirmed donation reports (donor-reported ledger) ---------------
# Demo campaigns show non-zero raised totals, sourced from CONFIRMED
# reports only — the same rule the production RPCs apply. Reset per run:
# e2e confirms/rejects reports, so the demo state must not accumulate.
echo "==> seeding demo donation reports"
psql -c "
DO \$\$
DECLARE v_org UUID; v_owner_id UUID; v_camp RECORD;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'demo-org';
  SELECT id INTO v_owner_id FROM profiles WHERE email = '${OWNER_EMAIL}';
  FOR v_camp IN
    SELECT id, slug FROM campaigns
    WHERE org_id = v_org AND slug IN ('demo-campaign-1', 'demo-campaign-2')
  LOOP
    DELETE FROM donation_reports WHERE campaign_id = v_camp.id;
    INSERT INTO donation_reports (campaign_id, org_id, amount, currency, method, reference, donor_name, status, reviewed_by, reviewed_at)
    SELECT v_camp.id, v_org, 500 * g, 'BDT', 'bkash', 'SEED-TRX-' || g,
           CASE g WHEN 1 THEN 'Rahim' WHEN 2 THEN 'Ayesha' ELSE 'Kamal' END,
           'confirmed', v_owner_id, NOW()
    FROM generate_series(1, 3) g;
  END LOOP;

  UPDATE campaigns c
  SET raised_amount = COALESCE((
        SELECT SUM(amount) FROM donation_reports r
        WHERE r.campaign_id = c.id AND r.status = 'confirmed'
      ), 0)
  WHERE c.slug IN ('demo-campaign-1', 'demo-campaign-2');
END \$\$;
"

echo "==> done."
