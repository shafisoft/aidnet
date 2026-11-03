import { test, expect } from '@playwright/test'
import { registerViaApi } from './lib/api'
import { gotoStable, loginViaUi } from './lib/ui'

const TEST_PASSWORD = 'TestPass123!'

// campaigns.slug is GLOBALLY unique, and each Playwright project (browser)
// is a separate process — a fixed title would make the second engine's
// create collide with the first's. Timestamp at module scope is unique
// per process, so per-engine slugs never clash.
const CAMPAIGN_TITLE = `Flood relief ${Date.now()}`

// The individual path: a person with no organization funds a cause from
// their own social profile. Registration → personal workspace (no admin
// queue) → campaign → self-publish → share row on the public page.
test.describe.serial('Personal Fundraiser - individual path', () => {
  test('When a new user starts their own fundraiser, they can publish a campaign without review', async ({
    page,
  }) => {
    // Registration + UI login + workspace provisioning is the slowest
    // journey in the suite on WebKit, and all browsers share one worker —
    // give it room instead of fighting engine-contention flake.
    test.setTimeout(120_000)
    const email = `personal-${Date.now()}@example.com`
    await registerViaApi(page, email, TEST_PASSWORD, 'Personal Test User')
    await loginViaUi(page, email, TEST_PASSWORD)

    await gotoStable(page, '/dashboard/campaigns/new')

    // No org yet → the route choice. Personal fundraiser skips the
    // org-request approval queue entirely.
    await expect(
      page.getByRole('heading', { name: 'How do you want to raise funds?' })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Start my own fundraiser' }).click()

    // Personal workspace provisioned → campaign form appears.
    const titleInput = page.getByRole('textbox', { name: 'Title', exact: true })
    await expect(titleInput).toBeVisible({ timeout: 15000 })
    await titleInput.fill(CAMPAIGN_TITLE)
    await page.getByRole('spinbutton', { name: /^Goal amount/ }).fill('5000')
    await page.getByRole('button', { name: 'Create Campaign' }).click()

    // Draft created → back on the list. Personal orgs see Publish, not
    // "Submit for review".
    await expect(page).toHaveURL(/\/dashboard\/campaigns/)
    const publish = page.getByRole('button', { name: 'Publish' })
    await expect(publish).toBeVisible({ timeout: 15000 })
    await publish.click()

    // Self-published: live immediately, no admin step.
    await expect(page.getByText('Live').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('When the published campaign is opened publicly, the share row is shown', async ({
    page,
  }) => {
    await gotoStable(page, '/campaigns/')
    const card = page
      .getByRole('link')
      .filter({ hasText: CAMPAIGN_TITLE })
      .first()
    await expect(card).toBeVisible({ timeout: 15000 })
    await card.click()

    await expect(
      page.getByRole('region', { name: 'Share this campaign' })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'WhatsApp' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Facebook' })).toBeVisible()
  })

  test('When a personal campaign exceeds the goal cap, the form explains the limit', async ({
    page,
  }) => {
    const email = `personal-cap-${Date.now()}@example.com`
    await registerViaApi(page, email, TEST_PASSWORD, 'Cap Test User')
    await loginViaUi(page, email, TEST_PASSWORD)

    await gotoStable(page, '/dashboard/campaigns/new')
    await page.getByRole('button', { name: 'Start my own fundraiser' }).click()
    const titleInput = page.getByRole('textbox', { name: 'Title', exact: true })
    await expect(titleInput).toBeVisible({ timeout: 15000 })
    await titleInput.fill(`Over the cap ${Date.now()}`)
    await page.getByRole('spinbutton', { name: /^Goal amount/ }).fill('200000')
    await page.getByRole('button', { name: 'Create Campaign' }).click()

    // Client-side cap mirrors publish_campaign; nothing is created.
    await expect(
      page.getByText('Personal campaign goal is capped at 100,000')
    ).toBeVisible()
    await expect(page).not.toHaveURL(/\/dashboard\/campaigns\/?$/)
  })
})
