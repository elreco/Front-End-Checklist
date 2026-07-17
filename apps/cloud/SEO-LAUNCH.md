# CodeRocket SEO relaunch checklist

The canonical production origin is `https://www.coderocket.app`. The apex permanently redirects
to `www` while preserving the path and query string. `https://docs.coderocket.app` is a shortcut
to the canonical `/docs` section.

## 1. Domain and certificate

- Remove the current CodeRocket-to-WatchPeak redirect at the existing host or edge provider.
- Add `coderocket.app`, `www.coderocket.app`, and `docs.coderocket.app` to the CodeRocket Fly.io
  application.
- Copy the exact DNS records shown by Fly.io; do not reuse records from WatchPeak.
- Wait for both certificates to become valid before changing public traffic.
- Confirm `www` returns CodeRocket with `200`, the apex returns a single `308` to the same `www`
  path, and `docs` redirects directly into the canonical `/docs` section. There must be no redirect
  chain through WatchPeak.

## 2. Google Search Console

- Keep or create a Domain property for `coderocket.app` and verify it with the DNS TXT record.
- Do **not** use Change of Address: CodeRocket is returning to the same domain, not moving to a new
  domain. If a Change of Address to WatchPeak was previously configured, cancel it.
- Set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` only if an HTML-tag verification is also needed.
- Submit `https://www.coderocket.app/sitemap.xml` after the DNS and certificate checks pass.
- Inspect and request indexing for `/`, `/pricing`, `/docs`, and `/docs/rules`.
- Check the Pages, Sitemaps, HTTPS, Core Web Vitals, and Enhancements reports during the first month.

## 3. Old indexed URLs

- `/pricing` remains a real `200` page with the new CodeRocket offer.
- Former builder, community, component, and profile routes return `410 Gone` with `noindex`.
- Do not redirect unrelated old URLs to the homepage; that can be treated as a soft 404.
- Leave the `410` behavior in place while Google removes the old results. Avoid temporary removal
  requests unless an old result exposes sensitive information.

## 4. Release verification

Run these checks against production:

```bash
curl -I https://www.coderocket.app/
curl -I https://coderocket.app/pricing
curl -I https://docs.coderocket.app/rules/accessibility/semantic-lists
curl -I https://www.coderocket.app/open-source
curl https://www.coderocket.app/robots.txt
curl https://www.coderocket.app/sitemap.xml
```

Expected results:

- `www` homepage: `200`
- apex pricing: one `308` to `https://www.coderocket.app/pricing`
- `docs` rule shortcut: one `308` to
  `https://www.coderocket.app/docs/rules/accessibility/semantic-lists`
- former `/open-source`: `410`
- public pages: one self-referencing canonical and `index, follow`
- account and app pages: `X-Robots-Tag: noindex, nofollow, noarchive`
- Open Graph endpoints: `200`, `image/png`, `1200 × 630`

## 5. Ongoing monitoring

- Keep public titles, descriptions, canonicals, structured data, and sitemap entries covered by the
  cloud build and SEO tests.
- Review Search Console queries and pages after 7, 14, and 30 days.
- Update the homepage and documentation from real user questions rather than creating thin landing
  pages for keyword variations.
- Update legal publisher details before enabling paid public access.
