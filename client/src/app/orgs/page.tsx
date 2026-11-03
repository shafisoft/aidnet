'use client'

import { Suspense, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useRequiredParam } from '@/hooks/useQueryParam'
import { usePublicOrg } from '@/hooks/usePublicOrg'
import { usePublicOrgs } from '@/hooks/usePublicOrgs'
import { usePublicCampaigns } from '@/hooks/usePublicCampaigns'
import { CampaignCard } from '@/components/campaign/CampaignCard'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function OrgCampaignsPanel({
  orgId,
  orgName,
}: {
  orgId: string
  orgName: string
}) {
  const { t } = useTranslation()
  const { campaigns, loading, error } = usePublicCampaigns({ org: orgId })

  // Full public list for the org: the band reports totals across every live
  // campaign, the grid shows the first few.
  const totalRaised = campaigns.reduce((s, c) => s + c.raised_amount, 0)
  const totalGoal = campaigns.reduce((s, c) => s + (c.goal_amount ?? 0), 0)
  const shown = campaigns.slice(0, 6)
  const currency = campaigns[0]?.currency ?? ''

  return (
    <div className="space-y-6">
      {!loading && !error && campaigns.length > 0 && (
        <dl className="grid grid-cols-1 gap-4 rounded-lg bg-white p-6 shadow sm:grid-cols-3">
          <div className="text-center">
            <dd className="text-2xl font-bold text-gray-900">
              {campaigns.length}
            </dd>
            <dt className="text-sm text-gray-500">
              {t('orgPublic.statCampaigns')}
            </dt>
          </div>
          <div className="text-center">
            <dd className="text-2xl font-bold text-gray-900">
              {t('orgPublic.statMoney', {
                amount: totalRaised.toLocaleString(),
                currency,
              })}
            </dd>
            <dt className="text-sm text-gray-500">
              {t('orgPublic.statRaisedLabel')}
            </dt>
          </div>
          <div className="text-center">
            <dd className="text-2xl font-bold text-gray-900">
              {t('orgPublic.statMoney', {
                amount: totalGoal.toLocaleString(),
                currency,
              })}
            </dd>
            <dt className="text-sm text-gray-500">
              {t('orgPublic.statGoalLabel')}
            </dt>
          </div>
        </dl>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('orgPublic.campaignsBy', { name: orgName })}
          </h2>
          <Link
            href={`/campaigns?org=${encodeURIComponent(orgId)}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {t('orgPublic.seeAll')}
          </Link>
        </div>

        {loading && (
          <div className="py-6 text-center text-gray-500">
            {t('campaigns.loading')}
          </div>
        )}

        {error && (
          <div className="py-6 text-center text-red-600" role="alert">
            {t('campaigns.error')}
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <p className="text-gray-500">{t('orgPublic.noCampaigns')}</p>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(c => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PublicOrgContent({ slug }: { slug: string }) {
  const { t } = useTranslation()
  const { org, loading, error } = usePublicOrg(slug)

  const createdAt = org
    ? new Date(org.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'
  const initials = org
    ? org.name
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w.charAt(0).toUpperCase())
        .join('')
    : ''

  usePageTitle(org ? org.name : t('titles.organization'))

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        {loading && (
          <div className="py-12 text-center" role="status" aria-live="polite">
            <div className="text-gray-500">{t('orgPublic.loading')}</div>
          </div>
        )}

        {error && (
          <div className="space-y-4 py-12 text-center" role="alert">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('orgPublic.notFoundTitle')}
            </h1>
            <p className="text-gray-600">{t('orgPublic.loadFailed')}</p>
            <Link href="/" className="text-indigo-600 hover:underline">
              {t('common.goHome')}
            </Link>
          </div>
        )}

        {org && (
          <div className="space-y-8">
            <div className="space-y-4 text-center">
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logo_url}
                  alt=""
                  className="mx-auto h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">
                  {initials}
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{org.name}</h1>
              {org.description && (
                <p className="mx-auto max-w-2xl text-lg text-gray-600">
                  {org.description}
                </p>
              )}
              <p className="text-sm text-gray-400">
                {t('orgPublic.created', { date: createdAt })}
              </p>
            </div>

            <OrgCampaignsPanel orgId={org.id} orgName={org.name} />
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function OrgDirectory() {
  const { t } = useTranslation()
  const { orgs, loading, error } = usePublicOrgs()

  usePageTitle(t('titles.organizations'))

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('orgDirectory.title')}
          </h1>
          <p className="mx-auto max-w-xl text-gray-600">
            {t('orgDirectory.subtitle')}
          </p>
        </header>

        {loading && (
          <div className="py-12 text-center" role="status" aria-live="polite">
            <div className="text-gray-500">{t('common.loading')}</div>
          </div>
        )}

        {error && (
          <div className="py-12 text-center" role="alert">
            <div className="text-red-600">{t('orgDirectory.loadFailed')}</div>
          </div>
        )}

        {!loading && !error && orgs.length === 0 && (
          <p className="py-12 text-center text-gray-500">
            {t('orgDirectory.empty')}
          </p>
        )}

        {!loading && !error && orgs.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map(org => (
              <Link
                key={org.id}
                href={`/orgs?slug=${encodeURIComponent(org.slug)}`}
                className="flex flex-col rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-gray-900">
                  {org.name}
                </h2>
                {org.description && (
                  <p className="mt-1 line-clamp-3 text-sm text-gray-600">
                    {org.description}
                  </p>
                )}
                <span className="mt-4 text-sm font-medium text-indigo-600">
                  {t('orgDirectory.viewOrg')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function OrgsPageContent() {
  const router = useRouter()
  const slug = useRequiredParam('slug')
  const legacyId = useRequiredParam('id')

  // Pre-restructure /orgs?id= selection links now belong to the authed
  // manage area; forward them so old bookmarks and org cards keep working.
  const shouldForwardLegacyId = !slug && !!legacyId
  useEffect(() => {
    if (shouldForwardLegacyId) {
      router.replace(`/manage/orgs?id=${encodeURIComponent(legacyId ?? '')}`)
    }
  }, [shouldForwardLegacyId, legacyId, router])

  if (shouldForwardLegacyId) return null

  if (slug) return <PublicOrgContent slug={slug} />

  return <OrgDirectory />
}

export default function OrgsPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="py-12 text-center">
            <div className="text-gray-500">{t('common.loading')}</div>
          </div>
        </AppLayout>
      }
    >
      <OrgsPageContent />
    </Suspense>
  )
}
