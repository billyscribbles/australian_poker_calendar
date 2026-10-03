# SEO: how the site gets found, and the launch checklist

What the build does on its own, what has to be done once in Google and Bing,
and how to tell whether it is working. The engineering behind it is in
`CLAUDE.md` under "Prerendering".

## What the build does

- **Every route is a real HTML document** (`scripts/prerender.mjs`): its own
  `<title>`, description, canonical, Open Graph and Twitter card, JSON-LD.
- **`sitemap.xml`** is generated from `src/routes.js` with a `<lastmod>` per
  URL taken from git (the last commit to the page or any content file it
  reads). `noindex` routes are left out. **`robots.txt`** allows everything but
  `/admin` and names the sitemap.
- **One URL per page**: `www` 301s to the apex, a trailing slash 301s to none,
  unknown paths are a real 404 (`server/index.mjs`).
- **Structured data**: `Organization` on every page; `WebSite` on the home
  page; `Event` on each series page; `ItemList` of events on the calendar,
  city and tour pages; `BreadcrumbList` on every inner page; the operator as
  an `Organization` on its tour page (`src/lib/structuredData.js`).
- **Landing pages for what people search**: `/series/<operator>` for the
  operator names (by far the largest demand: "apl poker", "npl poker", "kings
  poker", "crown poker"), `/poker/<city>` for "poker in Sydney" and the like,
  `/events/<series>` for each series, `/where-to-play` for venues. All are
  derived from `src/content/festivals.js` and `src/content/whereToPlay.js`, so
  a new series row lands on its city and tour pages with no second edit. A
  row in a city the site has no page for fails `src/test/cityPage.test.jsx`;
  add the city to `src/content/cities.js`.
- **Staging never competes**: `VITE_NOINDEX=true` there writes a Disallow-all
  robots and a noindex tag (`docs/ENVIRONMENTS.md`).

## Once, in Google Search Console

State as of 2026-10-03: a **Domain property** for `australianpokercalendar.com`
exists under Billy's Google account and is **unverified**, waiting on the TXT
record below. The sitemap has not been submitted.

1. **Verify by DNS**: in Cloudflare, add a TXT record at the apex (`@`) with
   the value Search Console shows (`google-site-verification=…`). Check with
   `dig +short TXT australianpokercalendar.com`, then click Verify. A domain
   property covers www, apex, http and https in one, and only DNS verifies it.
   The HTML-tag method (`VITE_GOOGLE_SITE_VERIFICATION`, shipped on every page
   when set on the Railway production service) verifies a URL-prefix property
   only; use it if the DNS route is blocked.
2. **Submit the sitemap**: Sitemaps → `https://australianpokercalendar.com/sitemap.xml`.
3. **Request indexing for the hubs** with URL Inspection, in this order: `/`,
   `/poker-calendar/2026`, `/series`, `/series/apl`, `/poker/sydney`,
   `/poker/melbourne`, `/where-to-play`. The rest follow the links.
4. After a week, read **Pages** (indexed vs not), **Enhancements → Events and
   Breadcrumbs** (the rich results), and **Performance → Queries**.

## Once, in Bing Webmaster Tools

Bing feeds DuckDuckGo and the AI assistants. Add the site, **import from
Search Console** (one click, no second verification), submit the sitemap. The
meta-tag fallback is `VITE_BING_SITE_VERIFICATION`.

## Off-site, which no build can do

- **Real social profiles.** `site.config.js` ships platform roots as
  placeholders; the `sameAs` in the Organization record skips those. Put the
  real profile URLs in and they are picked up.
- **Links from the operators.** Each tour page links to the operator's site.
  Ask them (contacts are in `data/README.md`) to link back to their tour page
  or their series page from their own schedule.
- **Google Business Profile** is not applicable: the site is not a venue.

## Is it working

- `site:australianpokercalendar.com` in Google shows the page count indexed.
- Search Console → Performance, filtered to a query ("apl poker"), shows the
  position over time.
- `yarn build` prints the sitemap URL count; `curl -s https://australianpokercalendar.com/sitemap.xml | grep -c '<url>'` should match.
