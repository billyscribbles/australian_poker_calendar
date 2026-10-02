import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../content/festivals.js'
import { MONTH_NAMES, festivalsInMonth, formatRange } from '../lib/calendar.js'
import TourLogo from './TourLogo.jsx'
import './FestivalList.css'

/** @typedef {import('../content/festivals.js').Festival} Festival */

/**
 * The List alternative to the timeline: one row per festival in the month.
 *
 * @param {object} props
 * @param {Festival[]} props.festivals  the whole year — this filters to the month
 * @param {number} props.year
 * @param {number} props.month          1–12
 */
export default function FestivalList({ festivals, year, month }) {
  const rows = festivalsInMonth(festivals, year, month)
  const label = `${MONTH_NAMES[month - 1]} ${year}`

  return (
    <ul className="festival-list" aria-label={`${label} festivals`}>
      {rows.map((festival) => (
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
            <span className="festival-row__dates">{formatRange(festival.start, festival.end)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
