import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../content/festivals.js'
import { formatRangeWithYear } from '../lib/calendar.js'
import TourLogo from './TourLogo.jsx'
import './FestivalList.css'

/** @typedef {import('../content/festivals.js').Festival} Festival */

/**
 * A plain list of series, one row each, in the order given: the city and
 * tour pages' "Upcoming" and "Earlier" lists. Same row as FestivalList, with
 * the year in the dates since the list can span seasons.
 *
 * @param {object} props
 * @param {Festival[]} props.festivals
 * @param {string} props.label        accessible name for the list
 */
export default function SeriesList({ festivals, label }) {
  return (
    <ul className="festival-list" aria-label={label}>
      {festivals.map((festival) => (
        <li key={festival.href}>
          <Link
            to={festival.href}
            className={`festival-row${festival.status ? ' festival-row--off' : ''}`}
          >
            <TourLogo code={festival.tour} variant="icon" size={48} />
            <span className="festival-row__body">
              <span className="festival-row__name">
                {festival.status && (
                  <span className="festival-row__status">{STATUS_LABELS[festival.status]}</span>
                )}
                {festival.name}
              </span>
              <span className="festival-row__place">{festival.place}</span>
            </span>
            <span className="festival-row__dates">
              {formatRangeWithYear(festival.start, festival.end)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
