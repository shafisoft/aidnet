import { describe, expect, it } from 'vitest'
import {
  escapeHtml,
  isSocialCrawler,
  ogHtml,
  ogNotFoundHtml,
  redirectUrl,
  siteCampaignUrl,
} from './ogPreview'

describe('isSocialCrawler', () => {
  it('When the UA is a link-preview crawler, it is detected', () => {
    expect(isSocialCrawler('facebookexternalhit/1.1')).toBe(true)
    expect(isSocialCrawler('WhatsApp/2.23.20.0 A')).toBe(true)
    expect(isSocialCrawler('Twitterbot/1.0')).toBe(true)
    expect(isSocialCrawler('Mozilla/5.0 (compatible; Discordbot/2.0)')).toBe(
      true
    )
  })

  it('When the UA is a normal browser, it is not a crawler', () => {
    expect(
      isSocialCrawler(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
      )
    ).toBe(false)
    expect(isSocialCrawler('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5)')).toBe(
      false
    )
  })

  it('When the UA is missing, it is not a crawler', () => {
    expect(isSocialCrawler(null)).toBe(false)
    expect(isSocialCrawler(undefined)).toBe(false)
    expect(isSocialCrawler('')).toBe(false)
  })
})

describe('siteCampaignUrl', () => {
  it('When the site is at a root domain, the URL has no base path', () => {
    expect(siteCampaignUrl('https://aidnet.example', 'flood-relief')).toBe(
      'https://aidnet.example/campaigns/detail/?slug=flood-relief'
    )
  })

  it('When the site is on project pages, the base path is preserved', () => {
    expect(
      siteCampaignUrl('https://owner.github.io/donate/', 'flood-relief')
    ).toBe('https://owner.github.io/donate/campaigns/detail/?slug=flood-relief')
  })

  it('When the slug needs escaping, it is encoded', () => {
    expect(siteCampaignUrl('https://aidnet.example', 'a b&c')).toContain(
      'slug=a%20b%26c'
    )
  })
})

describe('redirectUrl', () => {
  it('When the function URL has only the slug, the redirect is the plain campaign URL', () => {
    const params = new URLSearchParams('slug=flood-relief')
    expect(redirectUrl('https://aidnet.example', 'flood-relief', params)).toBe(
      'https://aidnet.example/campaigns/detail/?slug=flood-relief'
    )
  })

  it('When the function URL carries utm params, they survive the redirect', () => {
    const params = new URLSearchParams('slug=flood-relief&utm_source=share')
    expect(redirectUrl('https://aidnet.example', 'flood-relief', params)).toBe(
      'https://aidnet.example/campaigns/detail/?slug=flood-relief&utm_source=share'
    )
  })
})

describe('escapeHtml', () => {
  it('When the title contains HTML, it is escaped for attribute context', () => {
    expect(escapeHtml(`<script>"x"&'</script>`)).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;&lt;/script&gt;'
    )
  })
})

describe('ogHtml', () => {
  const siteUrl = 'https://owner.github.io/donate'

  it('When the campaign has full data, OG tags carry title, description, image and page URL', () => {
    const html = ogHtml(
      {
        title: 'Flood relief <test>',
        description: 'Help the families.  ',
        imageUrl: 'https://cdn.example/cover.png',
        orgName: 'Rahim',
        slug: 'flood-relief',
      },
      siteUrl
    )
    expect(html).toContain(
      '<meta property="og:title" content="Flood relief &lt;test&gt;" />'
    )
    expect(html).toContain(
      '<meta property="og:description" content="Help the families." />'
    )
    expect(html).toContain(
      '<meta property="og:image" content="https://cdn.example/cover.png" />'
    )
    expect(html).toContain(
      '<meta property="og:url" content="https://owner.github.io/donate/campaigns/detail/?slug=flood-relief" />'
    )
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image" />'
    )
    expect(html).toContain('<meta http-equiv="refresh" content="0;url=')
  })

  it('When the description is missing, the org line is the fallback', () => {
    const html = ogHtml(
      {
        title: 'T',
        description: null,
        imageUrl: null,
        orgName: 'Rahim',
        slug: 's',
      },
      siteUrl
    )
    expect(html).toContain('A fundraiser by Rahim on AidNet')
    expect(html).not.toContain('og:image')
  })

  it('When the description is very long, it is cut to preview size', () => {
    const html = ogHtml(
      {
        title: 'T',
        description: 'x'.repeat(500),
        imageUrl: null,
        orgName: 'O',
        slug: 's',
      },
      siteUrl
    )
    expect(html).toContain('x'.repeat(200))
    expect(html).not.toContain('x'.repeat(201))
  })
})

describe('ogNotFoundHtml', () => {
  it('When the slug is unknown, the page is noindex and links home', () => {
    const html = ogNotFoundHtml('https://aidnet.example')
    expect(html).toContain('<meta name="robots" content="noindex" />')
    expect(html).toContain('<a href="https://aidnet.example">AidNet</a>')
  })
})
