import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { site } from '../config/site.config.js'
import { consent } from '../content/consent.js'
import { CONSENT_OPEN_EVENT, readConsent, writeConsent } from '../lib/consent.js'
import { disableAnalytics, initAnalytics } from '../lib/analytics.js'
import './ConsentBanner.css'

/**
 * Asks before any tracking cookie is set. Renders nothing unless
 * `integrations.consent` is on and the visitor has not answered yet — or has
 * asked to change their answer via the footer's "Cookie settings" control.
 *
 * WHY IT MOUNTS EMPTY FIRST: the build prerenders every route, and the server
 * has no localStorage, so the static HTML never contains the banner. If the
 * browser's first render drew it, that render would disagree with the markup it
 * is hydrating and React would throw the whole prerendered document away. So
 * the decision is made in an effect, one tick after mount — the same reason the
 * cart in other sites built from this template loads its contents in an effect.
 *
 * Copy lives in src/content/consent.js. Deliberately plain: a bar, two buttons,
 * theme tokens only. It is a legal control, not a design feature, and every
 * site using it should be free to restyle it without unpicking behaviour.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!site.integrations.consent) return undefined
    if (readConsent() === null) setVisible(true)

    const reopen = () => setVisible(true)
    window.addEventListener(CONSENT_OPEN_EVENT, reopen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen)
  }, [])

  if (!visible) return null

  const decide = (value) => {
    const previous = readConsent()
    writeConsent(value)
    setVisible(false)
    // Accepting has to take effect now, not on the next page load — otherwise
    // the visit that granted consent is the one visit that goes uncounted.
    if (value === 'granted') initAnalytics()
    // Withdrawing has to take effect now too, for the mirror-image reason.
    if (value === 'denied' && previous === 'granted') disableAnalytics()
  }

  return (
    <div className="consent" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <p className="consent__text">
        {consent.text}{' '}
        <Link to="/privacy" className="consent__link">
          {consent.privacyLabel}
        </Link>
      </p>
      <div className="consent__actions">
        <button type="button" className="consent__btn" onClick={() => decide('denied')}>
          {consent.decline}
        </button>
        <button
          type="button"
          className="consent__btn consent__btn--accept"
          onClick={() => decide('granted')}
        >
          {consent.accept}
        </button>
      </div>
    </div>
  )
}
