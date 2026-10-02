// Opt-in Google Analytics 4 wiring. Every function here is a no-op unless
// `integrations.gaId` is set (via VITE_GA_ID) — clients who skip analytics
// ship no gtag script and no tracking calls.

import { site } from '../config/site.config.js'
import { readConsent } from './consent.js'

const gaId = site.integrations.gaId

let initialized = false

// Injects the GA4 gtag script. Safe (and free) to call when no gaId is set.
// Call once at app boot, before the first route renders.
//
// When `integrations.consent` is on, this returns without loading anything
// until the visitor has accepted — no script, no cookie, no request. The
// banner calls it again on accept (see src/components/ConsentBanner.jsx).
export function initAnalytics() {
  if (!gaId || initialized || typeof document === 'undefined') return
  if (site.integrations.consent && readConsent() !== 'granted') return
  initialized = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  // gtag must forward `arguments` verbatim — this is the GA-prescribed shim.
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  // SPA: we emit page_view manually on route change (see trackPageview).
  window.gtag('config', gaId, { send_page_view: false })
}

// Records a single-page-app page view. No-ops when analytics is not configured.
export function trackPageview(path) {
  if (!gaId || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

/**
 * Records a conversion — a visitor doing the thing the site exists for.
 *
 * WHY THIS EXISTS SEPARATELY FROM trackPageview: a GA4 "key event" (what used
 * to be called a goal) can only be switched on for an event GA4 has actually
 * received. With no event ever fired, there is nothing to tick in the GA4 admin
 * UI, so a new site ships with pageviews and no way to tell whether it produced
 * a single enquiry — and finding that out later means editing code and waiting
 * another day for data. Firing it from the start means the goal is a checkbox.
 *
 * Mark the event as a key event in GA4: Admin -> Events -> toggle "Mark as key
 * event". Google Ads imports it from there.
 *
 * @param {string} name  snake_case, e.g. 'contact_form_submitted'
 * @param {Record<string, string|number>} [params]  e.g. { cta_location: 'footer' }
 */
export function trackConversion(name, params = {}) {
  if (!gaId || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

/**
 * Stops analytics for the rest of this session after consent is withdrawn.
 *
 * A visitor who accepted, then reopened the banner and declined, already has
 * the gtag script on the page and `_ga` cookies in the jar. Google's own
 * documented opt-out is a `ga-disable-<ID>` window flag, which every later
 * gtag call checks; the cookies are expired so nothing identifies them on the
 * next visit. The script tag itself stays — removing it does nothing once it
 * has run — and `initialized` is left set so nothing re-injects it.
 */
export function disableAnalytics() {
  if (!gaId || typeof window === 'undefined') return
  window[`ga-disable-${gaId}`] = true
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  const host = window.location.hostname
  for (const name of document.cookie.split(';').map((c) => c.trim().split('=')[0])) {
    if (!/^_ga(_|$)/.test(name)) continue
    // GA sets the cookie on the registrable domain, so clear both spellings.
    document.cookie = `${name}=; ${expired}`
    document.cookie = `${name}=; ${expired}; domain=${host}`
    document.cookie = `${name}=; ${expired}; domain=.${host}`
  }
}
