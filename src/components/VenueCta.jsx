import { Link, useLocation } from 'react-router-dom'
import { venueForm } from '../content/contact.js'
import './VenueCta.css'

// The short poker-room band at the top of the footer. It sits on every page
// and sends operators to the listing form at venueForm.path — except on that
// page, where the form is already above it.
export default function VenueCta() {
  const { pathname } = useLocation()
  if (pathname.replace(/\/+$/, '') === venueForm.path) return null

  return (
    <section className="venue-cta" aria-labelledby="venue-cta-heading">
      <div className="venue-cta__inner">
        <div className="venue-cta__copy">
          <span className="venue-cta__eyebrow">{venueForm.eyebrow}</span>
          <h2 className="venue-cta__heading" id="venue-cta-heading">
            {venueForm.cta.heading}
          </h2>
          <p className="venue-cta__sub">{venueForm.cta.sub}</p>
        </div>
        <Link to={venueForm.path} className="venue-cta__button">
          {venueForm.cta.button}
        </Link>
      </div>
    </section>
  )
}
