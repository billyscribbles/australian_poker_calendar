// NPL Super Series 2026 — the Main Event schedule as data.
//
// Taken from NPL's Super Series page (https://www.npl.com.au/SuperSeries,
// "Next Event Schedule" table) and the $300,000 Main Event poster on
// 2026-10-03; data/npl-super-series-2026-schedule.json carries the same rows.
// This file IS the page: edit a row here and src/pages/EventPage.jsx redraws
// it. Nothing is derived at build time.
//
// NPL publishes only the Main Event so far: three Day 1 flights and a Day 2,
// with side events "to be announced". Their table calls every flight
// "Main Event - Day 1"; here they are Flight 1, 2 and 3 in date order. Times
// are TBC on their page, and no stack, level length, shot clock or
// late-registration point is printed, so those slots are left empty and the
// page drops the columns. Buy-in is the total, then entry + fee; Day 2 has
// none (NPL lists it as N/A) and says "Qualifiers only". Every event is
// dealer dealt. All four rows are featured: the series IS the Main Event
// until side events are announced.

// [date, name, buyIn, split, reEntry]
const rows = [
  ['2026-11-19', 'Main Event – Flight 1', '$1,150', '1,000+150', '2'],
  ['2026-11-20', 'Main Event – Flight 2', '$1,150', '1,000+150', '2'],
  ['2026-11-21', 'Main Event – Flight 3', '$1,150', '1,000+150', '2'],
  ['2026-11-22', 'Main Event – Day 2', '', 'Qualifiers only', ''],
]

/** @type {import('./eventMelbourneChampsII.js').ScheduleRow[]} */
const schedule = rows.map(([date, name, buyIn, split, reEntry]) => ({
  date,
  time: 'TBC',
  name,
  guarantee: '$300,000 GTD',
  buyIn,
  split,
  stack: '',
  blinds: '',
  shotClock: '',
  reEntry,
  regoLevel: '',
  regoTime: '',
  dealt: 'Dealer',
  featured: true,
}))

export const event = {
  path: '/events/npl-super-series-2026',
  tour: 'NPL',
  title: 'Super Series 2026',
  dates: 'Nov 19 – Nov 22, 2026',
  start: '2026-11-19',
  end: '2026-11-22',
  presentedBy: '',
  venue: 'Club Willoughby',
  venueDetail: '26 Crabbes Ave, North Willoughby',
  city: 'Sydney, Australia',
  website: 'https://www.npl.com.au/SuperSeries',
  // NPL's square Main Event poster, at 800 wide on an 800×1000 canvas with
  // the bottom edge blurred out beneath it, so it fills the hero's 4:5.
  image: { src: '/images/events/npl-super-series.webp', width: 800, height: 1000 },
  buyInSub: 'entry + fee',
  seo: {
    title: 'NPL Super Series 2026 — $300,000 Main Event, Club Willoughby, Nov 19–22',
    description:
      'The National Poker League Super Series 2026 Main Event at Club Willoughby, North Willoughby: $300,000 guaranteed with a $100,000 guaranteed first prize, $1,150 entry with two re-entries, fully dealt. Three Day 1 flights from 19 to 21 November and Day 2 on 22 November, with NPL Credits accepted for entry.',
  },
  stats: [
    { value: '$300,000', label: 'Main Event guarantee' },
    { value: '$100,000', label: '1st prize guaranteed' },
    { value: '$1,150', label: 'Entry, two re-entries' },
    { value: '3', label: 'Day 1 flights' },
  ],
  notes: [
    'Gold rows are the Main Event: three Day 1 flights on 19, 20 and 21 November and Day 2 on 22 November. Day 2 is qualifiers only. Start times are to be confirmed by NPL; every event is dealer dealt.',
    'Buy-in shown as total, then entry + fee. NPL Credits, won over a league season at one credit to the dollar, can be used towards any Super Series entry except Day 2 of the Main Event; any balance is paid in cash or EFTPOS, and credits expire after each Super Series finals.',
    'There is no minimum number of league games to qualify: the Super Series is open to all. Super Series side events are to be announced.',
    "Schedule as published on NPL's Super Series page and subject to change. NPL's poster prints 18–22 November; check npl.com.au for side events and updates.",
  ],
  sponsors: [],
  schedule,
}
