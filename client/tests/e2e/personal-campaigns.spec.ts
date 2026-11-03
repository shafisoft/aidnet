import { test, expect } from '@playwright/test'
import { anonRpc, rpc, signIn, USERS } from './lib/api'
import { gotoStable, orgReady } from './lib/ui'

// Individual fundraiser journey: a user with NO organization self-serves a
// campaign. Create-as-individual lazily provisions their personal org
// (ensure_my_personal_org), the campaign SELF-publishes (no review queue),
// the public can flag it, and the system admin keeps post-publish
// oversight: resolve abuse reports and take the campaign down.
// Uses the seeded org-less `individual@donate.app` (seed-auth.sh deletes any
// personal org left by earlier runs, so the journey always starts fresh).

const INDIVIDUAL_STATE = 'tests/e2e/.auth/individual.json'
const ADMIN_STATE = 'tests/e2e/.auth/systemAdmin.json'

test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_URL not set — run against a local Supabase instance'
)

test.describe.serial('Individual fundraiser journey', () => {
  let slug = ''
  const bkash = '01755500000'

  test.describe('as org-less individual', () => {
    test.use({ storageState: INDIVIDUAL_STATE })

    test('When an org-less user creates as individual, they publish the campaign themselves', async ({
      page,
    }) => {
      await gotoStable(page, '/dashboard/campaigns/new')
      await orgReady(page)

      // All five browser engines run this against ONE shared database, and
      // ensure_my_personal_org is sticky: only the first engine to get here
      // still sees the org-less choice UI. The winners verify the journey;
      // the rest skip instead of failing on the provisioned form.
      const cta = page.getByRole('button', { name: /start my own fundraiser/i })
      const choiceShown = await cta.isVisible()
      test.skip(
        !choiceShown,
        'personal org already provisioned by a parallel engine on the shared DB'
      )

      // No org yet: all three routes to a campaign are offered.
      await expect(
        page.getByRole('link', { name: 'Register a new organization' })
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'I have an invite' })
      ).toBeVisible()
      // The onboarding card re-mounts while the OrganizationProvider
      // finishes its bootstrap — wait, or the click hits a detached node.
      await orgReady(page)
      await cta.click()

      // Personal org provisioned + selected: the regular form renders.
      const title = `E2E Personal ${Date.now()}`
      await page.getByLabel('Title', { exact: true }).fill(title)
      await page.getByLabel('bKash number').fill(bkash)
      await page.getByRole('button', { name: 'Create Campaign' }).click()
      await expect(page).toHaveURL(/\/dashboard\/campaigns\/?$/)

      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      // Personal orgs skip the review queue: Publish, not Submit for
      // Review — and it goes live without any admin step.
      await page.getByRole('button', { name: 'Publish' }).first().click()
      await expect(page.getByText('Live').first()).toBeVisible({
        timeout: 15000,
      })
    })
  })

  test.describe('contract', () => {
    test('When provisioning happened, the personal org, membership and campaign payment channels check out via RPC', async ({
      request,
    }) => {
      test.skip(!slug, 'UI step did not produce a campaign')

      const session = await signIn(
        request,
        USERS.individual.email,
        USERS.individual.password
      )

      const orgs = await rpc<
        Array<{ id: string; kind: string; status: string }>
      >(request, session, 'get_my_organizations')
      expect(orgs).toHaveLength(1)
      expect(orgs[0].kind).toBe('personal')
      expect(orgs[0].status).toBe('active')
      const orgId = orgs[0].id

      // Sole owner-admin: the standard gates must hold unchanged.
      const membership = await rpc<Array<{ role: string; is_owner: boolean }>>(
        request,
        session,
        'get_membership',
        { p_org_id: orgId }
      )
      expect(membership[0].role).toBe('admin')
      expect(membership[0].is_owner).toBe(true)

      const campaigns = await rpc<Array<{ id: string; slug: string }>>(
        request,
        session,
        'get_campaigns',
        { p_org_id: orgId }
      )
      const created = campaigns.find(c => c.slug === slug)
      expect(created, 'campaign listed under the personal org').toBeTruthy()

      const methods = await rpc<Array<{ bkash_number: string | null }>>(
        request,
        session,
        'get_campaign_payment_methods',
        { p_campaign_id: created!.id }
      )
      expect(methods[0]?.bkash_number).toBe(bkash)
    })
  })

  test.describe('as anonymous visitor', () => {
    // Default project state: not signed in — exactly who reports abuse.
    test('When a visitor flags the live campaign, the report is accepted anonymously', async ({
      page,
    }) => {
      test.skip(!slug, 'UI step did not produce a campaign')

      await gotoStable(page, `/campaigns/detail/?slug=${slug}`)
      await page.getByRole('button', { name: 'Report this campaign' }).click()
      await page
        .getByLabel('What is wrong?')
        .selectOption({
          label: 'It is fraud — the money will not reach the cause',
        })
      await page
        .getByLabel('Tell us more')
        .fill('E2E: the pictures are stolen from another fundraiser.')
      await page.getByLabel('Your email or phone').fill('witness@example.com')
      await page.getByRole('button', { name: 'Send report' }).click()

      await expect(
        page.getByRole('heading', { name: 'Thank you' })
      ).toBeVisible()
    })
  })

  test.describe('as system admin', () => {
    test.use({ storageState: ADMIN_STATE })

    test('When admin reviews the self-published campaign, they resolve the abuse report and take it down', async ({
      page,
      request,
    }) => {
      test.skip(!slug, 'UI step did not produce a campaign')

      // Live personal campaign is publicly readable before the takedown.
      const before = await anonRpc<Array<{ slug: string }>>(
        request,
        'get_public_campaign_by_slug',
        { p_slug: slug }
      )
      expect(before).toHaveLength(1)

      await gotoStable(page, '/admin/campaigns/')

      // Post-publish oversight: the self-published campaign shows in its
      // own section — it never passed through the pending queue.
      await expect(
        page.getByRole('heading', { name: 'Personal fundraisers' })
      ).toBeVisible()
      // The row prints "/{slug} · {org name}" under the title.
      await expect(page.getByText(`/${slug} ·`, { exact: false })).toBeVisible()

      // The visitor's report waits in the abuse section.
      await expect(
        page.getByRole('heading', { name: 'Abuse reports' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Mark resolved' }).first().click()
      await expect(page.getByText(/Report marked as resolved/i)).toBeVisible()

      // Takedown confirm is a native dialog — accept it, then the
      // campaign disappears from every public read.
      page.on('dialog', dialog => dialog.accept())
      await page
        .getByRole('button', { name: 'Take down', exact: true })
        .first()
        .click()
      await expect(page.getByText(/Campaign taken down/i)).toBeVisible()

      const after = await anonRpc<Array<{ slug: string }>>(
        request,
        'get_public_campaign_by_slug',
        { p_slug: slug }
      )
      expect(after).toHaveLength(0)
    })
  })
})
