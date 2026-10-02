// Every series on the calendar, scraped from the Australian Poker Schedule
// series timeline (https://australianpokerschedule.com.au/series-timeline/) on
// 2026-10-02. The full record for each row — organiser contacts, venue address
// and coordinates, poster facts — is in data/poker-series-timeline.json; this
// file is the slice the calendar draws. Re-run the scrape and regenerate when
// operators add stops.
//
// Rows are compact tuples so the whole timeline reads as a table. Dates are
// full ISO so a season can run past New Year; CalendarPage filters each year's
// document to the rows that touch it. `status` is omitted for a normal series;
// 'cancelled', 'postponed' and 'moved' draw the bar in the muted "off" style.
// `href` is derived from the name so it matches the event links the home page
// uses (/events/<slug>); `source` is the listing the row was taken from and
// `website` the operator's own link on it.

/**
 * @typedef {object} Festival
 * @property {string} tour    short tour code; keyed against calendarPage.tours
 * @property {string} name
 * @property {string} start   ISO date, inclusive
 * @property {string} end     ISO date, inclusive
 * @property {string} place   "City, Venue"
 * @property {'cancelled' | 'postponed' | 'moved'} [status]
 * @property {string} href
 * @property {string} source  where the row was taken from: the Australian Poker Schedule
 *                            event page, or the operator's own series page when the
 *                            series is not listed there (PlayLive Melbourne, NPL)
 * @property {string} website the operator's own page for the series
 */

/** The year the default calendar document shows. */
export const YEAR = 2026

