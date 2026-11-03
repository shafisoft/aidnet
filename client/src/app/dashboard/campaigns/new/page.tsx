'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useOrganization } from '@/hooks/useOrganization'
import { organizationService } from '@/services/OrganizationService'
import { CampaignForm } from '@/components/campaign/CampaignForm'
import { useCampaignForm } from '@/hooks/useCampaignForm'
import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { OrgGate } from '@/components/org/OrgGate'
import { usePageTitle } from '@/hooks/usePageTitle'

function NewCampaignContent() {
  const { t } = useTranslation()
  const { currentOrg, selectOrgById } = useOrganization()
  const [creatingIndividual, setCreatingIndividual] = useState(false)
  const [individualError, setIndividualError] = useState<string | null>(null)

  usePageTitle(t('campaignNew.title'))

  // No org yet: ask which route fits — own fundraiser, a new organization,
  // or an invite. Plain words, one helper line each: the labels describe
  // outcomes, not system concepts.
  if (!currentOrg) {
    const createAsIndividual = async () => {
      setCreatingIndividual(true)
      setIndividualError(null)
      const { data: orgId, error } =
        await organizationService.ensurePersonalOrg()
      if (error || !orgId) {
        setIndividualError(t('campaignNew.individualError'))
        setCreatingIndividual(false)
        return
      }
      const selected = await selectOrgById(orgId)
      if (!selected) {
        setIndividualError(t('campaignNew.individualError'))
        setCreatingIndividual(false)
      }
    }

    const optionCard =
      'block w-full rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-indigo-400'

    return (
      <ConsoleShell variant="workspace">
        <OrgGate>
          <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('campaignNew.choiceTitle')}
              </h1>
              <p className="mt-1 text-gray-600">
                {t('campaignNew.choiceBody')}
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={createAsIndividual}
                disabled={creatingIndividual}
                className="block w-full rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-left hover:border-indigo-400 disabled:opacity-60"
              >
                <p className="font-medium text-indigo-700">
                  {creatingIndividual
                    ? t('campaignNew.creatingIndividual')
                    : t('campaignNew.startOwn')}
                </p>
                <p className="mt-0.5 text-sm text-gray-600">
                  {t('campaignNew.startOwnHelp')}
                </p>
              </button>
              <Link href="/org/request" className={optionCard}>
                <p className="font-medium text-gray-900">
                  {t('campaignNew.registerOrg')}
                </p>
                <p className="mt-0.5 text-sm text-gray-600">
                  {t('campaignNew.registerOrgHelp')}
                </p>
              </Link>
              <Link href="/invite" className={optionCard}>
                <p className="font-medium text-gray-900">
                  {t('campaignNew.haveInvite')}
                </p>
                <p className="mt-0.5 text-sm text-gray-600">
                  {t('campaignNew.haveInviteHelp')}
                </p>
              </Link>
            </div>
            {individualError && (
              <p className="text-sm text-red-600">{individualError}</p>
            )}
          </div>
        </OrgGate>
      </ConsoleShell>
    )
  }

  return (
    <ConsoleShell variant="workspace">
      <OrgGate>
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {t('campaignNew.title')}
            </h1>
            <Link
              href="/dashboard/campaigns"
              className="text-indigo-600 hover:underline"
            >
              {t('common.back')}
            </Link>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <NewCampaignForm orgId={currentOrg.id} />
          </div>
        </div>
      </OrgGate>
    </ConsoleShell>
  )
}

function NewCampaignForm({ orgId }: { orgId: string }) {
  const { currentOrg } = useOrganization()
  const controller = useCampaignForm({
    orgId,
    mode: 'create',
    isPersonal: currentOrg?.kind === 'personal',
  })
  return <CampaignForm controller={controller} />
}

export default function NewCampaignPage() {
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
      <NewCampaignContent />
    </Suspense>
  )
}
