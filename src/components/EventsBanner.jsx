import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Flag, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  heroEvent,
  sideEvents,
  moreEvents,
  ticker,
  tickerControls,
  featuredLabel,
} from '../content/events.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import { Badge, LiveBadge } from './Badge.jsx'
import TourLogo from './TourLogo.jsx'
import './EventsBanner.css'

/** @typedef {import('../content/events.js').HeroEvent} HeroEvent */
/** @typedef {import('../content/events.js').SideEvent} SideEvent */
/** @typedef {import('../content/events.js').TickerEvent} TickerEvent */

/** @param {{ event: HeroEvent }} props */
function LiveEventCard({ event }) {
  return (
    <Link to={event.href} className="live-event">
      <div className="live-event__body">
        <div className="live-event__title-row">
          <TourLogo code={event.tour} variant="icon" size={56} />
          <span className="live-event__name">{event.name}</span>
        </div>
        <div className="live-event__rule" aria-hidden="true" />
        <ul className="live-event__meta">
          <li className="live-event__meta-row">
            <Calendar size={18} strokeWidth={1.5} aria-hidden="true" />
            {event.dates}
          </li>
          <li className="live-event__meta-row">
            <Flag size={18} strokeWidth={1.5} aria-hidden="true" />
            {event.place}
          </li>
          <li className="live-event__meta-row">
            <MapPin size={18} strokeWidth={1.5} aria-hidden="true" />
            {event.venue}
          </li>
        </ul>
      </div>
      {/* The largest thing above the fold on every viewport, so the LCP
          image: eager and high priority, never lazy. */}
      <ImagePlaceholder
        label="event key visual"
        className="live-event__visual"
        src={event.imageSrc}
        width={520}
        height={252}
        priority
      />
      {event.featured ? (
        <Badge variant="outline" className="live-event__badge">
          {featuredLabel}
        </Badge>
      ) : (
        <LiveBadge className="live-event__badge" />
      )}
    </Link>
  )
}

/** @param {{ event: SideEvent }} props */
function SideEventCard({ event }) {
  return (
    <Link to={event.href} className="side-event">
      <ImagePlaceholder
        label="event key visual"
        labelAlign="top-left"
        className="side-event__visual"
        src={event.imageSrc}
        width={400}
        height={300}
      />
      {event.status === 'live' ? (
        <LiveBadge className="side-event__badge" />
      ) : (
        <Badge variant="neutral" className="side-event__badge">
          Upcoming
        </Badge>
      )}
      <div className="side-event__content">
        <div className="side-event__logo">
          <TourLogo code={event.tour} variant="icon" size={44} />
        </div>
        <div className="side-event__text">
          <h3 className="side-event__name">{event.name}</h3>
          <div className="side-event__date">
            <Calendar size={16} strokeWidth={1.5} aria-hidden="true" />
            {event.dates}
          </div>
        </div>
      </div>
    </Link>
  )
}

/** @param {{ event: TickerEvent }} props */
function TickerChip({ event }) {
  return (
    <Link to={event.href} className={`ticker-chip${event.live ? ' ticker-chip--live' : ''}`}>
      <div className="ticker-chip__logo">
        <TourLogo code={event.tour} variant="icon" size={56} />
      </div>
      <div className="ticker-chip__body">
        <div className="ticker-chip__buyin">
          {event.buyIn} <span className="ticker-chip__currency">{event.currency}</span>
        </div>
        <div className="ticker-chip__name">{event.name}</div>
        <div className="ticker-chip__meta">
          <span>{event.date}</span>
          <span>{event.entries ?? event.guarantee}</span>
        </div>
      </div>
      {event.live && (
        <>
          <div className="ticker-chip__leaders">
            <div className="ticker-chip__level">{event.level}</div>
            {event.leaders.map((leader, i) => (
              <div key={leader.stack}>
                <span className="ticker-chip__rank">{i + 1}</span>{' '}
                <span className="ticker-chip__stack">{leader.stack}</span> <span>{leader.bb}</span>
              </div>
            ))}
          </div>
          <LiveBadge size="sm" className="ticker-chip__live" />
        </>
      )}
    </Link>
  )
}

/**
 * The chips in a scroller with a button at each end. The buttons page by
 * most of a viewport; the row's edge fades while there is more that way.
 * Touch users swipe, so the buttons are hidden for them in CSS.
 *
 * The static document is rendered at the start of the row, so the first
 * client render says the same (more to the right, nothing to the left) and
 * the real edges are measured once mounted.
 *
 * @param {{ events: TickerEvent[] }} props
 */
function Ticker({ events }) {
  const ref = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const update = () => {
      setAtStart(el.scrollLeft <= 1)
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const page = (direction) => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' })
  }

  const className = [
    'ticker scroll-row',
    !atStart && 'ticker--more-start',
    !atEnd && 'ticker--more-end',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="ticker-wrap">
      <button
        type="button"
        className="ticker__arrow ticker__arrow--prev"
        onClick={() => page(-1)}
        disabled={atStart}
        aria-label={tickerControls.prev}
      >
        <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      <div className={className} ref={ref}>
        {events.map((event) => (
          <TickerChip key={`${event.href}#${event.name}`} event={event} />
        ))}
      </div>
      <button
        type="button"
        className="ticker__arrow ticker__arrow--next"
        onClick={() => page(1)}
        disabled={atEnd}
        aria-label={tickerControls.next}
      >
        <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * Events banner: live hero event, two side events, a "More" link, and the
 * horizontally scrolling tournament ticker beneath them.
 */
export default function EventsBanner() {
  return (
    <section className="events-banner" aria-labelledby="events-banner-heading">
      <h2 className="sr-only" id="events-banner-heading">
        Featured events
      </h2>
      <div className="events-banner__grid">
        <LiveEventCard event={heroEvent} />
        {sideEvents.map((event) => (
          <SideEventCard key={event.href} event={event} />
        ))}
        <Link to={moreEvents.href} className="events-more">
          <span className="events-more__circle" aria-hidden="true">
            <ChevronRight size={16} strokeWidth={2} />
          </span>
          {moreEvents.label}
          <span className="sr-only"> {moreEvents.srLabel}</span>
        </Link>
      </div>
      <Ticker events={ticker} />
    </section>
  )
}
