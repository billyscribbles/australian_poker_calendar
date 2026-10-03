// Every series on the calendar: the 2026–27 stops as operators announced them,
// pulled on 2026-10-03. The full record for each row — organiser contacts,
// venue address, poster facts — is in data/poker-series-timeline.json; the
// listing each row was taken from is in data/series-sources.json, keyed by
// href, and stays out of the browser bundle. This file is the slice the
// calendar draws. Add rows here when operators add stops.
//
// Rows are compact tuples so the whole timeline reads as a table. Dates are
// full ISO so a season can run past New Year; CalendarPage filters each year's
// document to the rows that touch it. `status` is omitted for a normal series;
// 'cancelled', 'postponed' and 'moved' draw the bar in the muted "off" style.
// `href` is derived from the name so it matches the event links the home page
// uses (/events/<slug>); `website` is the operator's own page for the series.

/**
 * @typedef {object} Festival
 * @property {string} tour    short tour code; keyed against calendarPage.tours
 * @property {string} name
 * @property {string} start   ISO date, inclusive
 * @property {string} end     ISO date, inclusive
 * @property {string} place   "City, Venue"
 * @property {'cancelled' | 'postponed' | 'moved'} [status]
 * @property {string} href
 * @property {string} website the operator's own page for the series
 */

/** The year the default calendar document shows. */
export const YEAR = 2026

