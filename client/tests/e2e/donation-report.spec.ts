import { test, expect } from '@playwright/test'
import { gotoStable, loginViaUi } from './lib/ui'

const OWNER = { email: 'owner@donate.app', password: 'Password123!' }
const SLUG = 'demo-campaign-1'

// Reports accumulate across projects/runs by design (the ledger is the
// product), so every assertion is relative to the raised total read at the
// start — never a hard-coded number. The unique reference ties the two
// tests together and keeps stale pendings from crashed runs irrelevant.
let reference = ''
// Pending amounts are shared state on the demo campaign (crashed runs can
// leave stale pendings behind), so every pending assertion is relative to
// what was already awaiting confirmation before this run's report.
let pendingBefore = 0

async function readRaisedAmount(page: import('@playwright/test').Page) {
  const text = await page
    .getByText(/BDT raised/)
    .first()
    .textContent()
  const match = text?.match(/([\d,]+) BDT raised/)
  expect(match, `raised line in "${text}"`).toBeTruthy()
  return Number((match![1] ?? '0').replace(/,/g, ''))
}

async function readPendingAmount(page: import('@playwright/test').Page) {
  const legend = page.getByText(/Awaiting confirmation: /)
  if ((await legend.count()) === 0) return 0
  const match = (await legend.first().textContent())?.match(/([\d,]+) BDT/)
  return match ? Number(match[1].replace(/,/g, '')) : 0
}

async function loginAsOwner(page: import('@playwright/test').Page) {
  await loginViaUi(page, OWNER.email, OWNER.password)
}

test.describe.serial('Donation reports', () => {
  test('When a donor reports an out-of-band donation, it stays pending', async ({
    page,
  }) => {
    reference = `E2E-TRX-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    await gotoStable(page, `/campaigns/detail?slug=${SLUG}`)
    const raisedBefore = await readRaisedAmount(page)
    pendingBefore = await readPendingAmount(page)

    await page.getByRole('button', { name: 'I donated' }).click()
    await page.getByLabel('Amount', { exact: true }).fill('750')
    await page.getByLabel('Method').selectOption('bkash')
    await page.getByLabel(/Reference \/ TrxID/).fill(reference)
    await page.getByLabel('Your name').fill('E2E Donor')
    await page.getByRole('button', { name: 'Send report' }).click()

    await expect(
      page.getByRole('heading', { name: 'Thank you!' })
    ).toBeVisible()
    // The donor is told exactly where their money stands: reported and
    // awaiting the fundraiser's confirmation, not yet part of the total.
    await expect(
      page.getByText('Awaiting confirmation', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(/until they confirm it.*awaiting confirmation/i)
    ).toBeVisible()

    // Pending reports never move the public total, but they DO show as
    // awaiting confirmation — on the detail page…
    await gotoStable(page, `/campaigns/detail?slug=${SLUG}`)
    expect(await readRaisedAmount(page)).toBe(raisedBefore)
    expect(await readPendingAmount(page)).toBe(pendingBefore + 750)

    // …and on the campaign card in the public listing.
    await gotoStable(page, '/campaigns')
    await expect(
      page.getByText('+750 BDT awaiting confirmation').first()
    ).toBeVisible()
  })

  test('When the organization confirms a report, raised increases', async ({
    page,
  }) => {
    await loginAsOwner(page)
    await gotoStable(page, '/dashboard/donations')

    // The cross-campaign ledger needs no campaign selection; scope to the
    // review queue and target THIS run's report by its unique reference —
    // stale pendings from crashed runs must not count.
    const queueSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Awaiting confirmation' }),
    })
    const pendingRow = queueSection
      .locator('li', { hasText: reference })
      .first()
    await expect(pendingRow).toBeVisible({ timeout: 15000 })

    await gotoStable(page, `/campaigns/detail?slug=${SLUG}`)
    const raisedBefore = await readRaisedAmount(page)

    await gotoStable(page, '/dashboard/donations')
    const row = page
      .locator('section', {
        has: page.getByRole('heading', { name: 'Awaiting confirmation' }),
      })
      .locator('li', { hasText: reference })
      .first()
    await row.getByRole('button', { name: 'Confirm' }).click()

    // The report leaves the queue…
    await expect(
      queueSection.locator('li', { hasText: reference }).first()
    ).toHaveCount(0)

    // …lands in the confirmed ledger…
    const confirmedSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Confirmed', exact: true }),
    })
    await expect(confirmedSection.getByText(reference).first()).toBeVisible()

    // …and the public total moves only on confirmation.
    await gotoStable(page, `/campaigns/detail?slug=${SLUG}`)
    expect(await readRaisedAmount(page)).toBe(raisedBefore + 750)
    // The confirmed amount leaves the pending display — back to whatever
    // was already awaiting confirmation before this run reported.
    expect(await readPendingAmount(page)).toBe(pendingBefore)
  })
})
