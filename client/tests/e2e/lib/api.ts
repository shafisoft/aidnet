import type { APIRequestContext } from '@playwright/test'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const USERS = {
  systemAdmin: { email: 'admin@donate.app', password: 'Password123!' },
  orgOwner: { email: 'owner@donate.app', password: 'Password123!' },
  orgMember: { email: 'member@donate.app', password: 'Password123!' },
  individual: { email: 'individual@donate.app', password: 'Password123!' },
} as const

export interface Session {
  access_token: string
  refresh_token: string
}

export async function signIn(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<Session> {
  const res = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      data: { email, password },
      headers: { apikey: SUPABASE_ANON_KEY },
    }
  )
  if (!res.ok()) throw new Error(`signIn failed for ${email}: ${res.status()}`)
  return (await res.json()) as Session
}

/**
 * API-level signup — creates a user via GoTrue REST without touching the
 * browser. Use this instead of UI registration when the test needs a fresh
 * user but the signup flow itself is NOT under test.
 *
 * Returns a session (access_token + refresh_token) on success.  The caller
 * must set these tokens in the page's localStorage and reload to authenticate
 * the browser context.
 */
export async function signUp(
  request: APIRequestContext,
  email: string,
  password: string,
  fullName: string
): Promise<Session> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    data: { email, password, data: { full_name: fullName } },
    headers: { apikey: SUPABASE_ANON_KEY },
  })
  if (!res.ok())
    throw new Error(
      `signUp failed for ${email}: ${res.status()} ${await res.text()}`
    )
  const body = await res.json()
  if (!body.access_token)
    throw new Error(
      `signUp returned no access_token for ${email}: ${JSON.stringify(body)}`
    )
  return body as Session
}

/**
 * Register a new user via the GoTrue REST API (no browser UI).
 * Does NOT authenticate the browser — the caller must do that separately
 * via a login helper (e.g. loginAsUser) after this returns.
 */
export async function registerViaApi(
  _page: import('@playwright/test').Page,
  email: string,
  password: string,
  fullName: string
): Promise<void> {
  await signUp(_page.request, email, password, fullName)
}

export async function rpc<T>(
  request: APIRequestContext,
  session: Session,
  fn: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    data: args,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  })
  if (!res.ok()) {
    const detail = await res.text().catch(() => '')
    throw new Error(`rpc ${fn} failed: ${res.status()} ${detail.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

/** Call an RPC with the anon key only — mirrors what the public site does. */
export async function anonRpc<T>(
  request: APIRequestContext,
  fn: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    data: args,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok()) throw new Error(`anon rpc ${fn} failed: ${res.status()}`)
  return (await res.json()) as T
}

export interface PublicCampaign {
  id: string
  title: string
  slug: string
  status: string
  is_zakat_eligible: boolean
}

/**
 * CONTRACT: assert the full server-side outcome of org provisioning at the
 * moment it happens — org readable, requester is active admin/owner, and an
 * active subscription with the baseline feature set exists.
 *
 * Without this, a missing DB row surfaces much later as an unrelated UI
 * timeout (e.g. "Settings button not visible") instead of failing here with
 * the actual cause.
 */
export async function expectOrgProvisioned(
  request: APIRequestContext,
  credsOrSession: Session | { email: string; password: string },
  orgRef: string,
  opts: { features?: string[]; role?: string; isOwner?: boolean } = {}
): Promise<void> {
  const { expect } = await import('@playwright/test')
  const session =
    'access_token' in credsOrSession
      ? credsOrSession
      : await signIn(request, credsOrSession.email, credsOrSession.password)

  // orgRef may be a uuid or a human-readable org name (resolved via the
  // caller's own membership list).
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let orgId = orgRef
  if (!UUID_RE.test(orgRef)) {
    const mine = await rpc<Array<{ id: string; name: string }>>(
      request,
      session,
      'get_my_organizations'
    )
    const row = mine.find(o => o.name === orgRef)
    expect(row, `org '${orgRef}' in caller's organizations`).toBeTruthy()
    orgId = row!.id
  }

  // RETURNS TABLE functions arrive wrapped in an array via PostgREST.
  type Membership = {
    role: string
    permissions: string[]
    is_active: boolean
    is_owner: boolean
  }
  const membershipRaw = await rpc<Membership[] | Membership>(
    request,
    session,
    'get_membership',
    { p_org_id: orgId }
  )
  const membership = Array.isArray(membershipRaw)
    ? membershipRaw[0]
    : membershipRaw
  expect(membership, 'membership row for new org').toBeTruthy()
  expect(membership!.is_active).toBe(true)
  if (opts.role) expect(membership!.role).toBe(opts.role)
  if (opts.isOwner !== undefined)
    expect(membership!.is_owner).toBe(opts.isOwner)

  type Sub = { plan_name: string; status: string; features: string[] }
  const subRaw = await rpc<Sub[] | Sub | null>(
    request,
    session,
    'get_my_subscription',
    {
      p_org_id: orgId,
    }
  )
  const sub = Array.isArray(subRaw) ? subRaw[0] : subRaw
  const BASE_FEATURES = ['members', 'settings']
  const expected = opts.features ?? BASE_FEATURES
  expect(sub, 'active subscription for new org').toBeTruthy()
  expect(sub!.status).toBe('active')
  for (const f of expected) {
    expect(sub!.features, `plan must grant '${f}'`).toContain(f)
  }
}

/** Public campaign discovery — same RPC the landing / /campaigns UI calls. */
export async function getPublicCampaigns(
  request: APIRequestContext,
  opts: { zakat?: boolean; limit?: number; offset?: number } = {}
): Promise<PublicCampaign[]> {
  return anonRpc<PublicCampaign[]>(request, 'get_public_campaigns', {
    zakat_filter: opts.zakat ?? null,
    org_filter: null,
    result_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
  })
}

/** Public single-campaign lookup — same RPC the detail page calls. */
export async function getCampaignBySlug(
  request: APIRequestContext,
  slug: string
): Promise<PublicCampaign | null> {
  const rows = await anonRpc<PublicCampaign[]>(
    request,
    'get_campaign_by_slug',
    {
      p_slug: slug,
    }
  )
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

export interface MyProfile {
  id: string
  email: string
  full_name: string | null
}

/** Authenticated profile lookup — same RPC the /profile page calls. */
export async function getMyProfile(
  request: APIRequestContext,
  session: Session
): Promise<MyProfile> {
  // RETURNS TABLE arrives wrapped in an array via PostgREST
  const raw = await rpc<MyProfile[] | MyProfile>(
    request,
    session,
    'get_my_profile'
  )
  return Array.isArray(raw) ? raw[0] : raw
}

/** Feature keys in the org's active subscription — same RPC the app uses. */
export async function getOrgFeatures(
  request: APIRequestContext,
  session: Session
): Promise<string[]> {
  const orgs = await rpc<Array<{ id: string; slug: string }>>(
    request,
    session,
    'get_my_organizations'
  )
  const demoOrg = orgs.find(o => o.slug === 'demo-org')
  if (!demoOrg) return []

  const subs = await rpc<Array<{ features: unknown }>>(
    request,
    session,
    'get_my_subscription',
    { p_org_id: demoOrg.id }
  )
  const raw = subs[0]?.features
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return Array.isArray(raw) ? raw : []
}
