import { test, expect } from '@playwright/test'
import { registerViaApi } from './lib/api'
import {
  expectConsoleSection,
  gotoStable,
  loginViaUi,
  openAdminSection,
  settleAfterLogin,
} from './lib/ui'

const ADMIN_PASSWORD = 'Password123!'
const ADMIN_EMAIL = 'admin@donate.app'
const TEST_PASSWORD = 'TestPass123!'

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD)
  await settleAfterLogin(page)
}

async function loginAsUser(
  page: import('@playwright/test').Page,
  email: string,
  password: string
) {
  await loginViaUi(page, email, password)
}

test.describe.serial('Admin Pages - Org Request Workflow', () => {
  test('When system admin loads /admin, system stats are shown', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/')

    // Scope to main: on mobile the nav "Organizations" link is display:none
    // but still first in DOM order, which would win over the stat card.
    const main = page.locator('main')
    await expect(page.locator('h1')).toContainText('System Admin')
    await expect(main.getByText('Organizations', { exact: true })).toBeVisible()
    await expect(main.getByText('Users', { exact: true })).toBeVisible()
    await expect(main.getByText('Members', { exact: true })).toBeVisible()
    await expect(main.getByText('Recent Signups')).toBeVisible()
  })

  test('When system admin views /admin, the console lists the admin sections', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/')
    await expect(page.locator('h1')).toContainText('System Admin')
    // All admin destinations live in one place now: the console sidebar
    // (desktop) or the drawer (mobile) — same sections, no dropdown.
    await expectConsoleSection(page, 'Admin navigation', 'Org requests')
  })

  test('When admin opens the Org requests section, navigates to /admin/org-requests', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/')
    await expect(page.locator('h1')).toContainText('System Admin')
    await openAdminSection(page, 'Org requests')
    await expect(page).toHaveURL(/\/admin\/org-requests/)
  })

  test('When system admin loads /admin/org-requests, requests list renders', async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await gotoStable(page, '/admin/org-requests/')
    await expect(page.locator('h1')).toContainText('Organization Requests')
    // Status filter renders as toggle buttons: All (n), Pending (n), ...
    await expect(
      page.getByRole('button', { name: /^All \(\d+\)$/ })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Pending \(\d+\)$/ })
    ).toBeVisible()
  })

  test('When system admin approves request, organization is created', async ({
    page,
  }) => {
    const requesterEmail = `approve-test-${Date.now()}@example.com`
    const orgName = `Approve Test Org ${Date.now()}`
    const orgSlug = `approve-test-org-${Date.now()}`

    // Create requester via API, login via UI, submit request
    await registerViaApi(
      page,
      requesterEmail,
      TEST_PASSWORD,
      'Approve Test User'
    )
    await loginAsUser(page, requesterEmail, TEST_PASSWORD)

    await gotoStable(page, '/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Login as system admin and approve
    await loginAsAdmin(page)

    await gotoStable(page, '/admin/org-requests/')
    // Target THIS request card (list + modal both render the name)
    const card = page.locator('div.rounded-lg.bg-white', { hasText: orgName })
    await expect(card).toBeVisible()

    // Click Review button
    await card.getByRole('button', { name: 'Review' }).click()
    await expect(page.getByText('Review Organization Request')).toBeVisible()
    await expect(page.getByRole('heading', { name: orgName })).toBeVisible()

    // Approve
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(
      page.getByText('Organization approved and created successfully!')
    ).toBeVisible()

    // Verify request shows as approved (filter count includes it)
    await expect(
      page.getByRole('button', { name: /^Approved \([1-9]/ })
    ).toBeVisible()
  })

  test('When system admin rejects request with reason, shows rejection', async ({
    page,
  }) => {
    const requesterEmail = `reject-test-${Date.now()}@example.com`
    const orgName = `Reject Test Org ${Date.now()}`
    const orgSlug = `reject-test-org-${Date.now()}`
    const rejectionReason = 'Not suitable for our platform'

    // Create requester via API, login via UI, submit request
    await registerViaApi(
      page,
      requesterEmail,
      TEST_PASSWORD,
      'Reject Test User'
    )
    await loginAsUser(page, requesterEmail, TEST_PASSWORD)

    await gotoStable(page, '/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Login as system admin and reject
    await loginAsAdmin(page)

    await gotoStable(page, '/admin/org-requests/')
    const rejectCard = page.locator('div.rounded-lg.bg-white', {
      hasText: orgName,
    })
    await expect(rejectCard).toBeVisible()

    // Click Review and reject with reason
    await rejectCard.getByRole('button', { name: 'Review' }).click()
    await page
      .getByPlaceholder('Explain why this request is being rejected')
      .fill(rejectionReason)
    await page.getByRole('button', { name: 'Reject', exact: true }).click()

    await expect(page.getByText('Organization request rejected.')).toBeVisible()

    // Verify THIS request's card shows as rejected with the reason
    await expect(
      rejectCard.getByText(`Rejection Reason: ${rejectionReason}`)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Rejected \([1-9]/ })
    ).toBeVisible()
  })

  test('When system_admin manages org status, can suspend and reactivate', async ({
    page,
  }) => {
    const orgName = `Status Test Org ${Date.now()}`
    const orgSlug = `status-test-org-${Date.now()}`

    // Create requester via API, login via UI, submit request
    const requesterEmail = `status-test-${Date.now()}@example.com`
    await registerViaApi(
      page,
      requesterEmail,
      TEST_PASSWORD,
      'Status Test User'
    )
    await loginAsUser(page, requesterEmail, TEST_PASSWORD)

    await gotoStable(page, '/org/request')
    await page.getByPlaceholder('My Organization').fill(orgName)
    await page.getByPlaceholder('my-organization').fill(orgSlug)
    await page.getByRole('button', { name: 'Submit for Review' }).click()
    await expect(page.getByText('Request Pending Review')).toBeVisible()

    // Login as system admin and approve
    await loginAsAdmin(page)

    await gotoStable(page, '/admin/org-requests/')
    const approveCard = page.locator('div.rounded-lg.bg-white', {
      hasText: orgName,
    })
    // The queue can hold dozens of pending requests: give the list fetch +
    // render extra headroom on emulated mobile browsers.
    await expect(approveCard).toBeVisible({ timeout: 15000 })
    await approveCard.getByRole('button', { name: 'Review' }).click()
    await page.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(
      page.getByText('Organization approved and created successfully!')
    ).toBeVisible()

    // Suspend and reactivate via the proper org-management page (/admin/orgs)
    await gotoStable(page, '/admin/orgs')
    // Suspending asks for confirmation: accept the native dialog.
    page.on('dialog', dialog => void dialog.accept())
    const orgRow = page.locator(`tr:has(td:has-text("${orgName}"))`)
    const suspendButton = orgRow.getByRole('button', { name: 'Suspend' })
    await expect(suspendButton).toBeVisible()
    await suspendButton.click()

    await expect(
      page.getByText('Organization status updated to suspended.')
    ).toBeVisible()

    // Reactivate the org
    const reactivateButton = page
      .locator(`tr:has(td:has-text("${orgName}"))`)
      .getByRole('button', { name: 'Activate' })
    await expect(reactivateButton).toBeVisible()
    await reactivateButton.click()

    await expect(
      page.getByText('Organization status updated to active.')
    ).toBeVisible()
  })
})
