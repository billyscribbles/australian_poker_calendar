// Build-time entry point. Never shipped to the browser.
//
// Renders the same component tree main.jsx mounts, but to a string, so every
// route ships as real HTML instead of `<div id="root"></div>`.
//
// WHY THIS EXISTS: a client-rendered SPA is an empty document until ~120 kB of
// JavaScript has downloaded, parsed and run. Googlebot renders JS eventually,
// but Bing, DuckDuckGo, the AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and
// every social unfurler — Facebook, X, Slack, WhatsApp, iMessage — do not. To
// all of them the site is a blank page with fallback meta tags, which means no
// per-page titles in previews and, notably, no crawlable footer credit link.
//
// It also removes the blank-then-paint gap for real visitors: the fold comes
// from HTML and CSS alone, and React hydrates over it (see src/main.jsx).

import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
// React Router 7 exports StaticRouter from the package root; the /server
// subpath of the v6 era no longer exists.
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AppRoutes } from './App.jsx'
import { beginServerRender, loadAll, serverRenderWasComplete } from './lazyWithRetry.js'
import { themeCss } from './lib/applyTheme.js'

// Re-exported so scripts/prerender.mjs reads the route table from the same
// bundle it renders with, rather than a second copy that could disagree.
export { PRERENDER_ROUTES, routeModules } from './routes.js'

/**
 * Resolve every lazy page module. Must be awaited before the first render().
 *
 * React.lazy resolves asynchronously and renderToString is synchronous, so
 * without this a lazy route renders its Suspense fallback into the static file
 * instead of the page — site chrome wrapped around an empty slot.
 */
export async function prepare() {
  await loadAll()
}

/**
 * Render one route.
 *
 * @param {string} url  a concrete path, e.g. "/" or "/about"
 * @returns {{ html: string, head: string, complete: boolean }}
 *   `html` is the contents of #root, `head` the tags Helmet collected while
 *   rendering (this route's own title, description, canonical and OG tags), and
 *   `complete` is false if any page module was missing — see lazyWithRetry.js.
 */
export function render(url) {
  beginServerRender()
  const helmetContext = {}

  // The wrapper chain has to match src/main.jsx exactly — StrictMode, then
  // HelmetProvider, then a router — or hydration mismatches and React throws
  // the prerendered markup away, undoing the whole point of this file.
  const html = renderToString(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <AppRoutes />
        </StaticRouter>
      </HelmetProvider>
    </StrictMode>,
  )

  const { helmet } = helmetContext
  const head = [
    helmet?.title?.toString(),
    helmet?.meta?.toString(),
    helmet?.link?.toString(),
    helmet?.script?.toString(),
  ]
    .filter(Boolean)
    .join('\n    ')

  return { html, head, complete: serverRenderWasComplete() }
}

/** The og:image path from site.config, for the build's asset check. */
export { site as siteConfig } from './config/site.config.js'

/** The design tokens as a stylesheet, inlined into every document. */
export const themeStyles = themeCss()
