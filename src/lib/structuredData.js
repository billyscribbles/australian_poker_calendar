// Page-level JSON-LD, built from the same content the page renders so the
// machine-readable record and the visible one cannot drift apart. The
// Organization record is emitted on every page by lib/seo.jsx; these are the
// extra graphs a page passes in through its `jsonLd` prop.
//
// Event records follow https://schema.org/Event with the fields Google's event
// rich result reads: name, start and end date, a physical location with a
// locality, status, organizer and the page URL.

import { site } from '../config/site.config.js'
import { calendarPage } from '../content/calendarPage.js'

const EVENT_STATUS = {
  cancelled: 'https://schema.org/EventCancelled',
  postponed: 'https://schema.org/EventPostponed',
  moved: 'https://schema.org/EventRescheduled',
}

const tourByCode = new Map(calendarPage.tours.map((tour) => [tour.code, tour]))

/** Absolute URL for a root-relative path; an absolute one is left alone. */
function absolute(path) {
  return /^https?:/i.test(path) ? path : `${site.seo.siteUrl}${path}`
}

/** The site itself: name, the names people search it by, and its URL. */
export function websiteLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.brand.name,
    url: site.seo.siteUrl,
    description: site.seo.description,
    inLanguage: 'en-AU',
  }
  if (site.seo.alternateNames?.length) schema.alternateName = site.seo.alternateNames
  return schema
}

/**
 * One series as a schema.org Event. Takes the page object content/eventPages.js
 * resolves (hand-built or derived); only `path`, `title`, `start`, `end`,
 * `venue` and `city` are required.
 *
 * @param {object} event
 * @param {boolean} [withContext]  false when nested inside another graph
 */
export function eventLd(event, withContext = true) {
  const tour = tourByCode.get(event.tour)
  const locality = (event.city || '').replace(/,\s*Australia$/i, '')
  const schema = {
    ...(withContext && { '@context': 'https://schema.org' }),
    '@type': 'Event',
    name: event.title,
    startDate: event.start,
    endDate: event.end,
    eventStatus: EVENT_STATUS[event.statusCode] || 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: absolute(event.path),
    location: {
      '@type': 'Place',
      name: event.venue,
      address: {
        '@type': 'PostalAddress',
        ...(event.venueDetail &&
          event.venueDetail !== locality && { streetAddress: event.venueDetail }),
        ...(locality && { addressLocality: locality }),
        addressCountry: 'AU',
      },
    },
  }
  if (event.seo?.description) schema.description = event.seo.description
  if (event.image?.src) schema.image = absolute(event.image.src)
  if (tour) {
    schema.organizer = {
      '@type': 'Organization',
      name: tour.name || tour.label,
      url: event.website || tour.website,
    }
  }
  return schema
}

/**
 * A calendar year as an ItemList of Events, in start-date order, so a crawler
 * reads the whole schedule from the calendar document and not only the cards
 * it can see.
 *
 * @param {import('../content/festivals.js').Festival[]} festivals
 * @param {number} year
 * @param {{ title: string, description: string }} seo  the page's own head copy
 */
export function eventListLd(festivals, year, seo) {
  const sorted = [...festivals].sort((a, b) => a.start.localeCompare(b.start))
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: seo.title,
    description: seo.description,
    url: absolute(`/poker-calendar/${year}`),
    numberOfItems: sorted.length,
    itemListElement: sorted.map((festival, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: eventLd(festivalAsEvent(festival), false),
    })),
  }
}

/** The subset of a derived page eventLd needs, straight from a festival row. */
function festivalAsEvent(festival) {
  const comma = festival.place.indexOf(', ')
  const city = comma === -1 ? '' : festival.place.slice(0, comma)
  const venue = (comma === -1 ? festival.place : festival.place.slice(comma + 2)).replace(
    /\s*\(.+\)$/,
    '',
  )
  return {
    path: festival.href,
    tour: festival.tour,
    title: festival.name,
    start: festival.start,
    end: festival.end,
    venue,
    city,
    website: festival.website,
    statusCode: festival.status,
  }
}

/**
 * The trail above a page, for Google's breadcrumb rich result. `items` are
 * `{ name, path }` from the home page down to the page itself; the last one
 * is the page and carries no link.
 *
 * @param {{ name: string, path: string }[]} items
 */
export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(index < items.length - 1 && { item: absolute(item.path) }),
    })),
  }
}

/**
 * A tour operator as a schema.org Organization: the name people search for,
 * its own site and its mark.
 *
 * @param {import('../content/tourPages.js').TourPage} tour
 */
export function tourLd(tour) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: tour.name,
    url: tour.website,
    sameAs: [absolute(tour.path)],
  }
  if (tour.label && tour.label !== tour.name) schema.alternateName = tour.label
  if (tour.logoSrc) schema.logo = absolute(tour.logoSrc)
  return schema
}

/**
 * A set of series as an ItemList of Events — a city's, or a tour's — so a
 * crawler reads every stop from the page that lists them.
 *
 * @param {import('../content/festivals.js').Festival[]} festivals
 * @param {{ path: string, seo: { title: string, description: string } }} page
 */
export function seriesListLd(festivals, page) {
  const sorted = [...festivals].sort((a, b) => a.start.localeCompare(b.start))
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: page.seo.title,
    description: page.seo.description,
    url: absolute(page.path),
    numberOfItems: sorted.length,
    itemListElement: sorted.map((festival, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: eventLd(festivalAsEvent(festival), false),
    })),
  }
}

/**
 * A published story as a schema.org NewsArticle: the fields Google's article
 * rich result reads. Takes the public story shape from server/content.mjs.
 *
 * @param {{ title: string, href: string, date: string, standfirst?: string, heroImage?: string, updatedAt?: string }} story
 */
export function articleLd(story) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.title,
    datePublished: story.date,
    dateModified: (story.updatedAt || '').slice(0, 10) || story.date,
    mainEntityOfPage: absolute(story.href),
    url: absolute(story.href),
    inLanguage: 'en-AU',
    author: { '@type': 'Organization', name: site.brand.name, url: site.seo.siteUrl },
    publisher: {
      '@type': 'Organization',
      name: site.brand.name,
      ...(site.brand.logoSrc && {
        logo: { '@type': 'ImageObject', url: absolute(site.brand.logoSrc) },
      }),
    },
  }
  if (story.standfirst) schema.description = story.standfirst
  if (story.heroImage) schema.image = [absolute(story.heroImage)]
  return schema
}
