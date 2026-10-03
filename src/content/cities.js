// Poker by city: one page per city the calendar's series are dealt in, at
// /poker/<slug>. Each page is derived from rows already on the site — the
// series in content/festivals.js whose place names the city, and the venues in
// content/whereToPlay.js tagged with it — so a new stop on the calendar lands
// on its city page with no second edit. A series in a city that is not listed
// here fails src/test/cityPage.test.jsx, which is the prompt to add the city.
//
// `places` are the city names the festival rows print ("City, Venue"). Where
// an operator prints a greater-area suburb as the place, it is folded into
// the city people search for: Beenleigh and Springfield Lakes under Brisbane,
// South Melbourne under Melbourne, the Illawarra under Wollongong.
//
// `blurb` is the one hand-written line per city, about where its poker is
// dealt. The counts and operator names in the intro come from the data.

import { festivals } from './festivals.js'
import { venues } from './whereToPlay.js'
import { calendarPage } from './calendarPage.js'

/** @typedef {import('./festivals.js').Festival} Festival */
/** @typedef {import('./whereToPlay.js').VenueCard} VenueCard */
/** @typedef {import('./calendarPage.js').Tour} Tour */

export const cityPath = (slug) => `/poker/${slug}`

/**
 * @typedef {object} CityRow
 * @property {string} slug       the page's path segment
 * @property {string} name
 * @property {string} state      code, as in whereToPlay.STATES
 * @property {string} stateName
 * @property {string[]} places   the place names festival rows use for this city
 * @property {string} blurb      one line on where the city's poker is dealt
 */

/** @type {CityRow[]} */
export const CITY_ROWS = [
  {
    slug: 'sydney',
    name: 'Sydney',
    state: 'NSW',
    stateName: 'New South Wales',
    places: ['Sydney'],
    blurb:
      'Sydney has the busiest club poker scene in the country: registered clubs across the suburbs host week-long series from Kings Poker, Poker Palace, APL and Aurum, with The Star Sydney the city’s casino room.',
  },
  {
    slug: 'melbourne',
    name: 'Melbourne',
    state: 'VIC',
    stateName: 'Victoria',
    places: ['Melbourne', 'South Melbourne'],
    blurb:
      'Melbourne’s poker is anchored by Crown Melbourne, the largest casino poker room in Australia, with PlayLive Melbourne’s dedicated card room in South Melbourne and the Australian Poker Tour’s hotel stops in Carlton and Southbank.',
  },
  {
    slug: 'brisbane',
    name: 'Brisbane',
    state: 'QLD',
    stateName: 'Queensland',
    places: ['Brisbane', 'Beenleigh', 'Springfield Lakes'],
    blurb:
      'Brisbane’s series are dealt in clubs and hotels across the city’s north and out to Logan and Ipswich, with Empire Poker, APL Poker Tour, the Australian Poker Tour and Queen B’s each holding stops.',
  },
  {
    slug: 'gold-coast',
    name: 'Gold Coast',
    state: 'QLD',
    stateName: 'Queensland',
    places: ['Gold Coast'],
    blurb:
      'The Gold Coast pairs The Star Gold Coast’s casino room in Broadbeach with club series at Southport Sharks and the Australian Poker Tour’s hotel stop in Surfers Paradise.',
  },
  {
    slug: 'adelaide',
    name: 'Adelaide',
    state: 'SA',
    stateName: 'South Australia',
    places: ['Adelaide'],
    blurb:
      'Adelaide’s series are dealt in the city’s hotels and card rooms: Stacked Social in North Adelaide, The Junction at Camden Park and the Australian Poker Tour’s Mawson Lakes stop.',
  },
  {
    slug: 'newcastle',
    name: 'Newcastle',
    state: 'NSW',
    stateName: 'New South Wales',
    places: ['Newcastle'],
    blurb: 'Newcastle’s series are Kings Poker’s stops at the Blackbutt Hotel in New Lambton.',
  },
  {
    slug: 'townsville',
    name: 'Townsville',
    state: 'QLD',
    stateName: 'Queensland',
    places: ['Townsville'],
    blurb: 'Townsville’s series are APL’s stops at The Ville Resort-Casino on the waterfront.',
  },
  {
    slug: 'cairns',
    name: 'Cairns',
    state: 'QLD',
    stateName: 'Queensland',
    places: ['Cairns'],
    blurb: 'APL deals its Cairns series at Brothers Leagues Club in Manunda.',
  },
  {
    slug: 'albury',
    name: 'Albury',
    state: 'NSW',
    stateName: 'New South Wales',
    places: ['Albury'],
    blurb:
      'Albury’s series are APL Poker Tour stops at the Commercial Club and SS&A Albury, drawing players from both sides of the Murray.',
  },
  {
    slug: 'wollongong',
    name: 'Wollongong',
    state: 'NSW',
    stateName: 'New South Wales',
    places: ['Illawarra', 'Wollongong'],
    blurb:
      'WPT League’s Illawarra series is dealt at Warilla Bowls and Recreation Club in Barrack Heights, south of Wollongong.',
  },
  {
    slug: 'mount-gambier',
    name: 'Mount Gambier',
    state: 'SA',
    stateName: 'South Australia',
    places: ['Mount Gambier'],
    blurb:
      'Gambier Poker deals its weekly games at the Globe Hotel and its series there and at the Mount Gambier Civic Centre.',
  },
]

