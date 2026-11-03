import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { PublicCampaign } from '@/types'

export function CampaignCard({ campaign }: { campaign: PublicCampaign }) {
  const { t } = useTranslation()
  const goal = campaign.goal_amount
  const raised = campaign.raised_amount ?? 0
  const pending = campaign.pending_amount ?? 0
  // Percentages are confirmed-only: the pending segment rides beside the
  // confirmed fill without ever pushing the total past the track.
  const pct =
    goal && goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0
  const pendingPct =
    goal && goal > 0
      ? Math.min(100 - pct, Math.round((pending / goal) * 100))
      : 0

  return (
    <Link
      href={`/campaigns/detail?slug=${encodeURIComponent(campaign.slug)}`}
      className="flex flex-col overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-md"
    >
      {campaign.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={campaign.cover_image_url}
          alt={campaign.title}
          loading="lazy"
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 font-semibold text-indigo-400">
          {campaign.org_name}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold text-gray-900">
            {campaign.title}
          </h3>
          {campaign.is_zakat_eligible && (
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
              {t('campaignCard.zakatBadge')}
            </span>
          )}
        </div>

        <p className="truncate text-sm text-gray-500">{campaign.org_name}</p>

        {campaign.description && (
          <p className="line-clamp-2 text-sm text-gray-600">
            {campaign.description}
          </p>
        )}

        {goal != null && (
          <div className="mt-1">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
              <span>
                {t('campaignCard.raised', {
                  amount: raised.toLocaleString(),
                  currency: campaign.currency,
                })}
              </span>
              <span>{pct}%</span>
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
                    title={t('campaignCard.pendingNote', {
                      amount: pending.toLocaleString(),
                      currency: campaign.currency,
                    })}
                  />
                )}
              </div>
            </div>
            {pending > 0 && (
              <p className="text-xs text-amber-600">
                {t('campaignCard.pendingNote', {
                  amount: pending.toLocaleString(),
                  currency: campaign.currency,
                })}
              </p>
            )}
          </div>
        )}

        <span className="mt-auto pt-2 font-medium text-indigo-600">
          {t('campaignCard.view')}
        </span>
      </div>
    </Link>
  )
}
