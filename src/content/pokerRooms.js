// "Poker rooms across Australia": the logo strip at the foot of the home and
// calendar pages. Every room the calendar tracks, as a wordmark tile in that
// room's own colours (content/tourBrands.js), linking out to the operator.
//
// The list is derived from calendarPage.tours so a new tour added there shows
// up here with no second edit. `name` is the accessible link text; the tile
// itself only shows the mark.

import { calendarPage } from './calendarPage.js'
import { tourBrands } from './tourBrands.js'

/**
 * @typedef {object} PokerRoom
 * @property {string} code     matches calendarPage.tours and tourBrands
 * @property {string} name     the room, as a screen reader hears the link
 * @property {string} website  the operator's own site
 * @property {string} logoSrc  wordmark in public/images/tours
 * @property {'light' | 'dark'} tone  of that wordmark: a dark mark gets a white card
 */

/** @type {Record<string, string>} */
const names = {
  APT: 'Australian Poker Tour',
  APL: 'APL Poker',
  APLPT: 'APL Poker Tour',
  KINGS: 'Kings Poker',
  CROWN: 'Crown Poker Melbourne',
  AURUM: 'Aurum Poker Grand',
  PLAYLIVE: 'PlayLive Melbourne',
  NPL: 'National Poker League',
}

// Rooms whose strip tile differs from the calendar's mark. Crown's shipped
// lockup is gold and cream for the dark timeline bars; here Crown sits on a
// white card, as on its own site, so the tile takes the near-black lockup.
/** @type {Record<string, Partial<Pick<PokerRoom, 'logoSrc' | 'tone'>>>} */
const overrides = {
  CROWN: { logoSrc: '/images/tours/crown-on-white.png', tone: 'dark' },
}

export const pokerRooms = {
  heading: 'Poker rooms across Australia',
  /** @type {PokerRoom[]} */
  rooms: calendarPage.tours
    .filter((tour) => tour.logoSrc)
    .map((tour) => ({
      code: tour.code,
      name: names[tour.code] ?? tour.label,
      website: tour.website,
      logoSrc: tour.logoSrc,
      tone: tourBrands[tour.code]?.logo ?? 'light',
      ...overrides[tour.code],
    })),
}
