'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Turnstile } from './Turnstile'
import { donationReportService } from '@/services/DonationReportService'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

const METHODS = ['bkash', 'nagad', 'rocket', 'bank', 'other'] as const

/**
 * Donor-side "I donated" report: claims an out-of-band transfer so the
 * organization can confirm it against their own records. Submits as
 * pending — it never counts toward the campaign total until the
 * organization confirms it, and it never moves money.
 */
export function ReportDonationDialog({
  campaignId,
  orgName,
  currency,
  onClose,
}: {
  campaignId: string
  orgName: string
  currency?: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<string>('bkash')
  const [reference, setReference] = useState('')
  const [donorName, setDonorName] = useState('')
  const [message, setMessage] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsed = Number(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError(t('donationReport.amountRequired'))
      return
    }

    setSubmitting(true)
    const { error: submitError } = await donationReportService.propose({
      campaignId,
      amount: parsed,
      method,
      reference: reference.trim() || undefined,
      donorName: donorName.trim() || undefined,
      message: message.trim() || undefined,
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
      aria-label={t('donationReport.dialogTitle')}
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
              {t('donationReport.successTitle')}
            </h2>
            {/* The donor's one-line status: their money is reported, not yet
                counted — the org confirms it before it joins the total. */}
            <p>
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                {t('donationReport.awaitingChip')}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              {t('donationReport.successBody', {
                org: orgName,
                amount: Number(amount).toLocaleString(),
                currency: currency,
              })}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t('donationReport.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('donationReport.dialogTitle')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('donationReport.close')}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              {t('donationReport.intro', { org: orgName })}
            </p>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label
                  htmlFor="report-amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('donationReport.amount')}
                </label>
                <input
                  id="report-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="report-method"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('donationReport.method')}
                </label>
                <select
                  id="report-method"
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {METHODS.map(m => (
                    <option key={m} value={m}>
                      {m === 'bank'
                        ? t('donationReport.methodBank')
                        : m === 'other'
                          ? t('donationReport.methodOther')
                          : m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="report-reference"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('donationReport.reference')}
                </label>
                <input
                  id="report-reference"
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder={t('donationReport.referenceHint')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="report-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('donationReport.yourName')}
                </label>
                <input
                  id="report-name"
                  type="text"
                  value={donorName}
                  onChange={e => setDonorName(e.target.value)}
                  placeholder={t('donationReport.yourNameHint')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="report-message"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('donationReport.message')}
                </label>
                <textarea
                  id="report-message"
                  rows={2}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
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
                  ? t('donationReport.submitting')
                  : t('donationReport.submit')}
              </button>

              <p className="text-center text-xs text-gray-500">
                {t('donationReport.noMoneyNote')}{' '}
                <Link
                  href="/terms/"
                  className="text-indigo-600 hover:underline"
                >
                  {t('footer.terms')}
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
