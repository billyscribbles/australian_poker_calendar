import { Fragment, useState } from 'react'
import { MapPin, CalendarClock, ChevronDown } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import { eventLd, breadcrumbLd } from '../lib/structuredData.js'
import { calendarPage } from '../content/calendarPage.js'
import { eventFor, schedulePending, scheduleFilter } from '../content/eventPages.js'
import { tourBrandStyle } from '../content/tourBrands.js'
import TourLogo from '../components/TourLogo.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Img from '../components/Img.jsx'
import NextEvents from '../components/NextEvents.jsx'
import './EventPage.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** "2026-09-30" → { day: "30 Sep", weekday: "Wednesday" }, with no timezone drift. */
function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return { day: `${d} ${MONTHS[m - 1]}`, weekday: WEEKDAYS[date.getUTCDay()] }
}

/** Group consecutive rows by date so each day renders one spanning cell. */
function byDay(schedule) {
  const days = []
  for (const row of schedule) {
    const last = days[days.length - 1]
    if (last && last.date === row.date) last.rows.push(row)
    else days.push({ date: row.date, rows: [row] })
  }
  return days
}

/** "$1,500" → 1500; '' → NaN. */
const parseBuyIn = (buyIn) => Number(buyIn.replace(/[^0-9]/g, ''))

/** 1500 → "$1,500", without locale differences between the build and the browser. */
const formatBuyIn = (amount) => `$${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`

/**
 * What ties a Day 2 or final-table row (no buy-in, "Qualifiers only") to the
 * event it continues: the poster's event number, else the name before the
 * dash ("Showdown Cup – Day 2" and "Showdown Cup – Flight 1A" share a stem).
 */
const stem = (row) => row.number || row.name.split(' – ')[0]

/**
 * The rows priced from `min` to `max` (0 for no floor, 0 for no ceiling),
 * plus the later days of those events. A continuation row whose event the
 * schedule never prices stays put.
 */
function filterByBuyIn(schedule, min, max) {
  if (!min && !max) return schedule
  const inRange = (row) => {
    const amount = parseBuyIn(row.buyIn)
    return amount >= (min || 0) && amount <= (max || Infinity)
  }
  const priced = schedule.filter((row) => row.buyIn)
  const known = new Set(priced.map(stem))
  const kept = new Set(priced.filter(inRange).map(stem))
  return schedule.filter((row) =>
    row.buyIn ? inRange(row) : kept.has(stem(row)) || !known.has(stem(row)),
  )
}

/**
 * The rungs of the ladder that would actually hide something on this
 * schedule: as a floor, those above the cheapest event; as a ceiling, those
 * below the dearest.
 */
function buyInSteps(schedule) {
  const amounts = schedule.filter((row) => row.buyIn).map((row) => parseBuyIn(row.buyIn))
  if (amounts.length === 0) return { min: [], max: [] }
  const cheapest = Math.min(...amounts)
  const dearest = Math.max(...amounts)
  return {
    min: scheduleFilter.steps.filter((step) => step > cheapest && step <= dearest),
    max: scheduleFilter.steps.filter((step) => step >= cheapest && step < dearest),
  }
}

