import { test, expect } from '@playwright/test'
import { AdminPlansPage } from './pages/AdminPages'
import { gotoStable } from './lib/ui'

const OWNER_STATE = 'tests/e2e/.auth/orgOwner.json'
const ADMIN_STATE = 'tests/e2e/.auth/systemAdmin.json'

test.describe('System Admin - Plan Management', () => {
  test.describe(() => {
    test.use({ storageState: ADMIN_STATE })

    test('When system admin opens /admin/plans, plans management loads', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      expect(await plans.open()).toBe('allowed')
      await expect(
        page.getByRole('heading', { name: 'Subscription Plans' })
      ).toBeVisible()
    })

    test('When admin opens Create Plan, form shows required fields', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await page.getByRole('button', { name: 'Create Plan' }).click()
      await expect(
        page.locator('h2').filter({ hasText: 'Create Plan' })
      ).toBeVisible()
      // Name + description; features are pick-list chips, not free text.
      const inputs = page.getByRole('textbox')
      expect(await inputs.count()).toBeGreaterThanOrEqual(2)
      await expect(
        page.getByRole('button', { name: 'Members', exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Donations', exact: true })
      ).toBeVisible()
    })

    test('When admin cancels Create Plan, form closes', async ({ page }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await page.getByRole('button', { name: 'Create Plan' }).click()
      await expect(
        page.locator('h2').filter({ hasText: 'Create Plan' })
      ).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(
        page.locator('h2').filter({ hasText: 'Create Plan' })
      ).not.toBeVisible()
    })

    test('When admin opens /admin/plans, seeded plans are listed', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await expect(page.locator('table')).toBeVisible()
      await expect(page.getByText('Free')).toBeVisible()
      await expect(page.getByText('Pro')).toBeVisible()
      await expect(page.getByText('Enterprise')).toBeVisible()
    })

    test('When plans listed, each row offers edit and activate/deactivate', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      // Plans load asynchronously after the heading renders; wait for the
      // table rows to appear before counting action buttons.
      await page.getByRole('button', { name: 'Edit' }).first().waitFor()
      expect(
        await page.getByRole('button', { name: 'Edit' }).count()
      ).toBeGreaterThanOrEqual(3)
      expect(
        await page.getByRole('button', { name: /Activate|Deactivate/ }).count()
      ).toBeGreaterThanOrEqual(3)
    })

    test('When admin clicks Edit, form opens pre-filled', async ({ page }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await page.getByRole('button', { name: 'Edit' }).first().click()
      await expect(
        page.locator('h2').filter({ hasText: 'Edit Plan' })
      ).toBeVisible()
      const nameInput = page
        .locator('.bg-white.p-6.rounded-lg.shadow input[type="text"]')
        .first()
      expect((await nameInput.inputValue()).length).toBeGreaterThan(0)
    })

    test('When admin submits new plan, plan appears in table', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await page.getByRole('button', { name: 'Create Plan' }).click()
      const nameInput = page
        .locator('.bg-white.p-6.rounded-lg.shadow input[type="text"]')
        .first()
      const planName = `E2E Plan ${Date.now()}`
      await nameInput.fill(planName)
      await page.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(page.getByText(planName)).toBeVisible()
    })

    test('When admin selects feature chips and creates a plan, the selected features appear on the plan', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      await plans.open()

      await page.getByRole('button', { name: 'Create Plan' }).click()
      const panel = page.locator('.bg-white.p-6.rounded-lg.shadow')
      const planName = `E2E Chip Plan ${Date.now()}`
      await panel.locator('input[type="text"]').first().fill(planName)

      const membersChip = panel.getByRole('button', {
        name: 'Members',
        exact: true,
      })
      const donationsChip = panel.getByRole('button', {
        name: 'Donations',
        exact: true,
      })
      await expect(membersChip).toHaveAttribute('aria-pressed', 'false')
      await membersChip.click()
      await donationsChip.click()
      await expect(membersChip).toHaveAttribute('aria-pressed', 'true')
      await expect(donationsChip).toHaveAttribute('aria-pressed', 'true')

      await panel.getByRole('button', { name: 'Create', exact: true }).click()
      const row = page.locator('table tbody tr').filter({ hasText: planName })
      await expect(row).toBeVisible()
      await expect(row.getByText('Members')).toBeVisible()
      await expect(row.getByText('Donations')).toBeVisible()
    })

    test('When admin opens /admin/campaigns, review queue loads', async ({
      page,
    }) => {
      await gotoStable(page, '/admin/campaigns')
      await expect(
        page.getByRole('heading', { name: 'Campaign Review Queue' })
      ).toBeVisible()
    })

    test('When admin opens /admin/campaigns, pending campaigns or empty state shows', async ({
      page,
    }) => {
      await gotoStable(page, '/admin/campaigns')
      const pendingItems = page.locator('a[href^="/admin/campaigns/?slug="]')
      const emptyState = page.getByText('No campaigns pending review')
      await expect(pendingItems.first().or(emptyState)).toBeVisible()
    })

    test('When admin opens /admin/subscriptions, heading and table render', async ({
      page,
    }) => {
      await gotoStable(page, '/admin/subscriptions')
      await expect(
        page.getByRole('heading', { name: 'Organization Subscriptions' })
      ).toBeVisible()
      await expect(page.locator('table')).toBeVisible()
    })
  })

  test.describe('non-admin is denied admin area', () => {
    test.use({ storageState: OWNER_STATE })

    test('When org owner opens /admin/plans, Access Denied is shown', async ({
      page,
    }) => {
      const plans = new AdminPlansPage(page)
      expect(await plans.open()).toBe('denied')
      await expect(
        page.getByRole('heading', { name: 'Access Denied' })
      ).toBeVisible()
    })
  })
})
