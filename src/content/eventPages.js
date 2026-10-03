// Every series on the calendar has a page at its href, /events/<slug>. Seven are
// hand-built posters (one content file each, below); the rest are derived from
// the series' row in content/festivals.js until the operator publishes a
// schedule. src/routes.js emits one route per festival and passes the path;
// `eventFor(path)` resolves it to either kind of page.

import { event as melbourneChampsII } from './eventMelbourneChampsII.js'
import { event as victorianPokerChampionship2026 } from './eventVictorianPokerChampionship2026.js'
import { event as sydneyShowdown2026 } from './eventSydneyShowdown2026.js'
import { event as aplptBrisbane2026 } from './eventAplptBrisbane2026.js'
import { event as playLiveSummerChampionship2026 } from './eventPlayLiveSummerChampionship2026.js'
import { event as playLiveMelbourneMillions2027 } from './eventPlayLiveMelbourneMillions2027.js'
import { event as nplSuperSeries2026 } from './eventNplSuperSeries2026.js'
import { festivals, STATUS_LABELS } from './festivals.js'
import { formatRangeWithYear, toStamp } from '../lib/calendar.js'

/** The hand-built pages, keyed by the name their content file exports. */
export const eventPages = {
  melbourneChampsII,
  victorianPokerChampionship2026,
  sydneyShowdown2026,
  playLiveSummerChampionship2026,
  playLiveMelbourneMillions2027,
  aplptBrisbane2026,
  nplSuperSeries2026,
}

/** What a derived page says where the poster would print the schedule. */
export const schedulePending = {
  heading: 'Full schedule',
  title: 'Coming soon',
  body: 'The day-by-day schedule will be posted here as soon as the operator releases it. Buy-ins, stacks and late-registration times for every event, in one table.',
  link: 'Official site',
}

/**
 * The "Min buy-in" and "Max buy-in" controls above a schedule. `steps` is the
 * ladder both selects offer; a page shows only the rungs between its cheapest
 * and dearest buy-in, and no controls at all when every event costs the same.
 */
export const scheduleFilter = {
  min: 'Min buy-in',
  max: 'Max buy-in',
  any: 'Any',
  steps: [100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 5000, 10000],
  empty: 'No events in this buy-in range.',
}

/**
 * The cards that close every series page: the next few series to start,
 * each through to its own page, with a link to the full calendar.
 */
export const nextUp = {
  heading: 'Up next on the calendar',
  link: 'Full calendar',
  count: 3,
}

/**
 * The next `count` series to start after `today` (a UTC-midnight stamp, see
 * src/lib/calendar.js), earliest first, leaving out the series at `path` and
 * anything cancelled, postponed or moved. Empty once the calendar runs out.
 *
 * @param {string} path   the page's own path, never offered
 * @param {number} today
 * @param {number} count
 * @returns {import('./festivals.js').Festival[]}
 */
export function nextEvents(path, today, count) {
  return festivals
    .filter((f) => f.href !== path && !f.status && toStamp(f.start) > today)
    .sort((a, b) => toStamp(a.start) - toStamp(b.start))
    .slice(0, count)
}

const byPath = new Map(Object.values(eventPages).map((event) => [event.path, event]))

/**
 * Split a festival's "City, Venue (Detail)" place into the hero's three lines.
 * "Melbourne, Crown Melbourne (Metropol, Sky Bar 28)" →
 * { city: 'Melbourne', venue: 'Crown Melbourne', venueDetail: 'Metropol, Sky Bar 28' }
 */
function splitPlace(place) {
  const comma = place.indexOf(', ')
  const city = comma === -1 ? '' : place.slice(0, comma)
  const rest = comma === -1 ? place : place.slice(comma + 2)
  const detail = rest.match(/^(.*?)\s*\((.+)\)$/)
  return detail
    ? { city, venue: detail[1], venueDetail: detail[2] }
    : { city, venue: rest, venueDetail: '' }
}

/** A page for a festival with no poster yet: hero and dates, schedule pending. */
function derive(festival) {
  const { city, venue, venueDetail } = splitPlace(festival.place)
  const dates = formatRangeWithYear(festival.start, festival.end)
  const status = festival.status ? STATUS_LABELS[festival.status] : ''
  const where = [venue, city].filter(Boolean).join(', ')
  return {
    path: festival.href,
    tour: festival.tour,
    title: festival.name,
    dates,
    start: festival.start,
    end: festival.end,
    presentedBy: '',
    venue,
    // The poster's second venue line; with no bracketed detail, the city.
    venueDetail: venueDetail || city,
    city,
    status,
    statusCode: festival.status,
    website: festival.website,
    image: null,
    seo: {
      title: `${festival.name} — Poker Tournament Series, ${dates}`,
      description: `${festival.name} is a live poker tournament series running ${dates} at ${where}. Dates, venue and the full event schedule as soon as it is released, on the Australian Poker Calendar.`,
    },
    stats: [],
    notes: [],
    sponsors: [],
    schedule: null,
  }
}

/**
 * The page at `path`: a hand-built poster when one exists, otherwise the page
 * derived from the festival row with that href. Undefined for a path no
 * festival has, so the caller can render nothing and the prerender fail.
 */
export function eventFor(path) {
  const poster = byPath.get(path)
  if (poster) return poster
  const festival = festivals.find((f) => f.href === path)
  return festival ? derive(festival) : undefined
}
