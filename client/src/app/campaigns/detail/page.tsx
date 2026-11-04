'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { AppLayout } from '@/components/layout/AppLayout'
import { publicCampaignService } from '@/services/PublicCampaignService'
import { donationReportService } from '@/services/DonationReportService'
import { MapPin, Copy, Check } from 'lucide-react'
import { ReportDonationDialog } from '@/components/campaign/ReportDonationDialog'
import { ReportCampaignDialog } from '@/components/campaign/ReportCampaignDialog'
import { ShareCampaign } from '@/components/campaign/ShareCampaign'
import type { PublicCampaign, PublicDonationReport } from '@/types'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'

// Button label shows just the hostname; a malformed stored URL falls back
// to the raw value rather than crashing the page.
function donationUrlLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '')
  }
}

// Donors send money manually, so the number itself — not the display string
// with account-holder names — is what needs to land on the clipboard.
function CopyButton({ value }: { value: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (permissions/insecure context) — leave the
      // number selectable as before.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? t('campaignDetail.copied') : t('campaignDetail.copy')}
      aria-label={
        copied ? t('campaignDetail.copied') : t('campaignDetail.copy')
      }
      className="inline-flex items-center gap-1 rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-50"
    >
      {copied ? (
        <Check size={12} aria-hidden className="text-green-600" />
      ) : (
        <Copy size={12} aria-hidden />
      )}
      {copied ? t('campaignDetail.copied') : t('campaignDetail.copy')}
    </button>
  )
}

function CampaignDetailContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug')
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmedReports, setConfirmedReports] = useState<
    PublicDonationReport[]
  >([])
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [showAbuseDialog, setShowAbuseDialog] = useState(false)

  usePageTitle(campaign ? campaign.title : t('titles.campaign'))

  const { user } = useAuth()
  const { currentOrg } = useOrganization()
  const { hasPermission } = usePermissions()
  const canEditCampaign =
    !!user &&
    !!campaign &&
    currentOrg?.id === campaign.org_id &&
    hasPermission('campaigns:update')

  const goal = campaign?.goal_amount
  const raised = campaign?.raised_amount ?? 0
  const pending = campaign?.pending_amount ?? 0
  const pct =
    goal && goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0
  const pendingPct =
    goal && goal > 0
      ? Math.min(100 - pct, Math.round((pending / goal) * 100))
      : 0

  // Public confirmed donations: the org-reviewed ledger behind the
  // raised total. Reload when the dialog closes (a confirm elsewhere
  // changes it, but the common case is returning to a fresh page).
  useEffect(() => {
    if (!campaign?.id) return
    let active = true
    const load = async () => {
      const { data } = await donationReportService.listPublic(campaign.id)
      if (active) setConfirmedReports(data ?? [])
    }
    void load()
    return () => {
      active = false
    }
  }, [campaign?.id, showReportDialog])

  useEffect(() => {
    if (!slug) {
      setError(t('campaignDetail.notFound'))
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    publicCampaignService
      .getPublicCampaignBySlug(slug)
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) {
          setError(err)
          setCampaign(null)
        } else if (!data) {
          setError(t('campaignDetail.notFound'))
          setCampaign(null)
        } else {
          setCampaign(data)
          setError(null)
        }
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [slug, t])

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/campaigns"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          {t('campaignDetail.back')}
        </Link>

        {loading && (
          <div
            className="py-12 text-center text-gray-500"
            role="status"
            aria-live="polite"
          >
            {t('common.loading')}
          </div>
        )}

        {error && (
          <div className="space-y-4 py-12 text-center" role="alert">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('campaignDetail.notAvailableTitle')}
            </h1>
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {campaign && (
          <article className="space-y-8">
            <header className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {campaign.title}
                </h1>
                {campaign.is_zakat_eligible && (
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    {t('campaignDetail.zakatEligible')}
                  </span>
                )}
              </div>
              <p className="text-gray-500">
                {t('campaignDetail.by')}{' '}
                <Link
                  href={`/orgs?slug=${encodeURIComponent(campaign.org_slug)}`}
                  className="text-indigo-600 hover:underline"
                >
                  {campaign.org_name}
                </Link>
              </p>
              {campaign.address && (
                <p className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  <span>
                    <span className="sr-only">
                      {t('campaignDetail.address')}:{' '}
                    </span>
                    {campaign.address}
                  </span>
                </p>
              )}
              {canEditCampaign && (
                <Link
                  href={`/dashboard/campaigns/edit?id=${campaign.id}`}
                  className="inline-block rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  {t('campaignDetail.editCampaign')}
                </Link>
              )}
            </header>

            {campaign.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                loading="lazy"
                className="w-full rounded-lg shadow"
              />
            )}

            {/* Distribution is the fundraiser's job — offer the share row
                on every public campaign view. */}
            <ShareCampaign slug={campaign.slug} title={campaign.title} />

            {/* The public's fraud lever — anonymous by design. */}
            <button
              type="button"
              onClick={() => setShowAbuseDialog(true)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {t('campaignReport.cta')}
            </button>

            {campaign.description && (
              <p className="whitespace-pre-line leading-relaxed text-gray-700">
                {campaign.description}
              </p>
            )}

            {campaign.goal_amount != null && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {t('campaignCard.raised', {
                      amount: (campaign.raised_amount ?? 0).toLocaleString(),
                      currency: campaign.currency,
                    })}
                  </span>
                  <span>
                    {t('campaignDetail.raisedOfGoal', {
                      pct,
                      goal: campaign.goal_amount.toLocaleString(),
                      currency: campaign.currency,
                    })}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div className="flex h-full">
                    <div
                      className="h-full bg-indigo-600"
                      style={{ width: `${pct}%` }}
                    />
                    {pending > 0 && (
                      <div
                        className="h-full bg-indigo-300"
                        style={{ width: `${pendingPct}%` }}
                        title={t('campaignDetail.pendingLegend', {
                          amount: pending.toLocaleString(),
                          currency: campaign.currency,
                        })}
                      />
                    )}
                  </div>
                </div>
                {pending > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full bg-indigo-600"
                        aria-hidden="true"
                      />
                      {t('campaignDetail.confirmedLegend', {
                        amount: raised.toLocaleString(),
                        currency: campaign.currency,
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full bg-indigo-300"
                        aria-hidden="true"
                      />
                      {t('campaignDetail.pendingLegend', {
                        amount: pending.toLocaleString(),
                        currency: campaign.currency,
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {campaign.start_date && (
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  {t('campaignDetail.starts', {
                    date: new Date(campaign.start_date).toLocaleDateString(),
                  })}
                </span>
              )}
              {campaign.end_date && (
                <span className="rounded-md bg-gray-100 px-3 py-1">
                  {t('campaignDetail.ends', {
                    date: new Date(campaign.end_date).toLocaleDateString(),
                  })}
                </span>
              )}
            </div>

            {campaign.tags && campaign.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {campaign.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            )}

            <section className="space-y-4 rounded-lg bg-white p-6 shadow">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  {t('campaignDetail.donateTitle')}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowReportDialog(true)}
                  className="rounded-md border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  {t('donationReport.cta')}
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {t('campaignDetail.donateNote')}
              </p>
              <DonationMethods info={campaign.donation_methods} />
              {raised > 0 && (
                <p className="text-xs text-gray-500">
                  {t('campaignDetail.raisedNote')}
                </p>
              )}
              {confirmedReports.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t('donationReport.confirmedHeading')}
                  </h3>
                  <ul className="space-y-1">
                    {confirmedReports.map(r => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600"
                      >
                        <span>
                          {r.currency} {r.amount.toLocaleString()} · {r.method}
                          {r.donor_name ? ` · ${r.donor_name}` : ''}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </article>
        )}
      </div>
      {showReportDialog && campaign && (
        <ReportDonationDialog
          campaignId={campaign.id}
          orgName={campaign.org_name}
          currency={campaign.currency ?? undefined}
          onClose={() => setShowReportDialog(false)}
        />
      )}
      {showAbuseDialog && campaign && (
        <ReportCampaignDialog
          campaignId={campaign.id}
          onClose={() => setShowAbuseDialog(false)}
        />
      )}
    </AppLayout>
  )
}

// Brand names — not translated (bKash/Nagad/Rocket keep their spelling in
// every locale, matching the campaign form labels).
const PROVIDER_LABELS: Record<string, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
}

function MethodRow({
  label,
  value,
  copyValue,
}: {
  label: string
  value: string
  copyValue?: string | null
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-2 text-right">
        <span className="font-medium text-gray-900">{value}</span>
        {copyValue && <CopyButton value={copyValue} />}
      </span>
    </div>
  )
}

function DonationMethods({
  info,
}: {
  info: PublicCampaign['donation_methods']
}) {
  const { t } = useTranslation()
  const mobile = info?.mobile ?? []
  const bank = info?.bank ?? null
  const hasAny =
    mobile.length > 0 ||
    !!bank ||
    !!info?.donation_url ||
    !!info?.qr_image_url ||
    !!info?.instructions

  if (!hasAny) {
    return <p className="text-gray-500">{t('campaignDetail.noMethods')}</p>
  }

  return (
    <div className="space-y-4">
      {info?.is_preferred && (
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
          {t('campaignDetail.preferred')}
        </span>
      )}
      {info?.donation_url && (
        <a
          href={info.donation_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
        >
          {t('campaignDetail.donateVia', {
            host: donationUrlLabel(info.donation_url),
          })}
        </a>
      )}
      {mobile.length > 0 && (
        <div className="space-y-3 rounded-md border p-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('campaignDetail.mobileTitle')}
          </h3>
          {mobile.map(ch => (
            <MethodRow
              key={ch.provider}
              label={PROVIDER_LABELS[ch.provider] ?? ch.provider}
              value={
                ch.number + (ch.account_name ? ` (${ch.account_name})` : '')
              }
              copyValue={ch.number}
            />
          ))}
        </div>
      )}
      {bank && (
        <div className="space-y-3 rounded-md border p-4">
          {/* Bank details render as one grouped block — an account is
              name+number+routing+branch together, not loose columns. */}
          <h3 className="text-sm font-semibold text-gray-900">
            {t('campaignDetail.bankTitle')}
          </h3>
          {bank.bank_name && (
            <MethodRow
              label={t('campaignDetail.bankName')}
              value={bank.bank_name}
            />
          )}
          {bank.account_name && (
            <MethodRow
              label={t('campaignDetail.bankAccountName')}
              value={bank.account_name}
            />
          )}
          {bank.account_number && (
            <MethodRow
              label={t('campaignDetail.bankAccountNumber')}
              value={bank.account_number}
              copyValue={bank.account_number}
            />
          )}
          {bank.routing_number && (
            <MethodRow
              label={t('campaignDetail.bankRoutingNumber')}
              value={bank.routing_number}
              copyValue={bank.routing_number}
            />
          )}
          {bank.branch && (
            <MethodRow
              label={t('campaignDetail.bankBranch')}
              value={bank.branch}
            />
          )}
        </div>
      )}
      {info?.instructions && (
        <p className="text-sm text-gray-600">{info.instructions}</p>
      )}
      {info?.qr_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={info.qr_image_url}
          alt={t('campaignDetail.qrAlt')}
          loading="lazy"
          className="h-40 w-40 rounded border object-contain"
        />
      )}
    </div>
  )
}

export default function CampaignDetailPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div
            className="py-12 text-center text-gray-500"
            role="status"
            aria-live="polite"
          >
            {t('common.loading')}
          </div>
        </AppLayout>
      }
    >
      <CampaignDetailContent />
    </Suspense>
  )
}
