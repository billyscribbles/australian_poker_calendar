import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { nextEvents, nextUp } from '../content/eventPages.js'
import { tourBrandStyle } from '../content/tourBrands.js'
import { calendarPath } from '../routes.js'
import { formatRangeWithYear } from '../lib/calendar.js'
import { useToday } from '../lib/useToday.js'
import SectionHeading from './SectionHeading.jsx'
import TourLogo from './TourLogo.jsx'
import './NextEvents.css'

/**
 * The foot of a series page: the next few series to start, one rounded card
 * each on the operator's own colours with its wordmark, through to that
 * series' page. `path` is the page's own series, which is never offered.
 * Renders nothing once the calendar runs out. The year link follows the first
 * card's start, so it lands on the document those cards sit in.
 */
export default function NextEvents({ path }) {
  const today = useToday()
  const picks = nextEvents(path, today, nextUp.count)
  if (picks.length === 0) return null
  const year = Number(picks[0].start.slice(0, 4))
  return (
    <section className="container next-events" aria-labelledby="next-events-heading">
      <div className="next-events__bar">
        <SectionHeading id="next-events-heading">{nextUp.heading}</SectionHeading>
        <Link to={calendarPath(year)} className="next-events__all">
          {nextUp.link}
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
        </Link>
      </div>
      <ul className="next-events__list">
        {picks.map((festival) => (
          <li key={festival.href}>
            <Link to={festival.href} className="next-event" style={tourBrandStyle(festival.tour)}>
              <span className="next-event__band">
                <TourLogo code={festival.tour} variant="wordmark" size={56} />
              </span>
              <span className="next-event__body">
                <span className="next-event__name">{festival.name}</span>
                <span className="next-event__dates">
                  {formatRangeWithYear(festival.start, festival.end)}
                </span>
                <span className="next-event__place">{festival.place}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
