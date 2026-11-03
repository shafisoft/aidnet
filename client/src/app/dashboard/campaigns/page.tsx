'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { useCampaigns } from '@/hooks/useCampaigns'
import { usePermissions } from '@/hooks/usePermissions'
import { OrgConsolePage } from '@/components/console/OrgConsolePage'
import { usePageTitle } from '@/hooks/usePageTitle'

// Campaigns (docs/ux-restructure-plan.md §2): answers "how are they
// doing?" — every row shows raised vs goal and its pipeline state, with
// the pipeline action (submit for review) inline. Same content the old
// tabs page buried behind the org section.
function DashboardCampaignsContent() {
  const { t } = useTranslation()
  const { currentOrg } = useOrganization()
  const { hasPermission } = usePermissions()
  const { campaigns, loading, error, submit, publish, remove } = useCampaigns(
    currentOrg?.id
  )
  // Personal orgs self-publish (publish_campaign, caps in the DB);
  // organizations keep the system-admin review queue.
  const isPersonal = currentOrg?.kind === 'personal'
  const pipelineAction = isPersonal ? publish : submit

  usePageTitle(t('titles.dashboard'))

  const canCreate = hasPermission('campaigns:create')

  return (
    <OrgConsolePage
      title={t('console.sections.campaigns')}
      description={currentOrg?.name}
      actions={
        canCreate ? (
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('dashboardCampaigns.new')}
          </Link>
        ) : undefined
      }
    >
      {loading && (
        <div className="py-8 text-muted-foreground">{t('common.loading')}</div>
      )}
      {error && <div className="py-8 text-destructive">{error}</div>}

      {!loading && !error && campaigns.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground shadow-sm">
          {t('dashboardCampaigns.empty')}{' '}
          {canCreate && (
            <Link
              href="/dashboard/campaigns/new"
              className="font-medium text-primary hover:underline"
            >
              {t('dashboardCampaigns.createFirst')}
            </Link>
          )}
        </div>
      )}

      {!loading && !error && campaigns.length > 0 && (
        <div className="divide-y rounded-lg border bg-card shadow-sm">
          {campaigns.map(c => (
            <CampaignRow
              key={c.id}
              campaign={c}
              canDelete={hasPermission('campaigns:delete')}
              isPersonal={isPersonal}
              onPipelineAction={() => pipelineAction(c.id)}
              onRemove={() => remove(c.id)}
            />
          ))}
        </div>
      )}
    </OrgConsolePage>
  )
}

function CampaignRow({
  campaign,
  canDelete,
  isPersonal,
  onPipelineAction,
  onRemove,
}: {
  campaign: ReturnType<typeof useCampaigns>['campaigns'][number]
  canDelete: boolean
  isPersonal: boolean
  onPipelineAction: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const c = campaign
  const percent =
    c.goal_amount && c.goal_amount > 0
      ? Math.min(100, Math.round((c.raised_amount / c.goal_amount) * 100))
      : null

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{c.title}</span>
          <StatusBadge status={c.status} />
          {c.is_zakat_eligible && (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              {t('campaignCard.zakatBadge')}
            </span>
          )}
        </div>
        {/* Raised-vs-goal leads (the number the operator scans for); the
            slug is the quiet technical line after it. Keeping the slug away
            from the amount also keeps row textContent digit-separated for
            the e2e slug regex. */}
        <p className="mt-1 text-sm text-muted-foreground">
          {c.goal_amount
            ? t('dashboardCampaigns.raisedOfGoal', {
                raised: c.raised_amount.toLocaleString(),
                goal: c.goal_amount.toLocaleString(),
              })
            : t('campaignCard.raised', {
                amount: c.raised_amount.toLocaleString(),
                currency: 'BDT',
              })}
          {percent !== null ? ` · ${percent}%` : ''}
        </p>
        <p className="text-sm text-muted-foreground">/{c.slug}</p>
        <div
          className="mt-2 h-1.5 max-w-64 overflow-hidden rounded-full bg-muted"
          role="presentation"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${percent ?? 0}%` }}
          />
        </div>
      </div>
      <div className="flex flex-none flex-wrap items-center gap-2">
        {c.status === 'draft' || c.status === 'rejected' ? (
          <button
            type="button"
            onClick={onPipelineAction}
            className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isPersonal
              ? t('dashboardCampaigns.publish')
              : t('dashboardCampaigns.submitReview')}
          </button>
        ) : null}
        <Link
          href={`/dashboard/campaigns/edit?id=${c.id}`}
          className="inline-flex min-h-11 items-center rounded-md border px-4 py-2.5 text-sm font-medium hover:border-primary/40"
        >
          {t('common.edit')}
        </Link>
        {canDelete && c.status !== 'live' && (
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  t('dashboardCampaigns.deleteConfirm', { title: c.title })
                )
              )
                onRemove()
            }}
            className="min-h-11 rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            {t('common.delete')}
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation()
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    pending_review: 'bg-warning/10 text-warning',
    live: 'bg-success/10 text-success',
    rejected: 'bg-destructive/10 text-destructive',
    closed: 'bg-muted text-muted-foreground',
  }
  const value = status ?? 'draft'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[value] ?? map.draft}`}
    >
      {t(`status.${value}`, { defaultValue: value })}
    </span>
  )
}

export default function DashboardCampaignsPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-muted-foreground">
          {t('common.loading')}
        </div>
      }
    >
      <DashboardCampaignsContent />
    </Suspense>
  )
}
