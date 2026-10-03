// Poker Calendar page: everything on the page that is not a festival row
// (those live in festivals.js). Title, tours, promo banner slot,
// Up Next cards and the page's own FAQ items.
//
// Tours, Up Next figures and dates come from the series timeline of
// 2026-10-02 (data/poker-series-timeline.json).

/**
 * @typedef {object} Tour
 * @property {string} code      matches Festival.tour; drawn in the logo box
 * @property {string} label     the short name shown where the wordmark is not
 * @property {string} name      the operator's full name, for the Event records' organizer
 * @property {string} href
 * @property {string} website   the operator's own site
 * @property {string} [logoSrc] the full wordmark, transparent, in the operator's colours
 *                              (a WebP from scripts/gen-tour-webp.py; the PNG beside it is the source)
 * @property {string} [iconSrc] 256×256 transparent square mark, drawn in a circle (WebP, as above)
 * @property {string} [monoSrc] the wordmark in one neutral grey, for a logo at rest
 *                              (built by scripts/gen-tour-mono.py — never hand-edit)
 */

/**
 * @typedef {object} UpNextItem
 * @property {string} tour
 * @property {string} name
 * @property {string} dates    "Oct 6 – Oct 11"
 * @property {string} place
 * @property {string} [prize]  as the operator advertises it, e.g. "$4M+ est."
 * @property {number} [events] published event count, when there is one
 * @property {string} href
 */

