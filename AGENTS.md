# AGENTS.md — Operating Rules for AI Agents

You are working on **donate**: a static-export NextJS client backed by Supabase
(PostgreSQL functions + Auth). Read this file fully before
changing anything. Canonical companions:

- `CLAUDE.md` — pointer to this file (authoritative rules; do not duplicate content there)
- `supabase/README.md` — database architecture philosophy
- `client/tests/test-creation-guideline.md` — testing law (both tiers)
- `../platform/` — the shared Supabase layer, its own sibling repo: charter
  (`../platform/README.md`), schema/exposure registry (`SCHEMAS.md`), and the
  co-living playbook (`PLAYBOOK.md`) that every other product deploys by

---

## 0. Communication style (applies to every reply)

- Talk less. Lead with the answer.
- Simple words. Simple sentences.
- Prefer diagrams (ASCII/mermaid) over long prose when explaining flow or structure.

---

## 1. Hard laws (violating these breaks the project)

### Workspace hygiene
- **NEVER use `/tmp` for any file.** All scratch/diagnostic/temp files go in
  `.temp/` at the repo root (create with `mkdir -p .temp` if missing). `/tmp`
  is OFF-LIMITS — agents that reach for it cause cross-session file leakage and
  confuse the user. Add `.temp/` to `.gitignore` (already done).
- Diagnostic Playwright specs, throwaway scripts, curl output captures, etc. all
  live in `.temp/`. If a tool call would write to `/tmp`, STOP and use `.temp/`.

### Data access
- **Function-first**: ALL reads/writes go through PostgreSQL functions called via
  RPC (`this.callRpc(Rpc.X.Y, params)`). NEVER query tables with `.from()` from
  client code. There is always (or should be) a function — if missing, write a
  migration.
- **One repository per entity** in `client/src/repositories/`, extending
  `BaseRepository`. Every `callRpc` lives there. Services NEVER call `callRpc`.
