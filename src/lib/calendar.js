// Pure date and layout logic for the poker calendar page.
//
// Dates are handled as UTC-midnight timestamps ("stamps") so that day
// arithmetic is exact — a local-time Date would drift by an hour across DST
// and turn a 10-day festival into a 9.96-day bar. Content files store ISO
// strings; everything below accepts either form.

/** Timeline geometry from the design handoff, in px. */
export const DAY = 64 // column width
export const HEAD = 60 // day-header height
export const ROW = 116 // lane pitch
export const BAR = 104 // bar height
export const BAR_INSET = 3 // horizontal gap either side of a bar
/** Vertical padding inside a bar; the wordmark fills what is left of BAR. */
export const BAR_PAD = 10
export const MIN_LANES = 3

const MS_PER_DAY = 86400000
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** @param {string | number} value  ISO "YYYY-MM-DD" or a stamp */
export function toStamp(value) {
  if (typeof value === 'number') return value
  const [y, m, d] = value.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Today as a stamp, from the local calendar date. */
export function todayStamp(now = new Date()) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

/** First and last day of the month, inclusive. */
export function monthBounds(year, month) {
  const start = Date.UTC(year, month - 1, 1)
  const end = Date.UTC(year, month, 0)
  return { start, end, count: (end - start) / MS_PER_DAY + 1 }
}

/** Every day of the month, for the timeline header. */
export function monthDays(year, month) {
  const { start, count } = monthBounds(year, month)
  return Array.from({ length: count }, (_, i) => {
    const stamp = start + i * MS_PER_DAY
    const dow = new Date(stamp).getUTCDay()
    return { day: i + 1, weekday: WEEKDAYS[dow], weekend: dow === 0 || dow === 6, stamp }
  })
}

/** "2026.01.08 - 2026.01.18" */
export function formatRange(start, end) {
  const fmt = (v) => {
    const d = new Date(toStamp(v))
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${d.getUTCFullYear()}.${mm}.${dd}`
  }
  return `${fmt(start)} - ${fmt(end)}`
}

/** A `?month=` value as 1–12, or `fallback` when it is anything else. */
export function parseMonth(value, fallback) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : fallback
}

/** Festivals that touch any day of `year`, for the year's calendar document. */
export function festivalsInYear(festivals, year) {
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year, 11, 31)
  return festivals.filter((f) => toStamp(f.start) <= end && toStamp(f.end) >= start)
}

/**
 * Festivals overlapping the month, sorted by start ascending then end
 * descending — the order the lane packer wants, and the list view shows.
 */
export function festivalsInMonth(festivals, year, month) {
  const { start, end } = monthBounds(year, month)
  return festivals
    .map((festival) => ({ festival, start: toStamp(festival.start), end: toStamp(festival.end) }))
    .filter((x) => x.start <= end && x.end >= start)
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .map((x) => x.festival)
}

/**
 * Greedy lane packing for the timeline.
 *
 * Each festival is clipped to the month, then placed in the first lane whose
 * previous bar ended before this one starts; otherwise a new lane opens.
 *
 * @returns {{ festival, lane, laneCount, startDay, days, clipStart, clipEnd }[]}
 *   `startDay` is 1-based within the month; `laneCount` is the total number of
 *   lanes used, repeated on every bar for the caller's convenience.
 */
export function packLanes(festivals, year, month) {
  const { start: mStart, end: mEnd } = monthBounds(year, month)
  const laneEnds = []
  const bars = festivalsInMonth(festivals, year, month).map((festival) => {
    const fStart = toStamp(festival.start)
    const fEnd = toStamp(festival.end)
    const s = Math.max(fStart, mStart)
    const e = Math.min(fEnd, mEnd)
    let lane = laneEnds.findIndex((last) => last < s)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(e)
    } else {
      laneEnds[lane] = e
    }
    return {
      festival,
      lane,
      startDay: (s - mStart) / MS_PER_DAY + 1,
      days: (e - s) / MS_PER_DAY + 1,
      clipStart: fStart < mStart,
      clipEnd: fEnd > mEnd,
    }
  })
  const laneCount = laneEnds.length
  return bars.map((bar) => ({ ...bar, laneCount }))
}