export const calendarPage = {
  /** @param {number} year */
  seo: (year) => ({
    title: `${year} Australian Poker Calendar: Tournaments, Series & Events`,
    description: `Every confirmed ${year} poker tournament series and event in Australia, month by month: dates, venues and buy-ins from the Australian Poker Tour, APL, Kings Poker, Crown Poker, Aurum and PlayLive. Updated as operators confirm their stops.`,
  }),
  /** @param {number} year */
  title: (year) => `${year} Australian Poker Calendar`,
  /** The links in the foot of the calendar, on to the neighbouring years. */
  years: {
    footLabel: 'Other years',
    prev: 'Previous year',
    next: 'Next year',
  },

  /** @type {Tour[]} */
  tours: [
    {
      code: 'APT',
      label: 'APT',
      name: 'Australian Poker Tour',
      href: '/series/australian-poker-tour',
      website: 'https://australianpokertour.com.au/',
      logoSrc: '/images/tours/apt.webp',
      iconSrc: '/images/tours/apt-icon.webp',
      monoSrc: '/images/tours/apt-mono.png',
    },
    {
      code: 'APL',
      label: 'APL',
      name: 'APL',
      href: '/series/apl',
      website: 'https://playapl.com/',
      logoSrc: '/images/tours/apl.webp',
      iconSrc: '/images/tours/apl-icon.webp',
      monoSrc: '/images/tours/apl-mono.png',
    },
    {
      code: 'APLPT',
      label: 'APLPT',
      name: 'APL Poker Tour',
      href: '/series/aplpt',
      website: 'https://www.playapl.com/aplpt',
      logoSrc: '/images/tours/aplpt.webp',
      iconSrc: '/images/tours/aplpt-icon.webp',
      monoSrc: '/images/tours/aplpt-mono.png',
    },
    {
      code: 'KINGS',
      label: 'KINGS',
      name: 'Kings Poker',
      href: '/series/kings-poker',
      website: 'https://kingspoker.com.au/',
      logoSrc: '/images/tours/kings.webp',
      iconSrc: '/images/tours/kings-icon.webp',
      monoSrc: '/images/tours/kings-mono.png',
    },
    {
      code: 'CROWN',
      label: 'CROWN',
      name: 'Crown Poker',
      href: '/series/crown-poker',
      website: 'https://www.crownmelbourne.com.au/casino/table-games/poker',
      logoSrc: '/images/tours/crown.webp',
      iconSrc: '/images/tours/crown-icon.svg',
      monoSrc: '/images/tours/crown-mono.png',
    },
    {
      code: 'AURUM',
      label: 'AURUM',
      name: 'Aurum Poker',
      href: '/series/aurum-poker',
      website: 'https://aurumpoker.com.au/',
      logoSrc: '/images/tours/aurum.webp',
      iconSrc: '/images/tours/aurum-icon.webp',
      monoSrc: '/images/tours/aurum-mono.png',
    },
    {
      code: 'PLAYLIVE',
      label: 'PLAYLIVE',
      name: 'PlayLive Melbourne',
      href: '/series/playlive-melbourne',
      website: 'https://playlive.melbourne/',
      logoSrc: '/images/tours/playlive.webp',
      iconSrc: '/images/tours/playlive-icon.webp',
      monoSrc: '/images/tours/playlive-mono.png',
    },
    {
      code: 'NPL',
      label: 'NPL',
      name: 'National Poker League',
      href: '/series/national-poker-league',
      website: 'https://www.npl.com.au/',
      // No wide wordmark on NPL's site (its header lockup is 105×50); the
      // round badge stands in for both shapes.
      logoSrc: '/images/tours/npl.webp',
      iconSrc: '/images/tours/npl-icon.webp',
      monoSrc: '/images/tours/npl-mono.png',
    },
    {
      code: 'EMPIRE',
      label: 'EMPIRE',
      name: 'Empire Poker',
      href: '/series/empire-poker',
      website: 'https://empirepoker.com.au/',
      logoSrc: '/images/tours/empire.webp',
      iconSrc: '/images/tours/empire-icon.webp',
      monoSrc: '/images/tours/empire-mono.png',
    },
    {
      code: 'PALACE',
      label: 'PALACE',
      name: 'Poker Palace',
      href: '/series/poker-palace',
      website: 'https://pokerpalace.com.au/',
      logoSrc: '/images/tours/palace.webp',
      iconSrc: '/images/tours/palace-icon.webp',
      monoSrc: '/images/tours/palace-mono.png',
    },
    {
      code: 'QUEENBS',
      label: 'QUEENBS',
      name: 'Queen B’s Poker',
      href: '/series/queen-bs-poker',
      website: 'https://www.queenbs.poker/',
      logoSrc: '/images/tours/queenbs.webp',
      iconSrc: '/images/tours/queenbs-icon.webp',
      monoSrc: '/images/tours/queenbs-mono.png',
    },
    {
      code: 'WPTL',
      label: 'WPTL',
      name: 'WPT League',
      href: '/series/wpt-league',
      website: 'https://www.wptleague.com/au/',
      logoSrc: '/images/tours/wptl.webp',
      iconSrc: '/images/tours/wptl-icon.webp',
      monoSrc: '/images/tours/wptl-mono.png',
    },
    {
      code: 'STACKED',
      label: 'STACKED',
      name: 'Stacked Poker',
      href: '/series/stacked-poker',
      website: 'https://stackedpoker.com.au/',
      logoSrc: '/images/tours/stacked.webp',
      iconSrc: '/images/tours/stacked-icon.webp',
      monoSrc: '/images/tours/stacked-mono.png',
    },
    {
      code: 'MGA',
      label: 'MGA',
      name: 'Mixed Games Academy',
      href: '/series/mixed-games-academy',
      website: 'https://mixedgamesacademy.au/',
      logoSrc: '/images/tours/mga.webp',
      iconSrc: '/images/tours/mga-icon.webp',
      monoSrc: '/images/tours/mga-mono.png',
    },
    {
      code: 'STAR',
      label: 'STAR',
      name: 'The Star Poker',
      href: '/series/the-star-poker',
      website: 'https://www.starpoker.com.au/sydney',
      logoSrc: '/images/tours/star.webp',
      iconSrc: '/images/tours/star-icon.webp',
      monoSrc: '/images/tours/star-mono.png',
    },
    {
      code: 'GAMBIER',
      label: 'GAMBIER',
      name: 'Gambier Poker',
      href: '/series/gambier-poker',
      website: 'https://gambierpoker.com.au/',
      logoSrc: '/images/tours/gambier.webp',
      iconSrc: '/images/tours/gambier-icon.webp',
      monoSrc: '/images/tours/gambier-mono.png',
    },
    {
      code: 'CHECKRAISE',
      label: 'CHECKRAISE',
      name: 'Check Raise Poker',
      href: '/series/check-raise-poker',
      website: 'https://www.checkraisepoker.com.au/',
      logoSrc: '/images/tours/checkraise.webp',
      iconSrc: '/images/tours/checkraise-icon.webp',
      monoSrc: '/images/tours/checkraise-mono.png',
    },
    {
      code: 'MATCHROOM',
      label: 'MATCHROOM',
      name: 'Matchroom Poker',
      href: '/series/matchroom-poker',
      website: 'https://thematchroom.com.au/',
      logoSrc: '/images/tours/matchroom.webp',
      iconSrc: '/images/tours/matchroom-icon.webp',
      monoSrc: '/images/tours/matchroom-mono.png',
    },
  ],
  // 1080×135 promo banner (shipped at 2× for retina). Clear `src` to fall
  // back to the striped placeholder. `mobileSrc` is an optional 750×300 cut
  // of the same artwork for phones, where an 8:1 strip is unreadable; without
  // it the wide image is centre-cropped. `href` is the series' own page on
  // this site (its full schedule), not the operator's; the page links out.
  // `tag` is the small label stuck half over the frame's top-left corner;
  // clear it for a plain banner.
  banner: {
    label: 'promo banner 1080×135',
    tag: 'Featured',
    src: '/images/promos/playlive-summer-championship.webp',
    mobileSrc: '/images/promos/playlive-summer-championship-mobile.webp',
    alt: 'PlayLive Melbourne Summer Championship: $3,000,000 guaranteed, November 26 to December 15',
    href: '/events/playlive-summer-championship',
  },

  views: {
    timeline: 'Timeline',
    list: 'List',
  },
  countLabel: 'series',

  /** The city page links below Up Next. */
  cityLinks: {
    heading: 'Poker by city',
  },

  upNext: {
    heading: 'Up Next',
    eventsLabel: 'events',
    /** @type {UpNextItem[]} */
    items: [
      {
        tour: 'APLPT',
        name: 'APLPT Brisbane',
        dates: 'Oct 6 – Oct 11',
        place: 'Brisbane',
        href: '/events/aplpt-brisbane',
      },
      {
        tour: 'CROWN',
        name: 'Victorian Poker Championship 2026',
        dates: 'Oct 12 – Oct 27',
        place: 'Melbourne',
        prize: '$2M series in 2025',
        href: '/events/victorian-poker-championship-2026',
      },
      {
        tour: 'APL',
        name: 'APL The Ville 600 Townsville',
        dates: 'Oct 18 – Oct 25',
        place: 'Townsville',
        href: '/events/apl-the-ville-600-townsville',
      },
      {
        tour: 'KINGS',
        name: 'Kings Poker Sydney Millions',
        dates: 'Oct 27 – Nov 9',
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
