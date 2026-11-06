import { test, expect } from '@playwright/test'
import { getPublicCampaigns, SUPABASE_URL } from './lib/api'
import { gotoStable } from './lib/ui'

// Campaign discovery + management e2e.
// Anon flows are self-contained. Authenticated flows use storage states
// produced by auth.setup.ts (owner = org owner, systemAdmin).

const OWNER_STATE = 'tests/e2e/.auth/orgOwner.json'
const ADMIN_STATE = 'tests/e2e/.auth/systemAdmin.json'

test.describe('Landing — latest campaigns', () => {
  test('When anon loads landing, Latest Campaigns section and See more show', async ({
    page,
  }) => {
    await gotoStable(page, '/')
    await expect(
      page.getByRole('heading', { name: 'Latest Campaigns' })
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'See more' })).toBeVisible()
  })

  test('When anon clicks See more, navigates to public campaign list', async ({
    page,
  }) => {
    await gotoStable(page, '/')
    await page.getByRole('link', { name: 'See more' }).click()
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(
      page.getByRole('heading', { name: 'Discover Campaigns' })
    ).toBeVisible()
  })

  test('When landing renders, Latest Campaigns shows at most 12 cards', async ({
    page,
  }) => {
    await gotoStable(page, '/')
    await expect(
      page.getByRole('heading', { name: 'Latest Campaigns' })
    ).toBeVisible()
    const cards = page.locator('a[href^="/campaigns/detail"]')
    expect(await cards.count()).toBeLessThanOrEqual(12)
  })
})

test.describe('Public discovery + filters', () => {
  test('When anon opens /campaigns, UI lists the same live campaigns the API returns', async ({
    page,
    request,
  }) => {
    await gotoStable(page, '/campaigns')
    await expect(
      page.getByRole('heading', { name: 'Discover Campaigns' })
    ).toBeVisible()

    // API contract: the public discovery RPC is the source of truth the page
    // renders. Asserting it first isolates a data-layer regression (API returns
    // nothing) from a UI regression (API fine but page empty).
    test.skip(
      !SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL not set — skipping API check'
    )
    // Seed data can lag under full-suite load; poll for campaigns to appear
    // before asserting the API contract (isolates data-layer lag from UI bugs).
    let apiCampaigns: Awaited<ReturnType<typeof getPublicCampaigns>> = []
    await expect
      .poll(async () => {
        apiCampaigns = await getPublicCampaigns(request)
        return apiCampaigns.length
      })
      .toBeGreaterThan(0)

    // At least one API campaign is reflected in the UI. The link accessible
    // name includes extra text beyond the title (e.g. "Campaign 14 A"), so
    // match by title substring and take first — the title is unique enough
    // to narrow to one campaign.
    await expect(
      page.getByRole('link', { name: apiCampaigns[0].title }).first()
    ).toBeVisible()
  })

  test('When anon clicks Zakat Eligible, URL gets zakat=true and filter stays active', async ({
    page,
  }) => {
    await gotoStable(page, '/campaigns')
    await page.getByRole('link', { name: /Zakat Eligible/ }).click()
    await expect(page).toHaveURL(/zakat=true/)
    await expect(
      page.getByRole('link', { name: 'Zakat Eligible' })
    ).toBeVisible()
  })

  test('When anon opens an unavailable campaign slug, Campaign Not Available is shown', async ({
    page,
  }) => {
    await gotoStable(page, '/campaigns/detail?slug=does-not-exist')
    await expect(
      page.getByRole('heading', { name: 'Campaign Not Available' })
    ).toBeVisible()
  })

  test('When anon clicks Clear filter, zakat param is removed', async ({
    page,
  }) => {
    await gotoStable(page, '/campaigns/?zakat=true')
    await expect(page.getByRole('link', { name: 'Clear filter' })).toBeVisible()
    await page.getByRole('link', { name: 'Clear filter' }).click()
    await expect(page).toHaveURL(/\/campaigns\/?$/)
  })

  // Pagination contract: the RPC pages by limit+offset and the UI paginates
  // on top of it (seed-auth.sh plants 30 live demo campaigns > page size 24).
  test('When the RPC pages, limit and offset return disjoint slices', async ({
    request,
  }) => {
    test.skip(
      !SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL not set — skipping API check'
    )
    const page1 = await getPublicCampaigns(request, { limit: 5 })
    const page2 = await getPublicCampaigns(request, { limit: 5, offset: 5 })

    expect(page1).toHaveLength(5)
    expect(page2).toHaveLength(5)
    const page1Ids = new Set(page1.map(c => c.id))
    for (const c of page2) {
      expect(page1Ids.has(c.id), 'offset must not repeat page-1 rows').toBe(
        false
      )
    }
  })

  test('When anon loads /campaigns with more than a page of live campaigns, only the first page renders', async ({
    page,
    request,
  }) => {
    test.skip(
      !SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL not set — skipping API check'
    )
    // Seed guard: pagination UI only shows when total > page size (24).
    let total = 0
    await expect
      .poll(async () => {
        total = (await getPublicCampaigns(request, { limit: 100 })).length
        return total
      })
      .toBeGreaterThan(24)

    await gotoStable(page, '/campaigns')
    await expect(
      page.getByRole('heading', { name: 'Discover Campaigns' })
    ).toBeVisible()
    await expect(page.locator('a[href^="/campaigns/detail"]')).toHaveCount(24)
  })

  test('When anon clicks Load more campaigns, the remaining campaigns render and the button disappears', async ({
    page,
    request,
  }) => {
    test.skip(
      !SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL not set — skipping API check'
    )
    let total = 0
    await expect
      .poll(async () => {
        total = (await getPublicCampaigns(request, { limit: 100 })).length
        return total
      })
      .toBeGreaterThan(24)

    await gotoStable(page, '/campaigns')
    const cards = page.locator('a[href^="/campaigns/detail"]')
    await expect(cards).toHaveCount(24)

    await page.getByRole('button', { name: 'Load more campaigns' }).click()
    await expect(cards).toHaveCount(total)
    await expect(
      page.getByRole('button', { name: 'Load more campaigns' })
    ).toBeHidden()
  })

  test('When anon clicks Home, navigates to landing', async ({ page }) => {
    await gotoStable(page, '/campaigns/')
    await page.getByRole('link', { name: /Home/ }).click()
    await expect(page).toHaveURL('/')
  })
})

