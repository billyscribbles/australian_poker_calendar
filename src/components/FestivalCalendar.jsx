import { useSearchParams } from 'react-router-dom'
import { calendarPage } from '../content/calendarPage.js'
import { MONTH_NAMES, parseMonth } from '../lib/calendar.js'
import { useHydrated } from '../lib/useHydrated.js'
import { useToday } from '../lib/useToday.js'
import FestivalTimeline from './FestivalTimeline.jsx'
import FestivalList from './FestivalList.jsx'
import './FestivalCalendar.css'

/** @typedef {import('../content/festivals.js').Festival} Festival */

const EMPTY = new URLSearchParams()

/** The month to open on: today's, clamped into the calendar's year. */
function defaultMonth(today, year) {
  const d = new Date(today)
  if (d.getUTCFullYear() < year) return 1
  if (d.getUTCFullYear() > year) return 12
  return d.getUTCMonth() + 1
}

/**
 * Timeline | List toggle, month tabs, and whichever view is selected.
 *
 * State lives in the URL — `?month=10&view=timelineDays` or `view=list` — so a
 * month can be linked to. The query is only read once hydration has finished:
 * the static document is rendered without one, and the first client render
 * has to match it (see src/lib/useHydrated.js).
 *
 * @param {object} props
 * @param {Festival[]} props.festivals
 * @param {number} props.year
 */
export default function FestivalCalendar({ festivals, year }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const hydrated = useHydrated()
  const today = useToday()
  const params = hydrated ? searchParams : EMPTY

  const month = parseMonth(params.get('month'), defaultMonth(today, year))
  const view = params.get('view') === 'list' ? 'list' : 'timeline'

  const update = (patch) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) next.set(key, value)
        return next
      },
      { replace: true },
    )

  const { views, countLabel } = calendarPage

  return (
    <section className="festival-calendar" aria-label="Festival calendar">
      <div className="festival-calendar__controls">
        <div className="segmented" role="group" aria-label="View">
          <button
            type="button"
            className="segmented__btn"
            aria-pressed={view === 'timeline'}
            onClick={() => update({ view: 'timelineDays' })}
          >
            {views.timeline}
          </button>
          <button
            type="button"
            className="segmented__btn"
            aria-pressed={view === 'list'}
            onClick={() => update({ view: 'list' })}
          >
            {views.list}
          </button>
        </div>
        <p className="festival-calendar__count">
          <strong>{festivals.length}</strong> {countLabel}
        </p>
      </div>

      <div className="month-tabs" role="group" aria-label="Month">
        {MONTH_NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            className="month-tab"
            aria-label={name}
            aria-pressed={month === i + 1}
            onClick={() => update({ month: String(i + 1) })}
          >
            {name.slice(0, 3)}
          </button>
        ))}
      </div>

      {view === 'timeline' ? (
        <FestivalTimeline festivals={festivals} year={year} month={month} today={today} />
      ) : (
        <FestivalList festivals={festivals} year={year} month={month} />
      )}
    </section>
  )
}
