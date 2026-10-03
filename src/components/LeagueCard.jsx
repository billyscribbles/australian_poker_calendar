import { ExternalLink } from 'lucide-react'
import { whereToPlay } from '../content/whereToPlay.js'
import TourLogo from './TourLogo.jsx'
import './VenueCard.css'

/** @typedef {import('../content/whereToPlay.js').LeagueCard} League */

/**
 * One pub poker league: its mark, name, the states it plays in, a line on how
 * it runs and a link to its own list of venues. Shares the venue card's frame
 * in a `.venues-grid` list; a league plays in too many pubs to list each one.
 *
 * @param {{ league: League }} props
 */
export default function LeagueCard({ league }) {
  const { leagues } = whereToPlay
  return (
    <li className="venue-card glow-card">
      <div className="venue-card__marks" aria-hidden="true">
        <TourLogo code={league.code ?? ''} mark={league.mark} variant="icon" size={48} />
      </div>
      <div className="venue-card__body">
        <h3 className="venue-card__name">{league.name}</h3>
        <p className="venue-card__states">
          <span className="venue-card__operators-label">{leagues.statesLabel}</span>{' '}
          {league.states.join(', ')}
        </p>
        <p className="venue-card__about">{league.about}</p>
        <a
          className="venue-card__link"
          href={league.website}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${leagues.findLabel}: ${league.name}`}
        >
          {leagues.findLabel}
          <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
        </a>
      </div>
    </li>
  )
}
