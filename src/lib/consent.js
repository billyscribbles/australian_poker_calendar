// Analytics consent, stored per visitor.
//
// OFF BY DEFAULT in the template, and that is a deliberate legal-ish judgement
// rather than an oversight: Australian privacy law does not require an opt-in
// banner for first-party analytics the way GDPR does, and a banner on a small
// business site costs conversions and Lighthouse points for no benefit. Turn it
// on (`integrations.consent: true` in site.config.js) when a client sells into
// the EU/UK, asks for it, or their own legal advice says so.
//
// When it is on, GA4 does not load at all until the visitor accepts — no
// script, no cookie, no network call. That is the only version of "consent"
// worth shipping; a banner that loads the tag anyway is theatre.

const KEY = 'consent:analytics'

// Fired on `window` to ask the banner to show itself again, so a visitor can
// change their mind from the footer. Withdrawing consent has to be as easy as
// giving it; a banner that only ever shows once fails that.
export const CONSENT_OPEN_EVENT = 'consent:open'

/** 'granted' | 'denied' | null (no choice made yet). */
export function readConsent() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    // Private-mode Safari, or storage disabled. Treat as "no choice": the
    // banner shows again next visit, which is the conservative outcome.
    return null
  }
}

export function writeConsent(value) {
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // Nothing to do — the visitor's choice holds for this page view only.
  }
}

/** Reopen the banner (see ConsentBanner.jsx). Safe to call anywhere. */
export function openConsent() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))
}