- **Schema layout (multi-product)**: the exposed `donate` schema holds
  FUNCTIONS only (the Data API surface; `PGRST_DB_SCHEMAS=donate` in the
  platform repo's `../platform/docker/.env`). Tables, views and the RLS
  helper functions live in `donate_private` — same posture as every other
  co-living product. Donate runs a SECURITY INVOKER CRUD surface (29 of its
  95 functions), so `donate_private` keeps client table grants + RLS
  policies (the recorded zikr-style exception; schema USAGE granted, the
  legacy `private` schema was merged in and dropped at the 2026-11-04
  platform cutover). The platform data layer lives
  in `shared` (`shared.profiles`, auth onboarding trigger) and is NOT exposed;
  it is reachable only through SECURITY DEFINER product functions. `public` is
  retired. Every function pins
  `SET search_path = donate, donate_private, shared, extensions` (exposed
  schema first), and service roles carry the same chain at role level. The
  platform layer itself is a sibling repo (`../platform/`) — onboarding
  guidelines for new products, the schema/exposure registry, and its own
  migration stream (`../platform/supabase/migrations/`) for platform-level
  changes; never edit the frozen initial platform objects in this repo's
  migration stream.
- **RPC function names are a repository-layer secret.** Only repositories know
  them: a service calls a domain method (`todoRepo.getTodos(orgId)`), the
  repository translates it to the actual function
  (`callRpc(Rpc.Todo.GetMany, ...)`). Services, hooks, containers and components
  must not import `Rpc` or reference `'fn_name'` strings — if they seem to need
  to, the repository is missing a method.
- **Services are thin orchestration**: constructor injection with singleton
  defaults —
  ```ts
  export class TodoService {
    constructor(private todoRepo: TodoRepository = new TodoRepository()) {}
  }
  export const todoService = new TodoService() // composition root: keep stable
  ```
- **Naming by audience**: `System*` = system-admin-only operations,
  `Org*`/plain = org-owner/member-facing. The prefix `Admin` alone is banned
  (ambiguous vs org admins).
- **RPC names are type-checked**: add names only in `client/src/types/rpc.ts`
  with `satisfies DbFunction` — and consume them ONLY from repositories. After
  schema changes regenerate:
  `supabase gen types typescript > client/src/types/database.ts`.

### Security layering (do not blur these)
1. **Database functions are THE authorization boundary** (`SECURITY DEFINER` +
   deny-all RLS + role checks inside each function). Any new function must
   implement its own authorization check.
2. Client-side access control is UX only:
   - Route gating lives ONLY in `client/src/lib/routeAccess.ts`
     (`ROUTE_ACCESS`: public / authenticated / systemAdmin, fail-closed) enforced
     by `RouteAccessGuard` in the root layout. Pages must not hand-roll
     redirect/deny logic.
   - Role checks via `useSystemAdmin()`, `usePermissions()`, `useRequireAuth()`.
3. NEVER treat client checks as security, and never bypass DB functions as a
   "quick fix".

### Frontend constraints (static export)
- No server components, no NextJS API routes, no `[param]` dynamic segments.
  Use query params: `/manage/orgs?id=xxx`, validated via `useRequiredParam(key)` +
  `isUuid()` / `isInviteToken()`.
- Components are stateless: props in, callbacks out. Only containers touch
  services. All state lives in containers/hooks/providers.
- Auth uses the Supabase JS client via the `useAuth` hook / auth provider — not
  NextJS auth. No custom edge functions in `supabase/functions/` — the sole
  exception is `og` (crawler-facing Open Graph previews for shared campaign
  links; its pure helpers live in `client/src/lib/ogPreview.ts` and are
  unit-tested there). App pages never call it. Do not add more.

---

## 2. Testing law (summary — full text in test-creation-guideline.md)

Two tiers. Write the cheaper tier that catches the bug.

**Unit (Vitest, colocated `*.test.ts`)** — default choice:
- Repo specs: assert exact RPC function name + params via
  `createMockRpcGateway` from `client/src/testing/mockRpcClient.ts`
  (route table keyed by function name; loud-fails on unregistered calls).
- Service specs: mock repos via `mockRepository<T>({ ... })`; assert delegation,
  unwrapping transforms, error propagation.
- Fixtures from `client/src/testing/fixtures.ts`, typed against `@/types`;
  prefer `RpcReturn<'fn_name'>` so schema changes break the fixture loudly.
- Run: `pnpm test:unit:ci`. Dummy Supabase env comes from `vitest.config.ts`
  (lib/supabase validates env at import time; unit tests never hit network).

**E2E (Playwright)** — user journeys only:
- A page's spec owns ALL its behavior including outgoing navigation. A link
  `A → B` is tested once, in `A.spec.ts`. No cross-file duplicates.
- Titles: `When <condition>, <action>` (Given/When/Then).
- Assert real outcomes (URLs, visible text, persistence-after-reload). Never
  CSS-class state assertions.
- Backend-backed UI gets an env-guarded API-contract assertion via
  `tests/e2e/lib/api.ts` helpers (`test.skip(!SUPABASE_URL, ...)`).
- Seed data is guaranteed by `global-setup.mjs` → `supabase/seed-auth.sh`
  (idempotent). Rely only on seeded users/data. Skip with `SKIP_E2E_SEED=1`.
- Auth: feature tests reuse cached storage states (`tests/e2e/.auth/*.json`,
  regenerated per run, gitignored — NEVER commit); auth-flow tests log in via UI.
- Seeded logins: `admin@donate.app`, `owner@donate.app`, `member@donate.app`
  (`Password123!`).

**Definition of done for any change**: `tsc --noEmit` clean · `next lint` clean ·
`prettier --check` clean · unit suite green · (if routes/pages touched)
`playwright test --list` still parses. Pre-commit hook enforces lint+prettier on
staged client files.

CI runs format/lint/typecheck/unit only — e2e requires a locally seeded
Supabase (`supabase start && supabase db reset && ./supabase/seed-auth.sh`),
so run e2e manually before merging UI changes.

---

## 3. Recipes

**Add a DB operation**
1. Migration: `supabase migration new <name>` → `CREATE OR REPLACE FUNCTION`
   with authorization checks, `SECURITY DEFINER`, structured return (prefer
   views).
2. Test locally: `supabase db reset`, then `psql` the function.
3. Regenerate types; register the name under the right audience group in
   `types/rpc.ts`.
4. Add method to the entity repository (map params verbatim).
5. Expose via service if orchestration/transform needed; wire container.

**Add a page**
1. Classify the route ONCE in `ROUTE_ACCESS` (fail-closed default).
2. Container fetches via service(s); components stay stateless.
3. Unit-test service logic; e2e spec owned by that page (GWT naming).
4. Static-export-safe URLs only (query params, trailing-slash consistent).

**Extend an entity**
1. New columns/functions → migration + regenerated `database.ts`.
2. Update the entity's repository + fixtures; adjust `RpcReturn` usage.
3. If audience differs from current naming (System vs Org), split the
   repository/service — do not grow mixed-audience classes.

**Deploy to production**
- Backend: link the hosted project, then push migrations. Custom edge functions
  are banned — the sole exception is `og`, deployed once with its env:
  ```sh
  supabase functions deploy og --project-ref <ref> --config-path supabase/config.production.toml
  supabase secrets set SITE_URL=https://<site-origin>[/<base-path>] --project-ref <ref>
  # then add the repo secret NEXT_PUBLIC_OG_PREVIEW_URL=https://<ref>.supabase.co/functions/v1/og
  # and re-run the Pages deploy so share links pick it up
  ```
  `og` must stay what it is — OG HTML to link-preview crawlers, 302 to humans
  (`verify_jwt = false` in both config files). Do not use it as a precedent.
  ```sh
  supabase link --project-ref <ref> --config-path supabase/config.production.toml
  supabase db push --config-path supabase/config.production.toml
  # regenerate types from the linked project if the schema diverged
  supabase gen types typescript --linked > client/src/types/database.ts
  ```
- After the first push to a hosted project, expose the `donate` schema on its
  Data API — hosted projects do NOT inherit `PGRST_DB_SCHEMAS` from the shared
  local stack (`../platform/docker/.env`). Symptom if skipped: client RPCs fail with
  `Invalid schema: donate`. Fix once (token = personal access token):
  ```sh
  curl -X PATCH "https://api.supabase.com/v1/projects/<ref>/postgrest" \
    -H "Authorization: Bearer <access-token>" \
    -H "Content-Type: application/json" -d '{"db_schema": "donate"}'
  ```
  (Dashboard equivalent: Project Settings → API → Exposed schemas.)
- Frontend: static export deployed to GitHub Pages by
  `.github/workflows/deploy.yml` (push to `main`, or manual dispatch). Requires
  the repo secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  The workflow auto-detects the deployment target each run via the Pages API:
  project pages (`https://<owner>.github.io/<repo>/`) build with
  `NEXT_PUBLIC_BASE_PATH=/<repo>` (Next bakes asset URLs at build time);
  a configured custom domain or root site builds without a base path. Re-run
  the deploy after adding or removing a custom domain. App-level absolute
  URLs (e.g. auth `redirectTo`) must go through `getAppBasePath()`
  (`client/src/lib/basePath.ts`), which infers the deployment base path from
  the browser at runtime; never hardcode the sub-path in app code. Manual local equivalent:
  ```sh
  cd client
  NEXT_PUBLIC_BASE_PATH=/<repo> \
  NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
  pnpm build   # ship client/out/
  ```
- After any seed change, re-run `./supabase/seed-auth.sh` against the target.

---

## 4. Known gotchas

- `global-setup` must stay `.mjs`: Node loads it as CJS otherwise and
  `import.meta` crashes.
- `RETURNS TABLE(...)` functions arrive wrapped in an array via PostgREST;
  repositories return raw rows, services unwrap `[0] ?? null`.
- macOS bash 3.2: no `mapfile`; scripts must be portable.
- `tests/e2e/.auth/*.json` hold live session tokens — gitignored, never commit.
- Vitest needs the dummy env in `vitest.config.ts`; removing it breaks all
  spec collection (module-load throw from `lib/supabase`).
- After editing seeds, `supabase db reset` wipes data — re-run
  `./supabase/seed-auth.sh` (global-setup does this automatically per run).
- Temp files go in `.temp/` (repo root), NOT `/tmp` — see Hard Law above.
  Create it if missing: `mkdir -p .temp`. Add `.temp/` to `.gitignore`.

## 5. Change discipline

- Atomic commits: one logical concern per commit, conventional messages
  (`feat|fix|refactor|test|docs|chore(scope): summary`).
- Behavior-preserving refactors land separately from behavior changes.
- Commit only what was asked; never amend pushed history; push/PR only on
  explicit request.

## Communication style (agent replies)

- Talk less. Keep replies short.
- Use simple words. Simple sentences.
- Prefer diagrams (ASCII or Mermaid) over long text when explaining structure or flow.

