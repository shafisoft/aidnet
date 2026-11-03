'use client'

import { useEffect, Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { campaignService } from '@/services/CampaignService'
import { useCampaignAdmin } from '@/hooks/useCampaignAdmin'
import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Campaign, CampaignBeneficiary } from '@/types'

function AdminCampaignsContent() {
  const { t } = useTranslation()
  const { isSystemAdmin, loading: adminLoading } = useSystemAdmin()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug')
  const {
    pending,
    personal,
    abuseReports,
    loading,
    actionLoading,
    error,
    verify,
    reject,
    resolveAbuseReport,
  } = useCampaignAdmin()
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  usePageTitle(t('admin.queueTitle'))

  if (adminLoading) {
    return (
      <ConsoleShell variant="admin">
        <div className="py-12 text-center text-gray-500">
          {t('admin.checkingPermissions')}
        </div>
      </ConsoleShell>
    )
  }

  if (!isSystemAdmin) {
    return (
      <ConsoleShell variant="admin">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('errors.accessDenied')}
          </h1>
          <p className="text-gray-600">{t('errors.systemAdminRequired')}</p>
          <Link href="/" className="text-indigo-600 hover:underline">
            {t('common.goHome')}
          </Link>
        </div>
      </ConsoleShell>
    )
  }

  const selected: Campaign | undefined = slug
    ? pending.find(c => c.slug === slug)
    : undefined

  const handleVerify = async (id: string) => {
    setFeedback(null)
    const { error: err } = await verify(id, notes || undefined)
    setFeedback(
      err ? t('admin.errorPrefix', { message: err }) : t('admin.verifiedMsg')
    )
    setNotes('')
  }

  const handleReject = async (id: string) => {
    setFeedback(null)
    const { error: err } = await reject(id, notes || undefined)
    setFeedback(
      err ? t('admin.errorPrefix', { message: err }) : t('admin.rejectedMsg')
    )
    setNotes('')
  }

  // Personal campaigns skip the review queue, so this is the only
  // oversight moment: reject hides them from every public read.
  const handleTakeDown = async (title: string, id: string) => {
    if (!window.confirm(t('admin.takeDownConfirm', { title }))) return
    setFeedback(null)
    const { error: err } = await reject(id)
    setFeedback(
      err ? t('admin.errorPrefix', { message: err }) : t('admin.takenDownMsg')
    )
  }

  const handleResolveReport = async (id: string) => {
    setFeedback(null)
    const { error: err } = await resolveAbuseReport(id)
    setFeedback(
      err ? t('admin.errorPrefix', { message: err }) : t('admin.resolvedMsg')
    )
  }

  return (
    <ConsoleShell variant="admin">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('admin.queueTitle')}
          </h1>
        </div>

        {loading && (
          <div className="py-8 text-gray-500">{t('admin.loadingPending')}</div>
        )}
        {error && <div className="py-8 text-red-600">{error}</div>}
        {feedback && (
          <div className="rounded-md bg-blue-50 p-3 text-blue-800">
            {feedback}
          </div>
        )}

        {!loading && !selected && (
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
                {t('admin.noPending')}
              </div>
            ) : (
              pending.map(c => (
                <Link
                  key={c.id}
                  href={`/admin/campaigns?slug=${encodeURIComponent(c.slug)}`}
                  className="block rounded-lg bg-white p-4 shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{c.title}</span>
                    <span className="text-sm text-gray-500">/{c.slug}</span>
                  </div>
                  {c.is_zakat_eligible && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      {t('campaignCard.zakatBadge')}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {/* Post-publish oversight: personal campaigns skip the review
            queue, so they surface here once live. */}
        {!loading && !selected && personal.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('admin.personalTitle')}
            </h2>
            {personal.map(c => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{c.title}</span>
                    <StatusChip status={c.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    /{c.slug} · {c.org_name}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-3">
                  <Link
                    href={`/campaigns/detail/?slug=${encodeURIComponent(c.slug)}`}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {t('admin.viewPublic')}
                  </Link>
                  {c.status !== 'rejected' && c.status !== 'closed' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleTakeDown(c.title, c.id)}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {t('admin.takeDown')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* The public's fraud flags — resolve after reviewing the campaign. */}
        {!loading && !selected && abuseReports.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('admin.abuseTitle')}
            </h2>
            {abuseReports.map(r => (
              <div
                key={r.id}
                className={`flex flex-wrap items-start justify-between gap-3 rounded-lg p-4 shadow ${r.resolved_at ? 'bg-gray-50 opacity-70' : 'bg-white'}`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      {t(`admin.abuseReason.${r.reason}`)}
                    </span>
                    <Link
                      href={`/campaigns/detail/?slug=${encodeURIComponent(r.campaign_slug)}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {r.campaign_title}
                    </Link>
                  </div>
                  {r.details && (
                    <p className="whitespace-pre-line text-sm text-gray-600">
                      {r.details}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleString()}
                    {r.contact ? ` · ${r.contact}` : ''}
                  </p>
                </div>
                {!r.resolved_at && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleResolveReport(r.id)}
                    className="flex-none rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('admin.resolve')}
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {selected && (
          <div className="space-y-4 rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {selected.title}
              </h2>
              <Link
                href="/admin/campaigns"
                className="text-sm text-indigo-600 hover:underline"
              >
                {t('admin.backToQueue')}
              </Link>
            </div>
            <p className="text-sm text-gray-500">/{selected.slug}</p>
            {selected.description && (
              <p className="whitespace-pre-line text-gray-700">
                {selected.description}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              {selected.goal_amount != null && (
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  {t('campaignDetail.goal', {
                    amount: selected.goal_amount.toLocaleString(),
                    currency: selected.currency,
                  })}
                </span>
              )}
              {selected.is_zakat_eligible && (
                <span className="rounded-md bg-green-100 px-3 py-1 text-green-800">
                  {t('campaignCard.zakatBadge')}
                </span>
              )}
            </div>

            <BeneficiaryPanel campaignId={selected.id} />

            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">
                {t('admin.verificationNotes')}
              </span>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('admin.notesPlaceholder')}
              />
            </label>

            <div className="flex gap-3">
              <button
                disabled={actionLoading}
                onClick={() => handleVerify(selected.id)}
                className="rounded-md bg-green-600 px-5 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {t('admin.verifyPublish')}
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleReject(selected.id)}
                className="rounded-md bg-red-600 px-5 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t('admin.reject')}
              </button>
            </div>
          </div>
        )}
      </div>
    </ConsoleShell>
  )
}

function StatusChip({ status }: { status: string }) {
  const { t } = useTranslation()
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    pending_review: 'bg-amber-100 text-amber-700',
    live: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    closed: 'bg-gray-100 text-gray-600',
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map.draft}`}
    >
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  )
}

/**
 * Person-beneficiary verification data for the campaign under review.
 * Fetched through the system-admin-gated RPC — never part of public reads.
 */
function BeneficiaryPanel({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation()
  const [ben, setBen] = useState<CampaignBeneficiary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    campaignService.getBeneficiary(campaignId).then(({ data }) => {
      if (!active) return
      setBen(data?.[0] ?? null)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [campaignId])

  if (loading) {
    return (
      <p className="text-sm text-gray-500" role="status">
        {t('common.loading')}
      </p>
    )
  }

  if (!ben) {
    return <p className="text-sm text-gray-500">{t('admin.beneficiaryNone')}</p>
  }

  const rows: Array<[string, string | null]> = [
    [t('campaignForm.benFullName'), ben.full_name],
    [t('campaignForm.benRelationship'), ben.relationship],
    [t('campaignForm.benPhone'), ben.phone],
    [t('campaignForm.benNationalId'), ben.national_id],
    [t('campaignForm.benDocumentUrl'), ben.document_url],
  ]

  return (
    <dl className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
      <dt className="font-medium text-gray-700">
        {t('admin.beneficiaryTitle')}
      </dt>
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="text-gray-500">{label}:</dt>
            <dd className="break-all font-medium text-gray-900">{value}</dd>
          </div>
        ))}
    </dl>
  )
}

export default function AdminCampaignsPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <ConsoleShell variant="admin">
          <div className="py-12 text-center text-gray-500">
            {t('common.loading')}
          </div>
        </ConsoleShell>
      }
    >
      <AdminCampaignsContent />
    </Suspense>
  )
}
