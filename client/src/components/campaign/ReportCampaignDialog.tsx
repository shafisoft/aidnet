'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Turnstile } from './Turnstile'
import {
  abuseReportService,
  type AbuseReason,
} from '@/services/AbuseReportService'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

const REASONS: AbuseReason[] = ['fraud', 'misleading', 'completed', 'other']

const REASON_KEYS: Record<AbuseReason, string> = {
  fraud: 'campaignReport.reasonFraud',
  misleading: 'campaignReport.reasonMisleading',
  completed: 'campaignReport.reasonCompleted',
  other: 'campaignReport.reasonOther',
}

/**
 * The public's fraud lever: anyone — usually NOT logged in — flags a live
 * campaign for the system admins. Anonymous by design; witnesses rarely
 * have an account. The DB validates the reason and caps the lengths.
 */
export function ReportCampaignDialog({
  campaignId,
  onClose,
}: {
  campaignId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<AbuseReason>('fraud')
  const [details, setDetails] = useState('')
  const [contact, setContact] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: submitError } = await abuseReportService.report({
      campaignId,
      reason,
      details: details.trim() || undefined,
      contact: contact.trim() || undefined,
      turnstileToken: token ?? undefined,
    })
    setSubmitting(false)

    if (submitError) {
      setError(submitError)
      return
    }
    setSent(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('campaignReport.dialogTitle')}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose()
      }}
      tabIndex={-1}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        {sent ? (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('campaignReport.successTitle')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('campaignReport.successBody')}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t('campaignReport.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('campaignReport.dialogTitle')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('campaignReport.close')}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              {t('campaignReport.intro')}
            </p>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label
                  htmlFor="campaign-report-reason"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('campaignReport.reason')}
                </label>
                <select
                  id="campaign-report-reason"
                  value={reason}
                  onChange={e => setReason(e.target.value as AbuseReason)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {REASONS.map(r => (
                    <option key={r} value={r}>
                      {t(REASON_KEYS[r])}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="campaign-report-details"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('campaignReport.details')}
                </label>
                <textarea
                  id="campaign-report-details"
                  rows={3}
                  maxLength={2000}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder={t('campaignReport.detailsHint')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="campaign-report-contact"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('campaignReport.contact')}
                </label>
                <input
                  id="campaign-report-contact"
                  type="text"
                  maxLength={200}
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder={t('campaignReport.contactHint')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {TURNSTILE_SITE_KEY && (
                <Turnstile siteKey={TURNSTILE_SITE_KEY} onToken={setToken} />
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? t('campaignReport.submitting')
                  : t('campaignReport.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
