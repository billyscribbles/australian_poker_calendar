import { MapPin, ExternalLink } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import { whereToPlay } from '../content/whereToPlay.js'
import TourLogo from '../components/TourLogo.jsx'
import './WhereToPlayPage.css'

/** @typedef {import('../content/whereToPlay.js').VenueCard} VenueCard */

/** The hostname a link goes to, as the visible text beside "Visit website". */
function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** @param {{ venue: VenueCard }} props */
function VenueCard({ venue }) {
  const { operatorsLabel, visitLabel } = whereToPlay
  return (
    <li className="venue-card glow-card">
      <div className="venue-card__marks" aria-hidden="true">
        {venue.operators.map((operator) => (
          <TourLogo key={operator.code} code={operator.code} variant="icon" size={48} />
        ))}
      </div>
      <div className="venue-card__body">
        <h3 className="venue-card__name">{venue.name}</h3>
        <address className="venue-card__address">
          <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
          {venue.address}
        </address>
        <p className="venue-card__operators">
          <span className="venue-card__operators-label">{operatorsLabel}</span>{' '}
          {venue.operators.map((operator, i) => (
            <span key={operator.code}>
              {i > 0 && ', '}
              <a href={operator.website} target="_blank" rel="noopener noreferrer">
                {operator.name}
              </a>
            </span>
          ))}
        </p>
        <a
          className="venue-card__link"
          href={venue.website}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${visitLabel}: ${venue.name}`}
        >
          {visitLabel}
          <span className="venue-card__host">{host(venue.website)}</span>
          <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
        </a>
      </div>
    </li>
  )
}

/**
 * Where to play: one section per state, a card per venue. Everything comes
 * from content/whereToPlay.js; the operator marks and colours from
 * calendarPage.tours and tourBrands.js through TourLogo.
 */
export default function WhereToPlayPage() {
  const { seo, eyebrow, title, intro, jumpLabel, countLabel, states } = whereToPlay
  return (
    <main>
      <SEO title={seo.title} description={seo.description} path="/where-to-play" />
      <section className="venues-hero">
        <div className="container">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className="venues-hero__title">{title}</h1>
          <p className="venues-hero__sub">{intro}</p>
          <nav className="venues-jump" aria-label={jumpLabel}>
            {states.map((state) => (
              <a key={state.code} className="venues-jump__link" href={`#${state.code}`}>
                {state.name}
                <span className="venues-jump__count">{state.venues.length}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {states.map((state) => (
        <section
          key={state.code}
          id={state.code}
          className="venues-state"
          aria-labelledby={`venues-${state.code}-heading`}
        >
          <div className="container">
            <div className="venues-state__head">
              <h2 id={`venues-${state.code}-heading`} className="venues-state__heading">
                {state.name}
              </h2>
              <span className="venues-state__count">{countLabel(state.venues.length)}</span>
            </div>
            <ul className="venues-grid">
              {state.venues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </ul>
          </div>
        </section>
      ))}
    </main>
  )
}