// [tour, name, start, end, place, source, website, status?]
const rows = [
  [
    'PLAYLIVE',
    'PlayLive The Finals 2026',
    '2026-09-16',
    '2026-09-28',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/#series',
    'https://playlive.melbourne/',
  ],
  [
    'NPL',
    'NPL Sydney Poker Open September 2026',
    '2026-09-17',
    '2026-09-20',
    'Sydney, Bexley RSL',
    'https://www.npl.com.au/SydneyPokerOpen',
    'https://www.npl.com.au/SydneyPokerOpen',
  ],
  [
    'APT',
    'APT Melbourne Champs II',
    '2026-09-30',
    '2026-10-11',
    'Melbourne, Crown Melbourne (Metropol, Sky Bar 28)',
    'https://australianpokerschedule.com.au/event/australian-poker-tour-melbourne-champs-ii-vic/',
    'https://australianpokertour.com.au/',
  ],
  [
    'AURUM',
    'Aurum Sydney Showdown',
    '2026-10-01',
    '2026-10-19',
    'Sydney, St Johns Park Bowling Club',
    'https://australianpokerschedule.com.au/event/sydney-showdown-aurum-poker-grand-st-johns-park-nsw/',
    'https://aurumpoker.com.au/',
  ],
  [
    'APLPT',
    'APLPT Brisbane',
    '2026-10-06',
    '2026-10-11',
    'Brisbane, Broncos Club',
    'https://australianpokerschedule.com.au/event/aplpt-brisbane-broncos-club-qld-2/',
    'https://www.playapl.com/aplpt/',
  ],
  [
    'CROWN',
    'Victorian Poker Championship 2026',
    '2026-10-12',
    '2026-10-27',
    'Melbourne, Crown Poker Room',
    'https://australianpokerschedule.com.au/event/crown-poker-victorian-poker-champs-melbourne-vic/',
    'https://www.crownmelbourne.com.au/casino/table-games/poker',
  ],
  [
    'APL',
    'APL The Ville 600 Townsville',
    '2026-10-18',
    '2026-10-25',
    'Townsville, The Ville Resort-Casino',
    'https://australianpokerschedule.com.au/event/apl-the-ville-600-townsville-qld-3/',
    'https://playapl.com/',
  ],
  [
    'KINGS',
    'Kings Poker Sydney Millions',
    '2026-10-27',
    '2026-11-09',
    'Sydney, St. George Leagues Club',
    'https://australianpokerschedule.com.au/event/kings-poker-sydney-millions-kogarah-sydney-nsw/',
    'https://kingspoker.com.au/',
  ],
  [
    'APT',
    'APT Sydney Champs',
    '2026-11-05',
    '2026-11-15',
    "Sydney, Revesby Workers' Club",
    'https://australianpokerschedule.com.au/event/australian-poker-tour-sydney-champs-nsw/',
    'https://australianpokertour.com.au/',
  ],
  [
    'APLPT',
    'APLPT Albury',
    '2026-11-17',
    '2026-11-22',
    'Albury, SS&A Club',
    'https://australianpokerschedule.com.au/event/aplpt-albury-ssa-club-nsw-1/',
    'https://playapl.com/aplpt',
  ],
  [
    'NPL',
    'NPL Super Series 2026',
    '2026-11-19',
    '2026-11-22',
    'Sydney, Club Willoughby',
    'https://www.npl.com.au/SuperSeries',
    'https://www.npl.com.au/SuperSeries',
  ],
  [
    'PLAYLIVE',
    'PlayLive Summer Championship',
    '2026-11-26',
    '2026-12-15',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/#series',
    'https://playlive.melbourne/',
  ],
  [
    'APT',
    'APT Gold Coast Champs',
    '2026-11-27',
    '2026-12-06',
    'Gold Coast, Crowne Plaza Surfers Paradise',
    'https://australianpokerschedule.com.au/event/australian-poker-tour-gold-coast-champs-qld/',
    'https://australianpokertour.com.au/live-feed/',
  ],
  [
    'KINGS',
    'Kings Cup Series December 2026',
    '2026-12-01',
    '2026-12-13',
    'Sydney, Churchills Sports Bar',
    'https://australianpokerschedule.com.au/event/kings-poker-kings-cup-churchills-sports-bar-kingsford-sydney-nsw-4/',
    'https://kingspoker.com.au/',
  ],
  [
    'APT',
    'APT Melbourne Champs III',
    '2027-01-08',
    '2027-01-26',
    'Melbourne, Crown Melbourne',
    'https://australianpokerschedule.com.au/event/australian-poker-tour-melbourne-champs-iii-vic/',
    'https://australianpokertour.com.au/',
  ],
  [
    'KINGS',
    'Kings Cup Series January 2027',
    '2027-01-10',
    '2027-01-24',
    'Sydney, Churchills Sports Bar',
    'https://australianpokerschedule.com.au/event/kings-poker-kings-cup-churchills-sports-bar-kingsford-sydney-nsw-5/',
    'https://kingspoker.com.au/',
  ],
  [
    'PLAYLIVE',
    'PlayLive Melbourne Millions 2027',
    '2027-01-20',
    '2027-02-09',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/#series',
    'https://playlive.melbourne/',
  ],
  [
    'KINGS',
    'Kings Poker Chinese NY Lunar Series',
    '2027-02-02',
    '2027-02-15',
    'Sydney, St. George Leagues Club',
    'https://australianpokerschedule.com.au/event/kings-poker-chinese-ny-lunar-series-kogarah-sydney-nsw-2/',
    'https://kingspoker.com.au/',
  ],
  [
    'APT',
    'APT Adelaide Champs II',
    '2027-02-12',
    '2027-02-22',
    'Adelaide, Crowne Plaza Mawson Lakes',
    'https://australianpokerschedule.com.au/event/australian-poker-tour-adelaide-champs-ii-mawson-lakes-sa/',
    'https://australianpokertour.com.au/live-feed/',
  ],
  [
    'APL',
    'APL Million Sydney 2027',
    '2027-02-24',
    '2027-03-15',
    'Sydney, The Star',
    'https://australianpokerschedule.com.au/event/apl-million-sydney-the-star-nsw/',
    'https://playapl.com/',
  ],
  [
    'APT',
    'APT Sydney Champs II',
    '2027-03-19',
    '2027-03-29',
    "Sydney, Revesby Workers' Club",
    'https://australianpokerschedule.com.au/event/australian-poker-tour-sydney-champs-ii-nsw/',
    'https://australianpokertour.com.au/',
  ],
  [
    'APT',
    'APT Melbourne Champs IV',
    '2027-04-08',
    '2027-04-18',
    'Melbourne, Crown Melbourne',
    'https://australianpokerschedule.com.au/event/australian-poker-tour-melbourne-champs-iv-vic/',
    'https://australianpokertour.com.au/',
  ],
  [
    'CROWN',
    '2027 Aussie Millions',
    '2027-04-08',
    '2027-04-24',
    'Melbourne, Crown Melbourne',
    'https://australianpokerschedule.com.au/event/2027-aussie-millions-crown-melbourne/',
    'https://www.crownmelbourne.com.au/casino/table-games/poker',
  ],
]

const slugify = (name) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Label drawn before the name when a festival is not going ahead as planned. */
export const STATUS_LABELS = {
  cancelled: 'Cancelled',
  postponed: 'Postponed',
  moved: 'Moved',
}

/**
 * Every year a series on the calendar touches, ascending. src/routes.js emits
 * one calendar document per entry and CalendarPage links between them, so a
 * new season's rows put its year on the calendar by themselves.
 * @type {number[]}
 */
export const YEARS = [
  ...new Set(
    rows.flatMap(([, , start, end]) => {
      const years = []
      for (let y = Number(start.slice(0, 4)); y <= Number(end.slice(0, 4)); y++) years.push(y)
      return years
    }),
  ),
].sort()

/** @type {Festival[]} */
export const festivals = rows.map(([tour, name, start, end, place, source, website, status]) => ({
  tour,
  name,
  start,
  end,
  place,
  source,
  website,
  ...(status && { status }),
  href: `/events/${slugify(name)}`,
}))
