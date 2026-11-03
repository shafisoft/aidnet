'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { campaignService } from '@/services/CampaignService'
import { CampaignForm } from '@/components/campaign/CampaignForm'
import { useCampaignForm } from '@/hooks/useCampaignForm'
import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { OrgGate } from '@/components/org/OrgGate'
import { isUuid } from '@/hooks/useQueryParam'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Campaign } from '@/types'

function EditCampaignContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const { currentOrg } = useOrganization()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTitle(t('campaignEdit.title'))

  useEffect(() => {
    if (!id || !isUuid(id)) {
      setError(t('campaignEdit.invalidId'))
      setLoading(false)
      return
    }
    let active = true
    campaignService.getCampaign(id).then(({ data, error: err }) => {
      if (!active) return
      if (err) {
        setError(err)
        setCampaign(null)
      } else if (!data) {
        setError(t('campaignEdit.notFound'))
        setCampaign(null)
      } else {
        setCampaign(data)
        setError(null)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [id, t])

  return (
    <ConsoleShell variant="workspace">
      <OrgGate>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {t('campaignEdit.title')}
            </h1>
            <Link
              href="/dashboard/campaigns"
              className="text-indigo-600 hover:underline"
            >
              {t('common.back')}
            </Link>
          </div>

          {loading && (
            <div className="py-8 text-gray-500">{t('common.loading')}</div>
          )}
          {error && <div className="py-8 text-red-600">{error}</div>}

          {!loading && !error && campaign && currentOrg && (
            <div className="rounded-lg bg-white p-6 shadow">
              <EditCampaignForm campaign={campaign} orgId={currentOrg.id} />
            </div>
          )}
        </div>
      </OrgGate>
    </ConsoleShell>
  )
}

function EditCampaignForm({
  campaign,
  orgId,
}: {
  campaign: Campaign
  orgId: string
}) {
  // Caps apply when the campaign belongs to the personal workspace the
  // user is currently in (same guard the publish button uses).
  const { currentOrg } = useOrganization()
  const controller = useCampaignForm({
    orgId,
    mode: 'edit',
    campaignId: campaign.id,
    initial: campaign,
    isPersonal: currentOrg?.id === orgId && currentOrg.kind === 'personal',
  })
  return <CampaignForm controller={controller} />
}

export default function EditCampaignPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <ConsoleShell variant="workspace">
          <div className="py-12 text-center text-gray-500">
            {t('common.loading')}
          </div>
        </ConsoleShell>
      }
    >
      <EditCampaignContent />
    </Suspense>
  )
}