/** One labelled select: "Any", then the rungs it offers. */
function BuyInSelect({ label, value, steps, onChange }) {
  return (
    <label className="schedule-filter">
      <span className="schedule-filter__label">{label}</span>
      <span className="schedule-filter__control">
        <select className="schedule-filter__select" value={value} onChange={onChange}>
          <option value="">{scheduleFilter.any}</option>
          {steps.map((step) => (
            <option key={step} value={step}>
              {formatBuyIn(step)}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2.25}
          aria-hidden="true"
          className="schedule-filter__chevron"
        />
      </span>
    </label>
  )
}

// Every column a poster can carry. A page shows only the ones its schedule
// fills: Crown prints no shot clock or late-rego time, so those drop out;
// only Aurum prints a room and only APL marks dealer-dealt events, so each of
// those columns appears on its page alone.
const COLUMNS = [
  { key: 'time', label: 'Time' },
  { key: 'event', label: 'Event' },
  { key: 'buyIn', label: 'Buy-in' },
  { key: 'stack', label: 'Stack' },
  { key: 'blinds', label: 'Blinds' },
  { key: 'shotClock', label: 'Shot clock' },
  { key: 'reEntry', label: 'Re-entry' },
  { key: 'regoLevel', label: 'Rego ends', sub: 'level' },
  { key: 'regoTime', label: 'Rego ends', sub: 'time' },
  { key: 'room', label: 'Room' },
  { key: 'dealt', label: 'Dealt' },
]

/** @param {{ row: import('../content/eventMelbourneChampsII.js').ScheduleRow }} props */
function Cell({ col, row }) {
  const label = col.sub ? `${col.label} ${col.sub}` : col.label
  if (col.key === 'event') {
    return (
      <td className="schedule__cell schedule__cell--event">
        {row.number && <span className="schedule__number">#{row.number}</span>}
        <span className="schedule__name">{row.name}</span>
        {row.guarantee && <span className="schedule__gtd">{row.guarantee}</span>}
        {row.featured && <span className="sr-only">Featured event</span>}
      </td>
    )
  }
  if (col.key === 'buyIn') {
    return (
      <td className="schedule__cell schedule__cell--buyin" data-label={label}>
        {row.buyIn && <span className="schedule__total">{row.buyIn}</span>}
        {row.split && <span className="schedule__split">{row.split}</span>}
      </td>
    )
  }
  return (
    <td className={`schedule__cell schedule__cell--${col.key}`} data-label={label}>
      {row[col.key]}
    </td>
  )
}

/**
 * A series page. With a poster: brand hero, headline stats, the full schedule.
 * Without one: the same hero, and a note that the schedule is still to come.
 * `path` is the route's own path; content/eventPages.js resolves it.
 */
export default function EventPage({ path }) {
  // '' is "Any": the full schedule, which is also what the prerender ships.
  // A floor above the ceiling (or the reverse) resets the other to "Any".
  const [minBuyIn, setMinBuyIn] = useState('')
  const [maxBuyIn, setMaxBuyIn] = useState('')
  const pickMin = (e) => {
    setMinBuyIn(e.target.value)
    if (maxBuyIn && Number(e.target.value) > Number(maxBuyIn)) setMaxBuyIn('')
  }
  const pickMax = (e) => {
    setMaxBuyIn(e.target.value)
    if (minBuyIn && Number(e.target.value) < Number(minBuyIn)) setMinBuyIn('')
  }
  const event = eventFor(path)
  if (!event) return null
  const { tour, title, dates, presentedBy, venue, venueDetail, image, status, schedule } = event
  const steps = buyInSteps(schedule ?? [])
  const days = byDay(filterByBuyIn(schedule ?? [], Number(minBuyIn), Number(maxBuyIn)))
  // Columns come from the whole schedule so the grid keeps its shape while filtered.
  const columns = COLUMNS.filter(
    (col) => col.key === 'event' || (schedule ?? []).some((row) => row[col.key]),
  ).map((col) => (col.key === 'buyIn' ? { ...col, sub: event.buyInSub } : col))
  const hasNotes = event.notes.length > 0 || event.sponsors.length > 0
  const calendarYear = `/poker-calendar/${event.start.slice(0, 4)}`

  return (
    <main className="event-page">
      <SEO
        title={event.seo.title}
        description={event.seo.description}
        path={event.path}
        jsonLd={[
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: calendarPage.title(Number(event.start.slice(0, 4))), path: calendarYear },
            { name: title, path: event.path },
          ]),
          eventLd(event),
        ]}
      />

      <header className="event-hero" style={tourBrandStyle(tour)}>
        {image && (
          <Img
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            priority
            className="event-hero__backdrop"
          />
        )}
        <div className="container event-hero__inner">
          <div className="event-hero__brand">
            <TourLogo code={tour} variant="wordmark" size={64} />
            {presentedBy && <p className="event-hero__presented">Presented by {presentedBy}</p>}
          </div>
          <div className="event-hero__heading">
            {status && <p className="event-hero__status">{status}</p>}
            <h1 className="event-hero__title">{title}</h1>
            <p className="event-hero__dates">{dates}</p>
          </div>
          <p className="event-hero__venue">
            <MapPin size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="event-hero__venue-name">{venue}</span>
            {venueDetail && <span className="event-hero__venue-detail">{venueDetail}</span>}
          </p>
        </div>
      </header>

      {event.stats.length > 0 && (
        <section className="event-stats" aria-label="Series at a glance">
          <ul className="container event-stats__list">
            {event.stats.map((stat) => (
              <li key={stat.label} className="event-stats__item">
                <span className="event-stats__value">{stat.value}</span>
                <span className="event-stats__label">{stat.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!schedule && (
        <section className="container event-schedule" aria-labelledby="schedule-heading">
          <SectionHeading id="schedule-heading">{schedulePending.heading}</SectionHeading>
          <div className="event-pending" style={tourBrandStyle(tour)}>
            <CalendarClock size={40} strokeWidth={1.5} aria-hidden="true" />
            <div className="event-pending__text">
              <p className="event-pending__title">{schedulePending.title}</p>
              <p className="event-pending__body">{schedulePending.body}</p>
            </div>
            <a
              href={event.website}
              target="_blank"
              rel="noopener noreferrer"
              className="event-notes__link"
            >
              {schedulePending.link}
            </a>
          </div>
        </section>
      )}

      {schedule && (
        <section className="container event-schedule" aria-labelledby="schedule-heading">
          <div className="event-schedule__bar">
            <SectionHeading id="schedule-heading">{schedulePending.heading}</SectionHeading>
            {steps.max.length > 0 && (
              <div className="schedule-filters">
                <BuyInSelect
                  label={scheduleFilter.min}
                  value={minBuyIn}
                  steps={steps.min}
                  onChange={pickMin}
                />
                <BuyInSelect
                  label={scheduleFilter.max}
                  value={maxBuyIn}
                  steps={steps.max}
                  onChange={pickMax}
                />
              </div>
            )}
          </div>
          <table className="schedule" aria-labelledby="schedule-heading">
            <thead>
              <tr className="schedule__head">
                <th scope="col" className="schedule__th schedule__th--day">
                  Day
                </th>
                {columns.map((col) => (
                  <th scope="col" key={col.key} className={`schedule__th schedule__th--${col.key}`}>
                    {col.label}
                    {col.sub && <small className="schedule__th-sub">{col.sub}</small>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.length === 0 && (
                <tr className="schedule__row schedule__row--empty">
                  <td className="schedule__cell schedule__empty" colSpan={columns.length + 1}>
                    {scheduleFilter.empty}
                  </td>
                </tr>
              )}
              {days.map(({ date, rows }, dayIndex) => {
                const { day, weekday } = dayLabel(date)
                return (
                  <Fragment key={date}>
                    {rows.map((row, i) => (
                      <tr
                        key={`${date}-${row.time}-${row.name}`}
                        className={[
                          'schedule__row',
                          dayIndex % 2 === 1 && 'schedule__row--alt',
                          row.featured && 'schedule__row--featured',
                          row.feeds && 'schedule__row--feeds',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {i === 0 && (
                          <th scope="row" rowSpan={rows.length} className="schedule__day">
                            <span className="schedule__day-date">{day}</span>
                            <span className="schedule__day-weekday">{weekday}</span>
                          </th>
                        )}
                        {columns.map((col) => (
                          <Cell key={col.key} col={col} row={row} />
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {hasNotes && (
        <section className="container event-notes" aria-label="Notes">
          <div className="event-notes__inner">
            <ul className="event-notes__list">
              {event.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <div className="event-notes__aside">
              {event.sponsors.length > 0 && (
                <p className="event-notes__sponsors">
                  <span className="event-notes__sponsors-label">With</span>{' '}
                  {event.sponsors.join(' · ')}
                </p>
              )}
              <a
                href={event.website}
                target="_blank"
                rel="noopener noreferrer"
                className="event-notes__link"
              >
                Official site
              </a>
            </div>
          </div>
        </section>
      )}

      <NextEvents path={event.path} />
    </main>
  )
}
