// Poker tours: one page per operator in calendarPage.tours, at the href that
// list already carries (/tours/<slug>), plus the index at /tours. A page is
// the operator's series on the calendar, the rooms it deals at and the
// cities it visits, all drawn from content/festivals.js and
// content/whereToPlay.js — so a new stop shows on the operator's page with no
// second edit.

import { calendarPage } from './calendarPage.js'
import { festivals } from './festivals.js'
import { venues } from './whereToPlay.js'
import { cities, placeCity, listNames } from './cities.js'

/** @typedef {import('./calendarPage.js').Tour} Tour */
/** @typedef {import('./festivals.js').Festival} Festival */
/** @typedef {import('./whereToPlay.js').VenueCard} VenueCard */
/** @typedef {import('./cities.js').CityPage} CityPage */

export const toursPath = '/tours'

/** "APL" → "APL Poker"; "Kings Poker" stays. The name a search starts with. */
export function brandName(tour) {
  return /poker/i.test(tour.name) ? tour.name : `${tour.name} Poker`
}

/**
 * @typedef {Tour & {
 *   slug: string,
 *   path: string,
 *   series: Festival[],
 *   venues: VenueCard[],
 *   cities: CityPage[],
 *   seo: { title: string, description: string },
 *   heading: string,
 *   intro: string,
 * }} TourPage
 */

/** @param {Tour} tour */
function build(tour) {
  const series = festivals
    .filter((festival) => festival.tour === tour.code)
    .sort((a, b) => a.start.localeCompare(b.start))
  const tourVenues = venues.filter((venue) => venue.tours.includes(tour.code))
  const placeNames = new Set(series.map((festival) => placeCity(festival.place)))
  const tourCities = cities.filter(
    (city) =>
      city.places.some((place) => placeNames.has(place)) ||
      tourVenues.some((venue) => venue.city === city.slug),
  )
  const count = series.length
  const where = tourCities.length ? ` in ${listNames(tourCities.map((city) => city.name))}` : ''
  const whereShort = tourCities.length
    ? ` in ${listNames(
        tourCities.map((city) => city.name),
        3,
      )}`
    : ''
  const name = brandName(tour)
  return {
    ...tour,
    slug: tour.href.slice(toursPath.length + 1),
    path: tour.href,
    series,
    venues: tourVenues,
    cities: tourCities,
    heading: `${name} tournaments and series`,
    intro:
      `${tour.name} has ${count} tournament series on the ` +
      `Australian Poker Calendar${where}, dealt at ${tourVenues.length} ` +
      `${tourVenues.length === 1 ? 'venue' : 'venues'}. Every stop links to its own page with ` +
      'dates, the venue and the full schedule as the operator releases it.',
    seo: {
      title: `${name} Tournaments & Series: Dates, Venues & Schedules`,
      description: `${tour.name} poker tournament series${whereShort}: dates, venues and the schedule for every stop, the rooms ${tour.name} deals at and the official site.`,
    },
  }
}

/** @type {TourPage[]} */
export const tourPages = calendarPage.tours.map(build)

/** The tour page at `path`, or undefined. */
export function tourFor(path) {
  return tourPages.find((tour) => tour.path === path)
}

/** Copy on the tour pages and the index that is not an operator's own. */
export const tourPage = {
  eyebrow: 'Poker tour',
  officialSite: 'Official site',
  upcomingHeading: 'Upcoming series',
  pastHeading: 'Earlier series',
  venuesHeading: (tour) => `Where ${tour.name} plays`,
  citiesHeading: 'Cities',
  otherHeading: 'Other poker tours',
  noUpcoming: (tour) =>
    `${tour.name} has no upcoming series with dates announced. The calendar is updated as operators confirm their stops.`,
  index: {
    path: toursPath,
    eyebrow: 'Poker tours',
    heading: 'Poker tours and operators in Australia',
    intro:
      'Every operator running tournament series on the Australian Poker Calendar, from casino poker rooms to the club and pub leagues: what each one runs, where it deals and every stop on its schedule.',
    seo: {
      title: 'Australian Poker Tours & Operators: APL, APT, Kings, Crown & More',
      description: `The poker tours and operators running tournament series in Australia, ${listNames(
        calendarPage.tours.map((tour) => tour.name),
        5,
      )}, with every series, venue and schedule on the Australian Poker Calendar.`,
    },
    seriesLabel: (count) => `${count} series`,
  },
}
