// Settings the production server needs, kept apart from site.config.js.
//
// WHY A SEPARATE FILE: site.config.js reads `import.meta.env`, which Vite
// replaces at build time and which throws in plain Node. server/index.mjs runs
// in plain Node, so it cannot import that file. Everything here is literal data
// with no bundler involvement, importable from either side.

/**
 * Which hostname is the real one. The other 301s to it, on every path.
 *
 * 'apex' — example.com is canonical, www.example.com redirects to it
 * 'www'  — the reverse
 * null   — leave hosts alone (a staging-only or single-host deploy)
 *
 * WHY IT MATTERS: with both hosts answering 200, Google indexes two copies of
 * every page and splits the ranking signals between them. onraistudio.com lost
 * its sitelinks to exactly that in July 2026, with the home page indexed on the
 * apex and inner pages on www.
 *
 * And redirect EVERY path, not just "/". A host that redirects its root but
 * 404s /about is worse than no redirect at all — every deep link into the wrong
 * host dies. ausflexcaravans.com.au is configured that way at the edge right
 * now, which is how this was found.
 */
export const canonicalHost = 'apex'

/**
 * 301s for URLs the old site ranked for.
 *
 * If an earlier site lived on this domain, the pages Google already knows about are
 * the most valuable thing the old site has. A dead URL throws that away; a 301
 * passes it to the new page. Fill this in from the old site's Search Console
 * "Pages" report or its sitemap before launch, and leave it empty otherwise.
 *
 * Keys are paths (no domain, no trailing slash), values are the new path.
 *
 * @type {Record<string, string>}
 */
export const legacyRedirects = {
  // '/series-timeline/': '/poker-calendar/2026',
  // '/about-us/': '/about',
  // World Pro Poker was on the calendar for a day (2026-10-03); it is a league
  // now, listed on Where to Play, so its tour and finals pages point there.
  '/tours/world-pro-poker': '/where-to-play',
  '/events/world-pro-poker-super-mega-stack-series-final-2026': '/where-to-play',
  '/events/world-pro-poker-high-rollers-main-event-2026': '/where-to-play',
  '/events/world-pro-poker-chockys-wargames-grand-final-2026': '/where-to-play',
  // The operator pages moved from /tours to /series (2026-10-04).
  '/tours': '/series',
  '/tours/australian-poker-tour': '/series/australian-poker-tour',
  '/tours/apl': '/series/apl',
  '/tours/aplpt': '/series/aplpt',
  '/tours/kings-poker': '/series/kings-poker',
  '/tours/crown-poker': '/series/crown-poker',
  '/tours/aurum-poker': '/series/aurum-poker',
  '/tours/playlive-melbourne': '/series/playlive-melbourne',
  '/tours/national-poker-league': '/series/national-poker-league',
  '/tours/empire-poker': '/series/empire-poker',
  '/tours/poker-palace': '/series/poker-palace',
  '/tours/queen-bs-poker': '/series/queen-bs-poker',
  '/tours/wpt-league': '/series/wpt-league',
  '/tours/stacked-poker': '/series/stacked-poker',
  '/tours/mixed-games-academy': '/series/mixed-games-academy',
  '/tours/the-star-poker': '/series/the-star-poker',
  '/tours/gambier-poker': '/series/gambier-poker',
  '/tours/check-raise-poker': '/series/check-raise-poker',
  '/tours/matchroom-poker': '/series/matchroom-poker',
}

/**
 * Extra Content-Security-Policy sources, per directive.
 *
 * The baseline in server/index.mjs covers what the template itself loads —
 * Google Fonts and GA4. A page that adds an embed (a booking
 * widget, a map, a video player) has to name its origins here or the browser
 * blocks them, silently, in production only.
 *
 * @type {Record<string, string[]>}
 */
export const cspExtra = {
  // Cloudflare Web Analytics: the proxy in front of Railway injects its beacon
  // into every page. Unlisted, the browser blocks it and logs a CSP error on
  // every load, which costs the Lighthouse best-practices score.
  'script-src': ['https://static.cloudflareinsights.com'],
  'connect-src': ['https://cloudflareinsights.com'],
  // 'script-src': ['https://assets.calendly.com'],
  // 'frame-src': ['https://www.google.com'],
}
