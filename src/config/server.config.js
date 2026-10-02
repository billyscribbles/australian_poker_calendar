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
export const canonicalHost = null

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
}

/**
 * Extra Content-Security-Policy sources, per directive.
 *
 * The baseline in server/index.mjs covers what the template itself loads —
 * Google Fonts, GA4 and Formspree. A page that adds an embed (a booking
 * widget, a map, a video player) has to name its origins here or the browser
 * blocks them, silently, in production only.
 *
 * @type {Record<string, string[]>}
 */
export const cspExtra = {
  // 'script-src': ['https://assets.calendly.com'],
  // 'frame-src': ['https://www.google.com'],
}
