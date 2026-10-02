import { Link } from 'react-router-dom'
import { calendarPage } from '../content/calendarPage.js'
import SectionHeading from './SectionHeading.jsx'
import TourLogo from './TourLogo.jsx'
import './UpNext.css'

/**
 * "Up Next" column on the calendar page: the next few festivals with prize
 * pool and event count where the operator has published them. A region rather than an <aside>: it sits inside
 * <main>, and axe (landmark-complementary-is-top-level) rejects a nested aside.
 */
export default function UpNext() {
  const { heading, eventsLabel, items } = calendarPage.upNext
  return (
    <section className="up-next" aria-labelledby="up-next-heading">
      <SectionHeading id="up-next-heading">{heading}</SectionHeading>
      <ul className="up-next__list">
        {items.map((item) => (
          <li key={item.href}>
            <Link to={item.href} className="up-next__card">
              <TourLogo code={item.tour} variant="icon" size={44} />
              <span className="up-next__body">
                <span className="up-next__name">{item.name}</span>
                <span className="up-next__meta">
                  {item.dates} · {item.place}
                </span>
              </span>
              <span className="up-next__figures">
                {item.prize && <span className="up-next__prize">{item.prize}</span>}
                {item.events != null && (
                  <span className="up-next__events">
                    {item.events} {eventsLabel}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
