import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { whereToPlay } from '../content/whereToPlay.js'
import TourLogo from './TourLogo.jsx'
import './VenueCard.css'

/**
 * One Major: an operator with series on the calendar. Its mark, name, how many
 * series it has on the calendar, the states it deals in and a link to its own
 * tour page. Shares the venue card's frame in a `.venues-grid` list.
 *
 * @param {{ major: { code: string, name: string, href: string, count: number, states: string[] } }} props
 */
export default function MajorCard({ major }) {
  const { majors } = whereToPlay.all
  const { leagues } = whereToPlay
  return (
    <li className="venue-card glow-card">
      <div className="venue-card__marks" aria-hidden="true">
        <TourLogo code={major.code} variant="icon" size={48} />
      </div>
      <div className="venue-card__body">
        <h3 className="venue-card__name">{major.name}</h3>
        <p className="venue-card__about">{majors.seriesLabel(major.count)}</p>
        {major.states.length > 0 && (
          <p className="venue-card__states">
            <span className="venue-card__operators-label">{leagues.statesLabel}</span>{' '}
            {major.states.join(', ')}
          </p>
        )}
        <Link
          className="venue-card__link"
          to={major.href}
          aria-label={`${majors.linkLabel}: ${major.name}`}
        >
          {majors.linkLabel}
          <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}
