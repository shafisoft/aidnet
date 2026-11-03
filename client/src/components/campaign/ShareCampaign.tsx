'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Share2 } from 'lucide-react'
import { getAppBasePath } from '@/lib/basePath'

// Campaign distribution is the fundraiser's core job, so the share sheet
// goes where the moment is: viewing the campaign, right after publishing,
// and (phase 2) after a donation is confirmed. Links carry the campaign
// slug; utm_source tags the channel so share-driven visits are visible
// later without any backend change.
function campaignUrl(slug: string, utmSource: string): string {
  const base = typeof window === 'undefined' ? '' : window.location.origin
  const path = `${getAppBasePath()}/campaigns/detail/?slug=${encodeURIComponent(slug)}`
  return `${base}${path}&utm_source=${utmSource}`
}

function ShareButton({
  label,
  href,
  onClick,
}: {
  label: string
  href?: string
  onClick?: () => void
}) {
  const cls =
    'inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {label}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {label}
    </button>
  )
}

/**
 * Share row for a public campaign: copy link, WhatsApp, Facebook, and the
 * native share sheet where the browser has one (most phones). Callers
 * mount it only with a live campaign's slug.
 */
export function ShareCampaign({
  slug,
  title,
}: {
  slug: string
  title: string
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const url = campaignUrl(slug, 'share')
  const nativeUrl = campaignUrl(slug, 'share_native')
  const text = `${title} — ${t('share.campaignOnAidNet')}`
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (insecure context) — the URL is in the
      // address bar anyway; no fallback UI needed.
    }
  }

  const nativeShare = () => {
    void navigator.share({ title, text, url: nativeUrl }).catch(() => {
      // User dismissed the sheet — nothing to do.
    })
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

  return (
    <section
      aria-label={t('share.title')}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-4 shadow"
    >
      <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <Share2 size={16} aria-hidden />
        {t('share.title')}
      </span>
      <ShareButton
        label={copied ? t('share.copied') : t('share.copyLink')}
        onClick={copy}
      />
      <ShareButton label={t('share.whatsapp')} href={whatsapp} />
      <ShareButton label={t('share.facebook')} href={facebook} />
      {canNativeShare && (
        <ShareButton label={t('share.more')} onClick={nativeShare} />
      )}
    </section>
  )
}
