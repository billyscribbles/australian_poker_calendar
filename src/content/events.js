// Events banner: the live hero event, two side events and the tournament
// ticker. Series and dates come from the Australian Poker Schedule timeline
// scrape (data/poker-series-timeline.json); the ticker rows are the featured
// events on the APT Melbourne Champs II schedule poster
// (data/melbourne-champs-ii-schedule.json). Live chip leaders need a results
// feed and are left out until one exists.

/**
 * @typedef {object} HeroEvent
 * @property {string} name
 * @property {string} dates   e.g. "Sep 30 – Oct 11"
 * @property {string} place   city, country
 * @property {string} venue
 * @property {string} tour      tour code from calendarPage.tours; draws the circular badge
 * @property {string} href
 * @property {string} [imageSrc] key visual; placeholder when absent
 */

/**
 * @typedef {object} SideEvent
 * @property {'live' | 'upcoming'} status
 * @property {string} tour
 * @property {string} name
 * @property {string} dates
 * @property {string} href
 * @property {string} [imageSrc]
 */

/**
 * @typedef {object} ChipLeader
 * @property {string} stack  e.g. "12M"
 * @property {string} bb     e.g. "(75 BB)"
 */

/**
 * @typedef {object} TickerEvent
 * @property {string} tour       tour code from calendarPage.tours; draws the room's icon
 * @property {string} buyIn      formatted amount, e.g. "1,650"
 * @property {string} currency   e.g. "AUD"
 * @property {string} name
 * @property {string} date
 * @property {string} [entries]  e.g. "109" or "12/1,375" for a live event
 * @property {string} [guarantee] shown in place of entries until results exist
 * @property {string} href
 * @property {boolean} [featured]  a feature event on the series poster; draws the Featured tag
 * @property {boolean} [live]
 * @property {string} [level]            live only, e.g. "Level 32"
 * @property {ChipLeader[]} [leaders]    live only, top three stacks
 */

/** @type {HeroEvent} */
export const heroEvent = {
  tour: 'APT',
  name: 'APT Melbourne Champs II',
  dates: 'Sep 30 – Oct 11',
  place: 'Melbourne, Australia',
  venue: 'Crown Melbourne, Metropol – Sky Bar 28',
  href: '/events/apt-melbourne-champs-ii',
  // APT's own promo shot (800×1000 webp, from the 1122×1402 original).
  imageSrc: '/images/events/apt-melbourne-champs-ii.webp',
}

/** @type {SideEvent[]} */
export const sideEvents = [
  {
    status: 'live',
    tour: 'AURUM',
    name: 'Aurum Sydney Showdown',
    dates: 'Oct 1 – Oct 19',
    href: '/events/aurum-sydney-showdown',
    // Aurum's portrait "$1.5 Million in guarantees" key visual (800×1000 webp,
    // from the 768×960 original). Use the portrait cut, not the landscape
    // banner: the card is 4:5 and crops a 16:9 headline to "NEY SHOWDO".
    imageSrc: '/images/events/aurum-sydney-showdown.webp',
  },
  {
    status: 'upcoming',
    tour: 'APLPT',
    name: 'APLPT Brisbane',
    dates: 'Oct 6 – Oct 11',
    href: '/events/aplpt-brisbane',
    // APL's "$500,000 in event guarantees" square poster, at 800 wide near the
    // top of an 800×1000 canvas (same treatment as the Aurum card) so the
    // logo clears the status badge.
    imageSrc: '/images/events/aplpt-brisbane.webp',
  },
]

// `srLabel` completes the visible "More" for screen readers and crawlers,
// which otherwise see a link whose only text is a generic word.
export const moreEvents = { label: 'More', srLabel: 'events', href: '/poker-calendar/2026' }

/** @type {TickerEvent[]} */
export const ticker = [
  {
    tour: 'APT',
    buyIn: '1,650',
    currency: 'AUD',
    featured: true,
    name: 'Melbourne Champs Main Event',
    date: 'Oct 4 – Oct 11',
    guarantee: '$350K GTD',
    href: '/events/apt-melbourne-champs-ii',
  },
  {
    tour: 'APT',
    buyIn: '600',
    currency: 'AUD',
    featured: true,
    name: 'Hachem Deepstack',
    date: 'Oct 2 – Oct 3',
    guarantee: '$60K GTD',
    href: '/events/apt-melbourne-champs-ii',
  },
  {
    tour: 'APT',
    buyIn: '2,000',
    currency: 'AUD',
    featured: true,
    name: "Van's Vault",
    date: 'Oct 3 – Oct 4',
    guarantee: '$100K GTD',
    href: '/events/apt-melbourne-champs-ii',
  },
  {
    tour: 'APT',
    buyIn: '750',
    currency: 'AUD',
    featured: true,
    name: 'The Whale',
    date: 'Oct 4 – Oct 5',
    guarantee: '$50K GTD',
    href: '/events/apt-melbourne-champs-ii',
  },
  {
    tour: 'APT',
    buyIn: '1,250',
    currency: 'AUD',
    featured: true,
    name: 'The Grind',
    date: 'Oct 6 – Oct 7',
    guarantee: '$100K GTD',
    href: '/events/apt-melbourne-champs-ii',
  },
  {
    tour: 'APT',
    buyIn: '2,500',
    currency: 'AUD',
    featured: true,
    name: 'The Goliath',
    date: 'Oct 7 – Oct 8',
    guarantee: '$150K GTD',
    href: '/events/apt-melbourne-champs-ii',
  },
  {
    tour: 'APT',
    buyIn: '2,300',
    currency: 'AUD',
    featured: true,
    name: 'The Big Flipper',
    date: 'Oct 8 – Oct 9',
    guarantee: '$100K GTD',
    href: '/events/apt-melbourne-champs-ii',
  },
]

/** The ticker's scroll buttons and the tag on each feature event. */
export const tickerControls = {
  prev: 'Earlier events',
  next: 'Later events',
  featuredLabel: 'Featured',
}
