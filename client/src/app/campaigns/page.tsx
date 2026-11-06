'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePublicCampaigns } from '@/hooks/usePublicCampaigns'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { GetInvolved } from '@/components/marketing/GetInvolved'
import { isUuid } from '@/hooks/useQueryParam'
import { usePageTitle } from '@/hooks/usePageTitle'

function CampaignsContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const zakatParam = searchParams.get('zakat')
  const orgParam = searchParams.get('org')

  const zakat = zakatParam === 'true'
  const org = orgParam && isUuid(orgParam) ? orgParam : null

  usePageTitle(t('campaigns.pageTitle'))
  const { campaigns, loading, loadingMore, hasMore, error, loadMore } =
    usePublicCampaigns({ zakat, org })
  // The org filter arrives as an id with no name attached; the campaign
  // rows carry their org_name, so the active-filter pill can name it.
  const orgName = campaigns[0]?.org_name

  const buildHref = (nextZakat: boolean) => {
    const params = new URLSearchParams()
    if (nextZakat) params.set('zakat', 'true')
    if (org) params.set('org', org)
    const qs = params.toString()
    return qs ? `/campaigns?${qs}` : '/campaigns'
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('campaigns.title')}
          </h1>
          <Link
            href="/"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            {t('common.backHome')}
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500">
              {t('campaigns.filter')}
            </span>
            <Link
              href={buildHref(!zakat)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                zakat
                  ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                  zakat ? 'border-white bg-transparent' : 'border-gray-400'
                }`}
              >
                {zakat && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              {t('campaigns.zakatEligible')}
            </Link>
            {org && orgName && (
              <Link
                href="/campaigns"
                aria-label={t('campaigns.clearOrgFilter')}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-600 bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {t('campaigns.orgFilter', { name: orgName })}
                <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              </Link>
            )}
            {zakat && (
              <Link
                href="/campaigns"
                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
              >
                {t('campaigns.clearFilter')}
              </Link>
            )}
          </div>
          {!loading && !error && campaigns.length > 0 && (
            <p className="text-sm text-gray-500" role="status">
              {t('campaigns.showingCount', { count: campaigns.length })}
            </p>
          )}
        </div>
        {zakat && (
          <p className="-mt-4 text-sm text-gray-500">
            {t('campaigns.zakatHint')}
          </p>
        )}

        {loading && (
          <div
            className="py-12 text-center text-gray-500"
            role="status"
            aria-live="polite"
          >
            {t('campaigns.loading')}
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-red-600" role="alert">
            {t('campaigns.error')}
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className="space-y-6 py-12">
            {zakat && (
              <p className="text-center text-gray-500">
                {t('campaigns.emptyZakat')}
              </p>
            )}
            {org && (
              <p className="text-center text-gray-500">
                {t('campaigns.emptyOrg')}
              </p>
            )}
            {(zakat || org) && (
              <div className="flex flex-col items-center gap-3">
                <Link
                  href="/org/request"
                  className="inline-block rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  {t('getInvolved.orgsCta')}
                </Link>
                <Link
                  href="/campaigns"
                  className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                >
                  {t('campaigns.clearFilters')}
                </Link>
              </div>
            )}
            {!zakat && !org && <GetInvolved />}
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {campaigns.map(c => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-md border border-indigo-600 px-6 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore
                    ? t('campaigns.loadingMore')
                    : t('campaigns.loadMore')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function CampaignsPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="py-12 text-center text-gray-500">
            {t('common.loading')}
          </div>
        </AppLayout>
      }
    >
      <CampaignsContent />
    </Suspense>
  )
}
