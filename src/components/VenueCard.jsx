import { MapPin, ExternalLink } from 'lucide-react'
import { whereToPlay } from '../content/whereToPlay.js'
import TourLogo from './TourLogo.jsx'
import './VenueCard.css'

/** @typedef {import('../content/whereToPlay.js').VenueCard} Venue */

/** The hostname a link goes to, as the visible text beside "Visit website". */
function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * One venue: the marks of the operators that deal there, its name, street
 * address, operators and a link out. Lives in a `.venues-grid` list.
 *
 * @param {{ venue: Venue }} props
 */
export default function VenueCard({ venue }) {
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
