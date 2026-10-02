// Poker Calendar page: everything on the page that is not a festival row
// (those live in festivals.js). Title, tour strip, promo banner slot,
// Up Next cards and the page's own FAQ items.
//
// Tours, Up Next figures and dates come from the Australian Poker Schedule
// series timeline scrape of 2026-10-02 (data/poker-series-timeline.json).

/**
 * @typedef {object} Tour
 * @property {string} code      matches Festival.tour; drawn in the logo box
 * @property {string} label     tile text in the tour strip
 * @property {string} href
 * @property {string} website   the operator's own site, as linked from each APS event page
 * @property {string} [logoSrc] the full wordmark, transparent, in the operator's colours
 * @property {string} [iconSrc] 256×256 transparent square mark, drawn in a circle
 * @property {string} [monoSrc] the wordmark in one neutral grey, for the tour strip at rest
 *                              (built by scripts/gen-tour-mono.py — never hand-edit)
 */

/**
 * @typedef {object} UpNextItem
 * @property {string} tour
 * @property {string} name
 * @property {string} dates    "10.06 - 10.11"
 * @property {string} place
 * @property {string} [prize]  as the operator advertises it, e.g. "$4M+ est."
 * @property {number} [events] published event count, when there is one
 * @property {string} href
 */

export const calendarPage = {
  /** @param {number} year */
  seo: (year) => ({
    title: `${year} Australian Poker Calendar: Tournament Series Schedule`,
    description: `Every confirmed ${year} poker series across Australia, month by month: dates, venues and tours from the Australian Poker Tour and APL to Kings Poker and Crown Poker. Updated as operators confirm their stops.`,
  }),
  /** @param {number} year */
  title: (year) => `${year} Australian Poker Calendar`,

  /** @type {Tour[]} */
  tours: [
    {
      code: 'APT',
      label: 'APT',
      href: '/tours/australian-poker-tour',
      website: 'https://australianpokertour.com.au/',
      logoSrc: '/images/tours/apt.png',
      iconSrc: '/images/tours/apt-icon.png',
      monoSrc: '/images/tours/apt-mono.png',
    },
    {
      code: 'APL',
      label: 'APL',
      href: '/tours/apl',
      website: 'https://playapl.com/',
      logoSrc: '/images/tours/apl.png',
      iconSrc: '/images/tours/apl-icon.png',
      monoSrc: '/images/tours/apl-mono.png',
    },
    {
      code: 'APLPT',
      label: 'APLPT',
      href: '/tours/aplpt',
      website: 'https://www.playapl.com/aplpt',
      logoSrc: '/images/tours/aplpt.png',
      iconSrc: '/images/tours/aplpt-icon.png',
      monoSrc: '/images/tours/aplpt-mono.png',
    },
    {
      code: 'KINGS',
      label: 'KINGS',
      href: '/tours/kings-poker',
      website: 'https://kingspoker.com.au/',
      logoSrc: '/images/tours/kings.png',
      iconSrc: '/images/tours/kings-icon.png',
      monoSrc: '/images/tours/kings-mono.png',
    },
    {
      code: 'CROWN',
      label: 'CROWN',
      href: '/tours/crown-poker',
      website: 'https://www.crownmelbourne.com.au/casino/table-games/poker',
      logoSrc: '/images/tours/crown.png',
      iconSrc: '/images/tours/crown-icon.svg',
      monoSrc: '/images/tours/crown-mono.png',
    },
    {
      code: 'AURUM',
      label: 'AURUM',
      href: '/tours/aurum-poker',
      website: 'https://aurumpoker.com.au/',
      logoSrc: '/images/tours/aurum.png',
      iconSrc: '/images/tours/aurum-icon.png',
      monoSrc: '/images/tours/aurum-mono.png',
    },
    {
      code: 'PLAYLIVE',
      label: 'PLAYLIVE',
      href: '/tours/playlive-melbourne',
      website: 'https://playlive.melbourne/',
      logoSrc: '/images/tours/playlive.png',
      iconSrc: '/images/tours/playlive-icon.png',
      monoSrc: '/images/tours/playlive-mono.png',
    },
  ],
  allTours: { label: 'All tours →', href: '/tours' },

  // 1080×135 promo banner (shipped at 2× for retina). Clear `src` to fall
  // back to the striped placeholder. `mobileSrc` is an optional 750×300 cut
  // of the same artwork for phones, where an 8:1 strip is unreadable; without
  // it the wide image is centre-cropped.
  banner: {
    label: 'promo banner 1080×135',
    src: '/images/promos/playlive-summer-championship.webp',
    mobileSrc: '/images/promos/playlive-summer-championship-mobile.webp',
    alt: 'PlayLive Melbourne Summer Championship: $3,000,000 guaranteed, November 26 to December 15',
    href: 'https://playlive.melbourne/',
  },

  views: {
    timeline: 'Timeline',
    list: 'List',
  },
  countLabel: 'series',

  upNext: {
    heading: 'Up Next',
    eventsLabel: 'events',
    /** @type {UpNextItem[]} */
    items: [
      {
        tour: 'APLPT',
        name: 'APLPT Brisbane',
        dates: '10.06 - 10.11',
        place: 'Brisbane',
        href: '/events/aplpt-brisbane',
      },
      {
        tour: 'CROWN',
        name: 'Victorian Poker Championship 2026',
        dates: '10.12 - 10.27',
        place: 'Melbourne',
        prize: '$2M series in 2025',
        href: '/events/victorian-poker-championship-2026',
      },
      {
        tour: 'APL',
        name: 'APL The Ville 600 Townsville',
        dates: '10.18 - 10.25',
        place: 'Townsville',
        href: '/events/apl-the-ville-600-townsville',
      },
      {
        tour: 'KINGS',
        name: 'Kings Poker Sydney Millions',
        dates: '10.27 - 11.09',
        place: 'Sydney',
        prize: '$4M+ est.',
        href: '/events/kings-poker-sydney-millions',
      },
    ],
  },

  /** @type {import('./faq.js').FaqItem[]} */
  faq: [
    {
      q: 'When will the full season schedule be finalized?',
      a: 'Operators confirm stops throughout the year. Crown Poker, the Australian Poker Tour and Kings Poker usually publish dates a season ahead; club series often announce closer to the event. This page is updated as they do.',
    },
    {
      q: 'Where do these series take place?',
      a: 'Casino poker rooms such as Crown Melbourne, The Star Sydney and The Ville Townsville, plus registered clubs and hotels in Sydney, Brisbane, Albury, the Gold Coast and Adelaide.',
    },
    {
      q: 'How old do I have to be to play?',
      a: 'You must be 18 or over to enter any Australian casino or club poker room, and venues will ask for photo ID at registration.',
    },
    {
      q: 'How can I register for a tournament listed here?',
      a: "Each series card links to the event page with the schedule, structure and the operator's registration details. Most operators also sell tickets online in advance.",
    },
    {
      q: 'Does this calendar list cash game festivals?',
      a: 'The calendar focuses on tournament series. Cash games are included when they run alongside a listed series.',
    },
  ],
}
