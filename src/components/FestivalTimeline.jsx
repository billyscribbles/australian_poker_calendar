import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../content/festivals.js'
import {
  DAY,
  HEAD,
  ROW,
  BAR,
  BAR_INSET,
  BAR_PAD,
  MIN_LANES,
  MONTH_NAMES,
  monthDays,
  packLanes,
  formatRange,
  toStamp,
} from '../lib/calendar.js'
import { tourBrandStyle } from '../content/tourBrands.js'
import TourLogo from './TourLogo.jsx'
import './FestivalTimeline.css'

/** @typedef {import('../content/festivals.js').Festival} Festival */

/**
 * Month-at-a-time Gantt view: one 64px column per day, one lane per row of
 * non-overlapping festivals. Scrolls horizontally; on load and on every month
 * change it centres today's column when the viewed month contains it, and
 * otherwise snaps back to the 1st.
 *
 * Each bar carries its tour's colours (content/tourBrands.js) as custom
 * properties, and the stylesheet composes the brand gradient from them. The
 * tour's circle icon sits before the name and its wordmark fills the right end.
 *
 * @param {object} props
 * @param {Festival[]} props.festivals  the whole year — this filters to the month
 * @param {number} props.year
 * @param {number} props.month          1–12
 * @param {number} props.today          UTC-midnight stamp
 */
export default function FestivalTimeline({ festivals, year, month, today }) {
  const days = monthDays(year, month)
  const bars = packLanes(festivals, year, month)
  const laneCount = Math.max(bars[0]?.laneCount ?? 0, MIN_LANES)
  const todayIndex = days.findIndex((d) => d.stamp === today)
  const label = `${MONTH_NAMES[month - 1]} ${year}`

  const scrollRef = useRef(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Any other month starts from the 1st, not wherever the last one was left.
    el.scrollLeft =
      todayIndex < 0 ? 0 : Math.max(0, todayIndex * DAY + DAY / 2 - el.clientWidth / 2)
  }, [todayIndex, month, year])

  return (
    <div className="timeline scroll-row" ref={scrollRef}>
      <div
        className="timeline__canvas"
        style={{
          width: days.length * DAY,
          minHeight: HEAD + 16 + laneCount * ROW,
          '--timeline-day': `${DAY}px`,
          '--timeline-head': `${HEAD}px`,
          '--timeline-bar-pad': `${BAR_PAD}px`,
        }}
      >
        {/* Axis labels only — every bar carries its own dates. */}
        <div className="timeline__head" aria-hidden="true">
          {days.map((d) => (
            <div
              key={d.day}
              className={`timeline__day${d.weekend ? ' timeline__day--weekend' : ''}${
                d.stamp === today ? ' timeline__day--today' : ''
              }`}
            >
              {/* Today's column wears the pill where its weekday label would be,
                  so the marker never sits on top of a neighbouring day's name. */}
              {d.stamp === today ? (
                <div className="timeline__weekday timeline__today-pill">Today</div>
              ) : (
                <div className="timeline__weekday">{d.weekday}</div>
              )}
              <div className="timeline__daynum">{d.day}</div>
            </div>
          ))}
        </div>
        <div className="timeline__grid" aria-hidden="true" />

        {todayIndex >= 0 && (
          <div
            className="timeline__today-line"
            style={{ left: todayIndex * DAY + DAY / 2 }}
            aria-hidden="true"
          />
        )}

        <ol className="timeline__bars" aria-label={`${label} timeline`}>
          {bars.map(({ festival, lane, startDay, days: length, clipStart, clipEnd }) => {
            const live =
              !festival.status && toStamp(festival.start) <= today && toStamp(festival.end) >= today
            const modifiers = [
              clipStart && 'timeline__bar--clip-start',
              clipEnd && 'timeline__bar--clip-end',
              live && 'timeline__bar--live',
              festival.status && 'timeline__bar--off',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <li
                key={festival.href}
                className={`timeline__bar ${modifiers}`.trim()}
                style={{
                  top: HEAD + 8 + lane * ROW,
                  left: (startDay - 1) * DAY + BAR_INSET,
                  width: length * DAY - BAR_INSET * 2,
                  height: BAR,
                  ...tourBrandStyle(festival.tour),
                }}
              >
                <Link to={festival.href} className="timeline__bar-link">
                  <span className="timeline__bar-text">
                    <span className="timeline__bar-dates">
                      {formatRange(festival.start, festival.end)}
                    </span>
                    <span className="timeline__bar-name">
                      <TourLogo code={festival.tour} variant="icon" size={24} />
                      {festival.status && (
                        <span className="timeline__bar-status">
                          {STATUS_LABELS[festival.status]}
                        </span>
                      )}
                      {festival.name}
                    </span>
                    <span className="timeline__bar-place">{festival.place}</span>
                  </span>
                  <TourLogo code={festival.tour} variant="wordmark" size={BAR - 2 * BAR_PAD} />
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
