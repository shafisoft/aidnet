'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import { useOrgOverview } from '@/hooks/useOrgOverview'
import { useOrgDonationReports } from '@/hooks/useOrgDonationReports'
import { OrgConsolePage } from '@/components/console/OrgConsolePage'
import { StatCard } from '@/components/console/StatCard'
import { OrgReportSection } from '@/components/org/OrgReportRow'
import { usePageTitle } from '@/hooks/usePageTitle'

// Overview (docs/ux-restructure-plan.md §2): answers "what needs me?" —
// the pending-confirmation queue leads, the org's numbers sit beside it.
// The old welcome/get-started/quick-stats card stack is gone; onboarding
// is a contextual empty state (OrgConsolePage) and account cards moved to
// /profile.
export default function DashboardPage() {
  const { t } = useTranslation()
  usePageTitle(t('titles.dashboard'))

  return (
    <OrgConsolePage title={t('console.sections.overview')}>
      <OverviewContent />
    </OrgConsolePage>
  )
}

function OverviewContent() {
  const { t } = useTranslation()
  const { currentOrg } = useOrganization()
  const { isOrgAdmin } = usePermissions()
  const orgId = currentOrg?.id ?? null

  const {
    overview,
    loading: statsLoading,
    error: statsError,
    reload: reloadStats,
  } = useOrgOverview(orgId)
  // Donation RPCs gate on donations:manage, so plain members skip the
  // queue call entirely instead of collecting a permission error.
  const {
    reports: pendingReports,
    loading: queueLoading,
    error: queueError,
    confirm: confirmReport,
    reject: rejectReport,
  } = useOrgDonationReports(isOrgAdmin() ? orgId : null, 'pending', 10)

  const onConfirm = useCallback(
    async (id: string) => {
      await confirmReport(id)
      // Confirming moves the public raised total — refresh the stat row.
      void reloadStats()
    },
    [confirmReport, reloadStats]
  )
  const onReject = useCallback(
    async (id: string) => {
      await rejectReport(id)
      void reloadStats()
    },
    [rejectReport, reloadStats]
  )

  return (
    <div className="space-y-6">
      {statsError && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4"
          role="alert"
        >
          <p className="text-sm text-destructive">
            {t('dashboard.statsError')}
          </p>
          <button
            type="button"
            onClick={() => void reloadStats()}
            className="mt-2 rounded-md border border-destructive/40 bg-card px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            {t('errors.tryAgain')}
          </button>
        </div>
      )}

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t('dashboard.statRaised')}
            value={overview.raised_total.toLocaleString()}
            tone="positive"
          />
          <StatCard
            label={t('dashboard.statLive')}
            value={overview.live_campaigns}
            href="/dashboard/campaigns"
          />
          {isOrgAdmin() && (
            <StatCard
              label={t('dashboard.statPendingConfirmations')}
              value={overview.pending_donation_reports}
              href="/dashboard/donations"
              tone={
                overview.pending_donation_reports > 0 ? 'attention' : 'default'
              }
            />
          )}
          <StatCard
            label={t('dashboard.statDrafts')}
            value={overview.draft_campaigns}
            href="/dashboard/campaigns"
          />
        </div>
      )}

      {statsLoading && !overview && !statsError && (
        <div className="text-sm text-muted-foreground">
          {t('common.loading')}
        </div>
      )}

      {isOrgAdmin() && (
        <OrgReportSection
          heading={t('dashboard.attentionTitle')}
          action={
            <Link
              href="/dashboard/donations"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t('dashboard.attentionAll')}
            </Link>
          }
          reports={pendingReports}
          loading={queueLoading}
          error={queueError}
          errorText={t('dashboard.queueError')}
          emptyText={t('dashboard.attentionEmpty')}
          reviewable
          onConfirm={id => void onConfirm(id)}
          onReject={id => void onReject(id)}
        />
      )}
    </div>
  )
}
