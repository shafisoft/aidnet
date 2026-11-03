// og — crawler-facing campaign preview.
//
// The static export (GitHub Pages) cannot emit per-slug meta tags and
// link-preview crawlers do not run JavaScript, so share links point
// HERE: crawlers (facebookexternalhit, WhatsApp, Twitterbot, ...) get a
// small Open Graph HTML page; humans get a 302 to the real page with
// their utm params forwarded.
//
//   share link: https://<ref>.supabase.co/functions/v1/og?slug=<slug>
//   crawler  -> 200 text/html (og:title/og:description/og:image)
//   human    -> 302 https://<site>/campaigns/detail/?slug=<slug>&utm...
//
// Env:
//   SITE_URL        site origin + base path, e.g. https://owner.github.io/donate
//                   (set with `supabase secrets set SITE_URL=...`)
//   SUPABASE_URL, SUPABASE_ANON_KEY — auto-injected by the platform.
//
// verify_jwt is disabled for this function (config.production.toml):
// crawlers never carry a JWT.
//
// Pure helpers (crawler detection, HTML, URL building) live in
// client/src/lib/ogPreview.ts so the unit suite tests the exact code
// deployed here; Deno requires the explicit .ts extension on imports.
import {
  isSocialCrawler,
  ogHtml,
  ogNotFoundHtml,
  redirectUrl,
} from "../../../client/src/lib/ogPreview.ts";

interface SlugRow {
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  org_name: string;
}

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  // Previews are scraped on every share; a short TTL keeps takedowns
  // effective while cutting repeat fetches to near zero.
  "cache-control": "public, max-age=300",
};

async function fetchCampaign(
  supabaseUrl: string,
  anonKey: string,
  slug: string,
): Promise<SlugRow | null> {
  const res = await fetch(
    `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/get_public_campaign_by_slug`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_slug: slug }),
    },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as SlugRow[];
  return Array.isArray(rows) ? (rows[0] ?? null) : null;
}

Deno.serve(async (req: Request) => {
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!siteUrl || !slug) {
    // Humans without a slug go home; misconfiguration is a 500 so it
    // shows up in the dashboard logs instead of redirecting silently.
    if (siteUrl && !slug) {
      return Response.redirect(`${siteUrl}/`, 302);
    }
    return new Response("og: SITE_URL or slug missing", { status: 500 });
  }

  if (!isSocialCrawler(req.headers.get("user-agent"))) {
    return Response.redirect(redirectUrl(siteUrl, slug, url.searchParams), 302);
  }

  const campaign = await fetchCampaign(supabaseUrl, anonKey, slug);
  if (!campaign) {
    // Unknown or taken-down slug: no fake preview, noindex.
    return new Response(ogNotFoundHtml(siteUrl), { headers: HTML_HEADERS });
  }

  return new Response(
    ogHtml(
      {
        title: campaign.title,
        description: campaign.description,
        imageUrl: campaign.cover_image_url,
        orgName: campaign.org_name,
        slug: campaign.slug,
      },
      siteUrl,
    ),
    { headers: HTML_HEADERS },
  );
});
