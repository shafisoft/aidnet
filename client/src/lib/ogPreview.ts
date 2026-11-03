// Shared by the og edge function (Deno imports this file with an explicit
// .ts extension) and unit-tested here. Keep it dependency-free and
// environment-free: strings in, strings out — no fetch, no process env.

/**
 * Crawlers that render link previews (WhatsApp, Facebook/Messenger,
 * Twitter/X, LinkedIn, Discord, Slack, Telegram, iMessage) do not run
 * JavaScript, so the static-export page never shows them OG tags. They
 * get served OG HTML by the og function; everything else — a human
 * clicking the link — gets redirected to the real page.
 *
 * Markers are matched lowercase against the full UA. Generic 'bot'
 * covers Googlebot/Bingbot/DuckDuckBot (serving them OG HTML is
 * harmless); browser UAs never contain it.
 */
const CRAWLER_MARKERS = [
  'facebookexternalhit',
  'facebookcatalog',
  'whatsapp',
  'twitterbot',
  'linkedinbot',
  'discordbot',
  'slackbot',
  'telegrambot',
  'embedly',
  'quora link preview',
  'bot',
  'crawler',
  'spider',
  'curl',
  'wget',
]

export function isSocialCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return CRAWLER_MARKERS.some(marker => ua.includes(marker))
}

/**
 * Campaign URL on the static site. SITE_URL carries origin AND base path
 * (e.g. `https://owner.github.io/repo` on project pages) so the function
 * never has to infer the deployment shape.
 */
export function siteCampaignUrl(siteUrl: string, slug: string): string {
  const base = siteUrl.replace(/\/+$/, '')
  return `${base}/campaigns/detail/?slug=${encodeURIComponent(slug)}`
}

/**
 * Humans hitting the function URL are 302'd to the real page. Any other
 * query params they arrived with (utm_source from the share sheet, fbclid)
 * are forwarded so attribution survives the hop.
 */
export function redirectUrl(
  siteUrl: string,
  slug: string,
  params: URLSearchParams
): string {
  const extra = new URLSearchParams()
  params.forEach((value, key) => {
    if (key !== 'slug') extra.append(key, value)
  })
  const target = siteCampaignUrl(siteUrl, slug)
  const qs = extra.toString()
  return qs ? `${target}&${qs}` : target
}

/** Minimal escaping for attribute context — titles and org names are user input. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface OgCampaign {
  title: string
  description: string | null
  imageUrl: string | null
  orgName: string
  slug: string
}

/**
 * The crawler-facing page: Open Graph + Twitter card tags only, no JS.
 * A meta-refresh and a plain link are the safety net for anything that
 * reaches here with a non-crawler UA but no redirect-following.
 */
export function ogHtml(campaign: OgCampaign, siteUrl: string): string {
  const pageUrl = siteCampaignUrl(siteUrl, campaign.slug)
  // The body copy doubles as the description; trimmed hard because some
  // platforms cut previews at ~200 chars.
  const description =
    campaign.description?.trim().slice(0, 200) ||
    `A fundraiser by ${campaign.orgName} on AidNet`
  const imageTag = campaign.imageUrl
    ? `\n  <meta property="og:image" content="${escapeHtml(campaign.imageUrl)}" />`
    : ''

  return `<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(campaign.title)}</title>
  <meta property="og:title" content="${escapeHtml(campaign.title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />${imageTag}
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}" />
</head>
<body>
  <p><a href="${escapeHtml(pageUrl)}">${escapeHtml(campaign.title)}</a></p>
</body>
</html>`
}

/** Crawler-facing page for an unknown/taken-down slug: no fake previews. */
export function ogNotFoundHtml(siteUrl: string): string {
  const home = siteUrl.replace(/\/+$/, '') || '/'
  return `<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <title>Campaign not found</title>
  <meta name="robots" content="noindex" />
</head>
<body>
  <p><a href="${escapeHtml(home)}">AidNet</a></p>
</body>
</html>`
}