// [tour, name, start, end, place, website, status?]
const rows = [
  [
    'EMPIRE',
    'Empire Poker Festival January 2026',
    '2026-01-02',
    '2026-01-12',
    'Brisbane, Wantima Country Club (Brendale)',
    'https://empirepoker.com.au/',
  ],
  [
    'PALACE',
    'Poker Palace Lucky 8 Series',
    '2026-01-05',
    '2026-01-11',
    'Sydney, Bankstown Sports Club',
    'https://pokerpalace.com.au/',
  ],
  [
    'APLPT',
    'APLPT Gold Coast January 2026',
    '2026-01-10',
    '2026-01-18',
    'Gold Coast, Southport Sharks',
    'https://playapl.com/aplpt',
  ],
  [
    'KINGS',
    'Kings Cup Series January 2026',
    '2026-01-11',
    '2026-01-25',
    'Sydney, Churchills Sports Bar',
    'https://kingspoker.com.au/',
  ],
  [
    'QUEENBS',
    "Queen B's Wake It Up Mini Series",
    '2026-01-12',
    '2026-01-18',
    "Beenleigh, Queen B's Poker",
    'https://www.queenbs.poker/',
  ],
  [
    'WPTL',
    'WPT League Illawarra Summer Series',
    '2026-01-14',
    '2026-01-18',
    'Illawarra, Warilla Bowls and Recreation Club',
    'https://www.wptleague.com/au/',
  ],
  [
    'PLAYLIVE',
    'PlayLive Melbourne Millions 2026',
    '2026-01-15',
    '2026-02-03',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/',
  ],
  [
    'APL',
    'APL600 Sydney',
    '2026-01-23',
    '2026-02-01',
    'Sydney, Canterbury Hurlstone Park RSL',
    'https://playapl.com/',
  ],
  [
    'STACKED',
    'Stacked Poker Championship 2026',
    '2026-01-25',
    '2026-02-09',
    'Adelaide, Stacked Social',
    'https://stackedpoker.com.au/',
  ],
  [
    'MGA',
    'Mixed Games Academy The Melbourne Mix',
    '2026-02-03',
    '2026-02-08',
    'South Melbourne, PlayLive Melbourne',
    'https://mixedgamesacademy.au/',
  ],
  [
    'APL',
    'APL NQ Classic Townsville',
    '2026-02-10',
    '2026-02-15',
    'Townsville, The Ville Resort-Casino',
    'https://playapl.com/',
  ],
  [
    'KINGS',
    'Kings Poker Chinese NY Lunar Series 2026',
    '2026-02-11',
    '2026-02-23',
    'Sydney, St. George Leagues Club',
    'https://kingspoker.com.au/',
  ],
  [
    'STAR',
    'The Star Shot Clocks Super Stacks Gold Coast',
    '2026-02-13',
    '2026-02-24',
    'Gold Coast, The Star Gold Coast',
    'https://www.star.com.au/goldcoast',
  ],
  [
    'APLPT',
    'APLPT Albury February 2026',
    '2026-02-24',
    '2026-03-01',
    'Albury, Commercial Club Albury',
    'https://playapl.com/aplpt',
  ],
  [
    'APT',
    'APT Melbourne Champs',
    '2026-02-27',
    '2026-03-08',
    'Melbourne, Oakwood Premier Hotel',
    'https://australianpokertour.com.au/',
  ],
  [
    'KINGS',
    'Kings Cup Series March 2026',
    '2026-03-01',
    '2026-03-15',
    'Sydney, Churchills Sports Bar',
    'https://kingspoker.com.au/',
  ],
  [
    'PLAYLIVE',
    'PlayLive Melbourne Grand Prix',
    '2026-03-05',
    '2026-03-16',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/',
  ],
  [
    'KINGS',
    'Kings Poker Newcastle Kingdom Championships March 2026',
    '2026-03-10',
    '2026-03-22',
    'Newcastle, Blackbutt Hotel',
    'https://kingspoker.au/live/',
  ],
  [
    'GAMBIER',
    'Gambier & Yole Poker State Showdown',
    '2026-03-11',
    '2026-03-15',
    'Mount Gambier, Mount Gambier Civic Centre',
    'https://gambierpoker.com.au/',
  ],
  [
    'EMPIRE',
    'Empire Poker Ignition Series',
    '2026-03-12',
    '2026-03-16',
    'Brisbane, Wantima Country Club (Brendale)',
    'https://empirepoker.com.au/',
  ],
  [
    'APLPT',
    'APLPT Brisbane March 2026',
    '2026-03-17',
    '2026-03-22',
    'Brisbane, Broncos Club',
    'https://playapl.com/aplpt',
  ],
  [
    'STAR',
    'The Star Sydney Champs',
    '2026-03-18',
    '2026-03-31',
    'Sydney, The Star Sydney',
    'https://www.starpoker.com.au/sydney',
  ],
  [
    'QUEENBS',
    "Queen B's The Swarm Series",
    '2026-03-25',
    '2026-03-29',
    "Beenleigh, Queen B's Poker",
    'https://www.queenbs.poker/',
  ],
  [
    'PALACE',
    'Australian Poker Open 2026',
    '2026-04-01',
    '2026-04-12',
    'Sydney, Doltone House Western Sydney',
    'https://www.australianpokeropen.com.au/',
  ],
  [
    'APT',
    'APT Brisbane Champs',
    '2026-04-12',
    '2026-04-19',
    'Brisbane, Eatons Hill Hotel',
    'https://australianpokertour.com.au/',
  ],
  [
    'PLAYLIVE',
    'PlayLive Melbourne Big Birthday Weekend',
    '2026-04-17',
    '2026-04-19',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/',
  ],
  [
    'CROWN',
    '2026 Aussie Millions',
    '2026-04-24',
    '2026-05-10',
    'Melbourne, Crown Melbourne',
    'https://www.crownmelbourne.com.au/casino/table-games/poker',
  ],
  [
    'APLPT',
    'APLPT Gold Coast May 2026',
    '2026-05-11',
    '2026-05-17',
    'Gold Coast, Southport Sharks',
    'https://playapl.com/aplpt',
  ],
  [
    'APT',
    'APT Adelaide Champs',
    '2026-05-15',
    '2026-05-24',
    'Adelaide, Crowne Plaza Mawson Lakes',
    'https://australianpokertour.com.au/',
  ],
  [
    'KINGS',
    'Kings Poker Colossus Series',
    '2026-05-20',
    '2026-06-01',
    'Sydney, St. George Leagues Club',
    'https://kingspoker.com.au/',
  ],
  [
    'STACKED',
    'Stacked Social Adelaide Championship',
    '2026-05-28',
    '2026-06-08',
    'Adelaide, Stacked Social',
    'https://stackedpoker.com.au/',
  ],
  [
    'PALACE',
    'Poker Palace Winter Series',
    '2026-06-01',
    '2026-06-08',
    'Sydney, Poker Palace at Club Marconi',
    'https://pokerpalace.com.au/',
  ],
  [
    'QUEENBS',
    "Queen B's Coronation Cup",
    '2026-06-04',
    '2026-06-14',
    "Beenleigh, Queen B's Poker",
    'https://www.queenbs.poker/',
  ],
  [
    'PLAYLIVE',
    'PlayLive Melbourne Winter Champs',
    '2026-06-04',
    '2026-06-23',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/',
  ],
  [
    'APLPT',
    'APLPT Adelaide',
    '2026-06-09',
    '2026-06-14',
    'Adelaide, The Junction (Camden Park)',
    'https://playapl.com/aplpt',
  ],
  [
    'AURUM',
    'Aurum Festivus Series',
    '2026-06-09',
    '2026-06-22',
    'Sydney, St Johns Park Bowling Club',
    'https://aurumpoker.com.au/',
  ],
  [
    'APT',
    'APT Satellite Showdown',
    '2026-07-07',
    '2026-07-19',
    'Melbourne, Crowne Plaza Melbourne Carlton',
    'https://australianpokertour.com.au/',
  ],
  [
    'APL',
    'APL Highways Satellite Series',
    '2026-07-08',
    '2026-07-12',
    'Melbourne, Highways Springvale',
    'https://playapl.com/',
  ],
  [
    'STAR',
    'The Star Shot Clocks Super Stacks Sydney',
    '2026-07-09',
    '2026-07-20',
    'Sydney, The Star Sydney',
    'https://www.starpoker.com.au/sydney',
  ],
  [
    'APLPT',
    'APLPT Sydney',
    '2026-07-14',
    '2026-07-19',
    'Sydney, Canterbury Hurlstone Park RSL',
    'https://playapl.com/aplpt',
  ],
  [
    'KINGS',
    'Kings Cup Series July 2026',
    '2026-07-21',
    '2026-08-02',
    'Sydney, Churchills Sports Bar',
    'https://kingspoker.com.au/',
  ],
  [
    'KINGS',
    'Kings Poker Newcastle Kingdom Championships July 2026',
    '2026-07-21',
    '2026-08-02',
    'Newcastle, Blackbutt Hotel',
    'https://kingspoker.au/live/',
  ],
  [
    'APL',
    'APL Cairns Winter Series',
    '2026-07-24',
    '2026-07-26',
    'Cairns, Brothers Leagues Club Cairns',
    'https://playapl.com/',
  ],
  [
    'EMPIRE',
    'Empire Poker Evolution Festival',
    '2026-07-25',
    '2026-08-03',
    'Brisbane, Wantima Country Club (Brendale)',
    'https://empirepoker.com.au/',
  ],
  [
    'KINGS',
    'Kings Poker Signature Series',
    '2026-07-29',
    '2026-08-10',
    'Sydney, St. George Leagues Club',
    'https://kingspoker.com.au/',
  ],
  [
    'MGA',
    'Mixed Games Academy Mixed Games Festival',
    '2026-08-04',
    '2026-08-10',
    'South Melbourne, PlayLive Melbourne',
    'https://mixedgamesacademy.au/',
  ],
  [
    'CHECKRAISE',
    'Check Raise Poker Championships 2026',
    '2026-08-07',
    '2026-08-09',
    'Springfield Lakes, Springlake Hotel',
    'https://www.checkraisepoker.com.au/',
  ],
  [
    'APL',
    'APL Million Gold Coast 2026',
    '2026-08-14',
    '2026-08-31',
    'Gold Coast, Southport Sharks',
    'https://www.playapl.com/aplpt/2026-apl-million',
  ],
  [
    'PALACE',
    'Irish Poker Open Sydney',
    '2026-08-31',
    '2026-09-14',
    'Sydney, Poker Palace at Club Marconi',
    'https://irishpokeropen.com/sydney/',
  ],
  [
    'APT',
    'APT Satellite Showdown II',
    '2026-09-02',
    '2026-09-14',
    'Melbourne, Crowne Plaza Melbourne Carlton',
    'https://australianpokertour.com.au/',
  ],
  [
    'STAR',
    'WPT Australia 2026',
    '2026-09-10',
    '2026-09-30',
    'Sydney, The Star Sydney',
    'https://www.starpoker.com.au/sydney',
  ],
  [
    'PLAYLIVE',
    'PlayLive The Finals 2026',
    '2026-09-16',
    '2026-09-28',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/',
  ],
  [
    'NPL',
    'NPL Sydney Poker Open September 2026',
    '2026-09-17',
    '2026-09-20',
    'Sydney, Bexley RSL',
    'https://www.npl.com.au/SydneyPokerOpen',
  ],
  [
    'APT',
    'APT Melbourne Champs II',
    '2026-09-30',
    '2026-10-11',
    'Melbourne, Crown Melbourne (Metropol, Sky Bar 28)',
    'https://australianpokertour.com.au/',
  ],
  [
    'AURUM',
    'Aurum Sydney Showdown',
    '2026-10-01',
    '2026-10-19',
    'Sydney, St Johns Park Bowling Club',
    'https://aurumpoker.com.au/',
  ],
  [
    'APLPT',
    'APLPT Brisbane',
    '2026-10-06',
    '2026-10-11',
    'Brisbane, Broncos Club',
    'https://www.playapl.com/aplpt/',
  ],
  [
    'CROWN',
    'Victorian Poker Championship 2026',
    '2026-10-12',
    '2026-10-27',
    'Melbourne, Crown Poker Room',
    'https://www.crownmelbourne.com.au/casino/table-games/poker',
  ],
  [
    'GAMBIER',
    'Gambier & Yole Poker October Pokerfest 2026',
    '2026-10-14',
    '2026-10-18',
    'Mount Gambier, The Globe Hotel',
    'https://gambierpoker.com.au/upcoming-events/',
  ],
  [
    'APL',
    'APL The Ville 600 Townsville',
    '2026-10-18',
    '2026-10-25',
    'Townsville, The Ville Resort-Casino',
    'https://playapl.com/',
  ],
  [
    'KINGS',
    'Kings Poker Sydney Millions',
    '2026-10-27',
    '2026-11-09',
    'Sydney, St. George Leagues Club',
    'https://kingspoker.com.au/',
  ],
  [
    'MATCHROOM',
    'Matchroom Super Series',
    '2026-10-30',
    '2026-11-09',
    'Adelaide, Matchroom Poker',
    'https://thematchroom.com.au/series/',
  ],
  [
    'APT',
    'APT Sydney Champs',
    '2026-11-05',
    '2026-11-15',
    "Sydney, Revesby Workers' Club",
    'https://australianpokertour.com.au/',
  ],
  [
    'APLPT',
    'APLPT Albury',
    '2026-11-17',
    '2026-11-22',
    'Albury, SS&A Club',
    'https://playapl.com/aplpt',
  ],
  [
    'NPL',
    'NPL Super Series 2026',
    '2026-11-19',
    '2026-11-22',
    'Sydney, Club Willoughby',
    'https://www.npl.com.au/SuperSeries',
  ],
  [
    'PLAYLIVE',
    'PlayLive Summer Championship',
    '2026-11-26',
    '2026-12-15',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/',
  ],
  [
    'APT',
    'APT Gold Coast Champs',
    '2026-11-27',
    '2026-12-06',
    'Gold Coast, Crowne Plaza Surfers Paradise',
    'https://australianpokertour.com.au/live-feed/',
  ],
  [
    'KINGS',
    'Kings Cup Series December 2026',
    '2026-12-01',
    '2026-12-13',
    'Sydney, Churchills Sports Bar',
    'https://kingspoker.com.au/',
  ],
  [
    'APT',
    'APT Melbourne Champs III',
    '2027-01-08',
    '2027-01-26',
    'Melbourne, Crown Melbourne',
    'https://australianpokertour.com.au/',
  ],
  [
    'KINGS',
    'Kings Cup Series January 2027',
    '2027-01-10',
    '2027-01-24',
    'Sydney, Churchills Sports Bar',
    'https://kingspoker.com.au/',
  ],
  [
    'PLAYLIVE',
    'PlayLive Melbourne Millions 2027',
    '2027-01-20',
    '2027-02-09',
    'South Melbourne, PlayLive Melbourne',
    'https://playlive.melbourne/',
  ],
  [
    'KINGS',
    'Kings Poker Chinese NY Lunar Series',
    '2027-02-02',
    '2027-02-15',
    'Sydney, St. George Leagues Club',
    'https://kingspoker.com.au/',
  ],
  [
    'APT',
    'APT Adelaide Champs II',
    '2027-02-12',
    '2027-02-22',
    'Adelaide, Crowne Plaza Mawson Lakes',
    'https://australianpokertour.com.au/live-feed/',
  ],
  [
    'APL',
    'APL Million Sydney 2027',
    '2027-02-24',
    '2027-03-15',
    'Sydney, The Star',
    'https://playapl.com/',
  ],
  [
    'APT',
    'APT Sydney Champs II',
    '2027-03-19',
    '2027-03-29',
    "Sydney, Revesby Workers' Club",
    'https://australianpokertour.com.au/',
  ],
  [
    'APT',
    'APT Melbourne Champs IV',
    '2027-04-08',
    '2027-04-18',
    'Melbourne, Crown Melbourne',
    'https://australianpokertour.com.au/',
  ],
  [
    'CROWN',
    '2027 Aussie Millions',
    '2027-04-08',
    '2027-04-24',
    'Melbourne, Crown Melbourne',
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
export const festivals = rows.map(([tour, name, start, end, place, website, status]) => ({
  tour,
  name,
  start,
  end,
  place,
  website,
  ...(status && { status }),
  href: `/events/${slugify(name)}`,
}))