const tourByCode = new Map(calendarPage.tours.map((tour) => [tour.code, tour]))

/** The city a festival row's "City, Venue" place names. */
export function placeCity(place) {
  const comma = place.indexOf(', ')
  return comma === -1 ? '' : place.slice(0, comma)
}

/**
 * Join names as "A, B and C"; past `max` names, "A, B, C, D and more", so a
 * description with every Sydney operator in it still fits a search snippet.
 */
export function listNames(names, max = Infinity) {
  if (names.length <= 1) return names.join('')
  if (names.length > max) return `${names.slice(0, max).join(', ')} and more`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * @typedef {CityRow & {
 *   path: string,
 *   series: Festival[],
 *   venues: VenueCard[],
 *   operators: Tour[],
 *   seo: { title: string, description: string },
 *   heading: string,
 *   intro: string,
 * }} CityPage
 */

/** @param {CityRow} row */
function build(row) {
  const series = festivals
    .filter((festival) => row.places.includes(placeCity(festival.place)))
    .sort((a, b) => a.start.localeCompare(b.start))
  const cityVenues = venues.filter((venue) => venue.city === row.slug)
  const codes = [...new Set([...series.map((f) => f.tour), ...cityVenues.flatMap((v) => v.tours)])]
  const operators = codes.map((code) => tourByCode.get(code)).filter(Boolean)
  const operatorNames = listNames(operators.map((tour) => tour.name))
  const count = series.length
  const venueCount = cityVenues.length
  const intro =
    `${count} live poker tournament series in ${row.name} ` +
    `${count === 1 ? 'is' : 'are'} on the calendar from ${operatorNames}, dealt at ` +
    `${venueCount} ${venueCount === 1 ? 'venue' : 'venues'}. ${row.blurb}`
  return {
    ...row,
    path: cityPath(row.slug),
    series,
    venues: cityVenues,
    operators,
    heading: `Poker in ${row.name}`,
    intro,
    seo: {
      title: `Poker in ${row.name}: Tournaments, Series & Where to Play`,
      description: `Poker in ${row.name}, ${row.stateName}: ${count} tournament series at ${venueCount} ${venueCount === 1 ? 'venue' : 'venues'} from ${listNames(
        operators.map((tour) => tour.name),
        3,
      )}. Dates, addresses and schedules for every stop.`,
    },
  }
}

/** Every city with a series or a venue, in the order CITY_ROWS lists them. */
export const cities = CITY_ROWS.map(build).filter(
  (city) => city.series.length > 0 || city.venues.length > 0,
)

/** The city page at `path`, or undefined. */
export function cityFor(path) {
  return cities.find((city) => city.path === path)
}

/** Copy on the city pages that is not the city's own. */
export const cityPage = {
  eyebrow: (city) => `Poker in ${city.stateName}`,
  upcomingHeading: (city) => `Upcoming poker tournaments in ${city.name}`,
  pastHeading: (city) => `Earlier series in ${city.name}`,
  venuesHeading: (city) => `Where to play poker in ${city.name}`,
  operatorsHeading: (city) => `Poker operators running series in ${city.name}`,
  otherHeading: 'Poker in other cities',
  calendarLink: 'See the full Australian poker calendar',
  noUpcoming: (city) =>
    `No ${city.name} series has dates announced yet. Operators confirm stops through the year; the calendar is updated as they do.`,
}
