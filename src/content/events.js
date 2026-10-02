// Events banner: the live hero event, two side events and the tournament
// ticker. Series and dates come from the Australian Poker Schedule timeline
// scrape (data/poker-series-timeline.json); the ticker rows are the featured
// events on the APT Melbourne Champs II schedule poster
// (data/melbourne-champs-ii-schedule.json). Live chip leaders need a results
// feed and are left out until one exists.

/**
 * @typedef {object} HeroEvent
 * @property {string} name
 * @property {string} dates   e.g. "2026.09.30 - 2026.10.11"
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
 * @property {boolean} [live]
 * @property {string} [level]            live only, e.g. "Level 32"
 * @property {ChipLeader[]} [leaders]    live only, top three stacks
 */

/** @type {HeroEvent} */
export const heroEvent = {
  tour: 'APT',
  name: 'APT Melbourne Champs II',
  dates: '2026.09.30 - 2026.10.11',
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
    dates: '2026.10.01 - 2026.10.19',
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
    dates: '2026.10.06 - 2026.10.11',
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
    name: 'Melbourne Champs Main Event',
    date: '2026.10.04 - 2026.10.11',
    guarantee: '$350K GTD',
    href: '/events/apt-melbourne-champs-ii/melbourne-champs',
  },
  {
    tour: 'APT',
    buyIn: '600',
    currency: 'AUD',
    name: 'Hachem Deepstack',
    date: '2026.10.02 - 2026.10.03',
    guarantee: '$60K GTD',
    href: '/events/apt-melbourne-champs-ii/hachem-deepstack',
  },
  {
    tour: 'APT',
    buyIn: '2,000',
    currency: 'AUD',
    name: "Van's Vault",
    date: '2026.10.03 - 2026.10.04',
    guarantee: '$100K GTD',
    href: '/events/apt-melbourne-champs-ii/vans-vault',
  },
  {
    tour: 'APT',
    buyIn: '750',
    currency: 'AUD',
    name: 'The Whale',
    date: '2026.10.04 - 2026.10.05',
    guarantee: '$50K GTD',
    href: '/events/apt-melbourne-champs-ii/the-whale',
  },
  {
    tour: 'APT',
    buyIn: '1,250',
    currency: 'AUD',
    name: 'The Grind',
    date: '2026.10.06 - 2026.10.07',
    guarantee: '$100K GTD',
    href: '/events/apt-melbourne-champs-ii/the-grind',
  },
  {
    tour: 'APT',
    buyIn: '2,500',
    currency: 'AUD',
    name: 'The Goliath',
    date: '2026.10.07 - 2026.10.08',
    guarantee: '$150K GTD',
    href: '/events/apt-melbourne-champs-ii/the-goliath',
  },
  {
    tour: 'APT',
    buyIn: '2,300',
    currency: 'AUD',
    name: 'The Big Flipper',
    date: '2026.10.08 - 2026.10.09',
    guarantee: '$100K GTD',
    href: '/events/apt-melbourne-champs-ii/the-big-flipper',
  },
]
