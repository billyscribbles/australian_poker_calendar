import { Link } from 'react-router-dom'
import { calendar } from '../content/calendar.js'
import SectionHeading from './SectionHeading.jsx'
import OutlineButton from './OutlineButton.jsx'
import './PokerCalendar.css'

/** @typedef {import('../content/calendar.js').CalendarEntry} CalendarEntry */

/** @param {{ entry: CalendarEntry }} props */
function CalendarCard({ entry }) {
  return (
    <li>
      <Link to={entry.href} className="calendar-card">
        <div className="calendar-card__date">
          <div className="calendar-card__day">{entry.day}</div>
          <div className="calendar-card__month">{entry.month}</div>
        </div>
        <div className="calendar-card__body">
          <h3 className="calendar-card__name">{entry.name}</h3>
          <div className="calendar-card__meta">{entry.range}</div>
          <div className="calendar-card__meta">{entry.venue}</div>
        </div>
      </Link>
    </li>
  )
}

/** Poker Calendar sidebar: upcoming series with a date block. */
export default function PokerCalendar() {
  return (
    <div className="poker-calendar" role="region" aria-labelledby="poker-calendar-heading">
      <SectionHeading id="poker-calendar-heading">{calendar.heading}</SectionHeading>
      <ul className="poker-calendar__list">
        {calendar.items.map((entry) => (
          <CalendarCard key={entry.href} entry={entry} />
        ))}
      </ul>
      <OutlineButton to={calendar.cta.to}>{calendar.cta.label}</OutlineButton>
    </div>
  )
}
