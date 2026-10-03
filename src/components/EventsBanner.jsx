import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Flag, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  heroEvent,
  sideEvents,
  ticker,
  tickerSeries,
  tickerControls,
  featuredLabel,
  phaseLabels,
} from '../content/events.js'
import { festivals } from '../content/festivals.js'
import { phaseOn } from '../lib/calendar.js'
import { useToday } from '../lib/useToday.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import { Badge, LiveBadge } from './Badge.jsx'
import TourLogo from './TourLogo.jsx'
import './EventsBanner.css'

/** @typedef {import('../content/events.js').HeroEvent} HeroEvent */
/** @typedef {import('../content/events.js').SideEvent} SideEvent */
/** @typedef {import('../content/events.js').TickerEvent} TickerEvent */
/** @typedef {import('../content/events.js').TickerSeries} TickerSeries */

const festivalByHref = new Map(festivals.map((festival) => [festival.href, festival]))

/**
 * Whether the series behind a card is running today, read off its calendar
 * row so the badges move with the date instead of being typed by hand.
 * @returns {'upcoming' | 'live' | 'finished'}
 */
function useSeriesPhase(href) {
  const today = useToday()
  const festival = festivalByHref.get(href)
  return festival ? phaseOn(festival.start, festival.end, today) : 'upcoming'
}

/** @param {{ event: HeroEvent }} props */
function LiveEventCard({ event }) {
  const phase = useSeriesPhase(event.href)
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
      {phase === 'live' ? (
        <LiveBadge className="live-event__badge" />
      ) : phase === 'upcoming' ? (
        <Badge variant="outline" className="live-event__badge">
          {featuredLabel}
        </Badge>
      ) : (
        <Badge variant="neutral" className="live-event__badge">
          {phaseLabels.finished}
        </Badge>
      )}
    </Link>
  )
}

/** @param {{ event: SideEvent }} props */
function SideEventCard({ event }) {
  const phase = useSeriesPhase(event.href)
  return (
    <Link to={event.href} className="side-event">
      <ImagePlaceholder
        label="event key visual"
        labelAlign="top-left"
        className="side-event__visual"
        src={event.imageSrc}
        // The card's real size (scripts/gen-event-cards.py). The poster is
        // drawn at full width and natural height, so a wrong ratio here
        // reserves the wrong box and the row jumps when the image lands.
        width={500}
        height={625}
      />
      {phase === 'live' ? (
        <LiveBadge className="side-event__badge" />
      ) : (
        <Badge variant="neutral" className="side-event__badge">
          {phaseLabels[phase]}
        </Badge>
      )}
      <div className="side-event__content">
        <div className="side-event__logo">
          <TourLogo code={event.tour} variant="icon" size={44} />
        </div>
        <div className="side-event__text">
          <h3 className="side-event__name">
            <span className="side-event__name-text">{event.name}</span>
          </h3>
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
 * The strip's header: which series the chips belong to, with the operator's
 * wordmark, the full name, dates and venue, and a link to the series page.
 *
 * @param {{ series: TickerSeries }} props
 */
function TickerSeriesHeader({ series }) {
  return (
    <div className="ticker-series">
      <div className="ticker-series__brand">
        <TourLogo code={series.tour} variant="wordmark" size={40} />
      </div>
      <div className="ticker-series__text">
        <span className="ticker-series__eyebrow">{series.eyebrow}</span>
        <h3 className="ticker-series__name">{series.name}</h3>
        <div className="ticker-series__meta">
          <span className="ticker-series__meta-item">
            <Calendar size={15} strokeWidth={1.5} aria-hidden="true" />
            {series.dates}
          </span>
          <span className="ticker-series__meta-item">
            <MapPin size={15} strokeWidth={1.5} aria-hidden="true" />
            {series.venue}
          </span>
        </div>
      </div>
      <Link to={series.href} className="ticker-series__cta">
        {series.cta}
        <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
      </Link>
    </div>
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
 * Events banner: the hero event, three side events, a "More" link, and
 * beneath them a panel for one featured series: its header, then the
 * horizontally scrolling ticker of its events.
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
      </div>
      <div className="ticker-panel">
        <TickerSeriesHeader series={tickerSeries} />
        <Ticker events={ticker} />
      </div>
    </section>
  )
}