test.describe.serial('Founder + Admin lifecycle', () => {
  let slug = ''

  test.describe('as org owner', () => {
    test.use({ storageState: OWNER_STATE })

    test('When owner creates and submits a campaign, it enters pending review', async ({
      page,
    }) => {
      // Setup preselected demo-org for the owner
      await gotoStable(page, '/dashboard/campaigns')
      await page.getByRole('link', { name: 'New Campaign' }).click()

      const title = `E2E Lifecycle ${Date.now()}`
      await page.getByLabel('Title', { exact: true }).fill(title)
      await page.getByRole('button', { name: 'Create Campaign' }).click()
      await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)

      await page
        .getByRole('button', { name: 'Submit for Review' })
        .first()
        .click()
      await expect(
        page.getByText(/pending_review|pending/i).first()
      ).toBeVisible()

      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    })
  })

  test.describe('as system admin', () => {
    test.use({ storageState: ADMIN_STATE })

    test('When admin verifies submitted campaign, it goes live publicly', async ({
      page,
    }) => {
      test.skip(
        !slug,
        'Founder lifecycle step did not produce a campaign to verify'
      )

      await gotoStable(page, `/admin/campaigns/?slug=${slug}`)
      // Review screen shows the submitted campaign inline
      await expect(
        page.getByRole('button', { name: 'Verify & Publish' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Verify & Publish' }).click()
      await expect(page.getByText(/verified and published/i)).toBeVisible()
    })

    test('When campaign is verified, anon RPC exposes it publicly (domain rule)', async ({
      page,
    }) => {
      test.skip(
        !process.env.NEXT_PUBLIC_SUPABASE_URL,
        'NEXT_PUBLIC_SUPABASE_URL not set — run against a local Supabase instance'
      )
      const targetSlug = slug

      // Domain rule: get_campaign_by_slug must expose the published campaign
      // without any user session — call it with the anon key only.
      const res = await page.request.post(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_campaign_by_slug`,
        {
          data: { p_slug: targetSlug },
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }
      )
      const body = await res.json().catch(() => null)
      // Created+verified campaign must be visible to anon
      expect(Array.isArray(body) ? body.length > 0 : !!body).toBeTruthy()
    })
  })
})
