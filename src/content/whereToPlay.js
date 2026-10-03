// Where to play: every venue a series on the calendar is dealt at, grouped by
// state, with its street address and a link out. Taken from the venue record
// on each series in data/poker-series-timeline.json (2026-10-02); the two NPL
// clubs are from NPL's own series pages. Add a row here when an operator
// announces a new stop.
//
// `tours` names the operators that run series at the venue, keyed against
// calendarPage.tours, so the card can show each room's own mark and link to
// it. `website` is the venue's own site where the listing had one; a venue
// without one links to the operator that plays there instead.

import { calendarPage } from './calendarPage.js'

/**
 * @typedef {object} Venue
 * @property {string} name
 * @property {string} street
 * @property {string} suburb
 * @property {string} state     one of STATES' codes
 * @property {string} city      slug of the city page in content/cities.js the venue sits in
 * @property {string} postcode
 * @property {string[]} tours   codes in calendarPage.tours, first is the main operator
 * @property {string} [website] the venue's own site; omitted when the listing had none
 */

/** The states that have a venue, in the order the page lists them. */
export const STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'SA', name: 'South Australia' },
  { code: 'VIC', name: 'Victoria' },
]

/** @type {Venue[]} */
const rows = [
  // New South Wales
  {
    name: 'Bankstown Sports Club',
    street: '8 Greenfield Parade',
    suburb: 'Bankstown',
    city: 'sydney',
    state: 'NSW',
    postcode: '2200',
    tours: ['PALACE'],
  },
  {
    name: 'Bexley RSL',
    street: '24 Stoney Creek Road',
    suburb: 'Bexley',
    city: 'sydney',
    state: 'NSW',
    postcode: '2207',
    tours: ['NPL'],
  },
  {
    name: 'Blackbutt Hotel',
    street: '80 Orchardtown Road',
    suburb: 'New Lambton',
    city: 'newcastle',
    state: 'NSW',
    postcode: '2305',
    tours: ['KINGS'],
  },
  {
    name: 'Canterbury Hurlstone Park RSL',
    street: '10-26 Canterbury Road',
    suburb: 'Hurlstone Park',
    city: 'sydney',
    state: 'NSW',
    postcode: '2193',
    tours: ['APL', 'APLPT'],
  },
  {
    name: 'Churchills Sports Bar',
    street: '536 Anzac Parade',
    suburb: 'Kingsford',
    city: 'sydney',
    state: 'NSW',
    postcode: '2032',
    tours: ['KINGS'],
  },
  // Poker Palace's home room. Its Doltone House series is in the same
  // building at the same address, so it is one venue here.
  {
    name: 'Club Marconi',
    street: '121-133 Prairie Vale Road',
    suburb: 'Bossley Park',
    city: 'sydney',
    state: 'NSW',
    postcode: '2176',
    tours: ['PALACE'],
  },
  {
    name: 'Club Willoughby',
    street: '26 Crabbes Avenue',
    suburb: 'Willoughby',
    city: 'sydney',
    state: 'NSW',
    postcode: '2068',
    tours: ['NPL'],
  },
  {
    name: 'Commercial Club Albury',
    street: '618 Dean Street',
    suburb: 'Albury',
    city: 'albury',
    state: 'NSW',
    postcode: '2640',
    tours: ['APLPT'],
  },
  {
    name: 'Revesby Workers’ Club',
    street: '2B Brett Street',
    suburb: 'Revesby',
    city: 'sydney',
    state: 'NSW',
    postcode: '2212',
    tours: ['APT'],
    website: 'https://rwc.org.au/',
  },
  {
    name: 'SS&A Albury',
    street: '570-582 Olive Street',
    suburb: 'Albury',
    city: 'albury',
    state: 'NSW',
    postcode: '2640',
    tours: ['APLPT'],
  },
  {
    name: 'St George Leagues Club',
    street: '124 Princes Highway',
    suburb: 'Kogarah',
    city: 'sydney',
    state: 'NSW',
    postcode: '2217',
    tours: ['KINGS'],
  },
  {
    name: 'St Johns Park Bowling Club',
    street: '93 Edensor Road',
    suburb: 'St Johns Park',
    city: 'sydney',
    state: 'NSW',
    postcode: '2176',
    tours: ['AURUM'],
  },
  {
    name: 'The Star Sydney',
    street: '20-80 Pyrmont Street',
    suburb: 'Pyrmont',
    city: 'sydney',
    state: 'NSW',
    postcode: '2009',
    tours: ['STAR', 'APL'],
  },
  {
    name: 'Warilla Bowls and Recreation Club',
    street: 'Jason Avenue',
    suburb: 'Barrack Heights',
    city: 'wollongong',
    state: 'NSW',
    postcode: '2528',
    tours: ['WPTL'],
  },

  // Queensland
  {
    name: 'Broncos Club',
    street: '98 Fulcher Road',
    suburb: 'Red Hill',
    city: 'brisbane',
    state: 'QLD',
    postcode: '4059',
    tours: ['APLPT'],
  },
  {
    name: 'Brothers Leagues Club Cairns',
    street: '99-107 Anderson Street',
    suburb: 'Manunda',
    city: 'cairns',
    state: 'QLD',
    postcode: '4870',
    tours: ['APL'],
    website: 'https://www.brotherscairns.com.au/',
  },
  {
    name: 'Crowne Plaza Surfers Paradise',
    street: '2807 Gold Coast Highway',
    suburb: 'Surfers Paradise',
    city: 'gold-coast',
    state: 'QLD',
    postcode: '4217',
    tours: ['APT'],
    website: 'https://crowneplazasurfersparadise.com.au/',
  },
  {
    name: 'Eatons Hill Hotel',
    street: '646 South Pine Road',
    suburb: 'Eatons Hill',
    city: 'brisbane',
    state: 'QLD',
    postcode: '4037',
    tours: ['APT'],
  },
  {
    name: 'Queen B’s Poker',
    street: '100 York Street',
    suburb: 'Beenleigh',
    city: 'brisbane',
    state: 'QLD',
    postcode: '4207',
    tours: ['QUEENBS'],
    website: 'https://www.queenbs.poker/',
  },
  {
    name: 'Southport Sharks',
    street: 'Corner Olsen and Musgrave Avenues',
    suburb: 'Southport',
    city: 'gold-coast',
    state: 'QLD',
    postcode: '4215',
    tours: ['APLPT', 'APL'],
    website: 'https://www.southportsharks.com.au/',
  },
  {
    name: 'Springlake Hotel',
    street: '1 Springfield Lakes Boulevard',
    suburb: 'Springfield Lakes',
    city: 'brisbane',
    state: 'QLD',
    postcode: '4300',
    tours: ['CHECKRAISE'],
    website: 'https://springlakehotel.com.au/',
  },
  {
    name: 'The Star Gold Coast',
    street: '1 Casino Drive',
    suburb: 'Broadbeach',
    city: 'gold-coast',
    state: 'QLD',
    postcode: '4218',
    tours: ['STAR'],
    website: 'https://www.star.com.au/goldcoast/jupiters-gold-coast',
  },
  {
    name: 'The Ville Resort-Casino',
    street: 'Sir Leslie Thiess Drive',
    suburb: 'Townsville',
    city: 'townsville',
    state: 'QLD',
    postcode: '4810',
    tours: ['APL'],
  },
  {
    name: 'Wantima Country Club',
    street: '530 South Pine Road',
    suburb: 'Brendale',
    city: 'brisbane',
    state: 'QLD',
    postcode: '4500',
    tours: ['EMPIRE'],
    website: 'http://www.wantimacountryclub.com.au/',
  },

  // South Australia
  {
    name: 'Crowne Plaza Adelaide Mawson Lakes',
    street: '1-3 Metro Parade',
    suburb: 'Mawson Lakes',
    city: 'adelaide',
    state: 'SA',
    postcode: '5095',
    tours: ['APT'],
    website: 'https://www.ihg.com/crowneplaza/hotels/us/en/adelaide/adlml/hoteldetail',
  },
  {
    name: 'Mount Gambier Civic Centre',
    street: '10 Watson Street',
    suburb: 'Mount Gambier',
    city: 'mount-gambier',
    state: 'SA',
    postcode: '5290',
    tours: ['GAMBIER'],
  },
  {
    name: 'Stacked Social',
    street: '106 O’Connell Street',
    suburb: 'North Adelaide',
    city: 'adelaide',
    state: 'SA',
    postcode: '5006',
    tours: ['STACKED'],
    website: 'https://stackedsocial.com.au/',
  },
  {
    name: 'The Junction',
    street: '470 Anzac Highway',
    suburb: 'Camden Park',
    city: 'adelaide',
    state: 'SA',
    postcode: '5038',
    tours: ['APLPT'],
    website: 'https://www.mville.co/thejunction/',
  },

  // Victoria
  {
    name: 'Crown Melbourne',
    street: '8 Whiteman Street',
    suburb: 'Southbank',
    city: 'melbourne',
    state: 'VIC',
    postcode: '3006',
    tours: ['CROWN', 'APT'],
  },
  {
    name: 'Crowne Plaza Melbourne Carlton',
    street: '701 Swanston Street',
    suburb: 'Carlton',
    city: 'melbourne',
    state: 'VIC',
    postcode: '3053',
    tours: ['APT'],
    website: 'https://www.ihg.com/crowneplaza/hotels/gb/en/carlton/melcn/hoteldetail',
  },
  {
    name: 'Highways Springvale',
    street: 'Princes Highway and Corrigan Road',
    suburb: 'Springvale',
    city: 'melbourne',
    state: 'VIC',
    postcode: '3171',
    tours: ['APL'],
    website: 'https://highways.net.au/',
  },
  {
    name: 'Oakwood Premier Melbourne',
    street: '202 Normanby Road',
    suburb: 'Southbank',
    city: 'melbourne',
    state: 'VIC',
    postcode: '3006',
    tours: ['APT'],
    website: 'https://www.discoverasr.com/en/oakwood/australia/oakwood-premier-melbourne',
  },
  {
    name: 'PlayLive Melbourne',
    street: '129 York Street',
    suburb: 'South Melbourne',
    city: 'melbourne',
    state: 'VIC',
    postcode: '3205',
    tours: ['PLAYLIVE', 'MGA'],
    website: 'https://playlive.melbourne/',
  },
]

const tourByCode = new Map(calendarPage.tours.map((tour) => [tour.code, tour]))

/**
 * @typedef {Venue & {
 *   id: string,
 *   address: string,
 *   website: string,
 *   operators: { code: string, name: string, website: string }[],
 * }} VenueCard
 */

/** @param {Venue} venue */
const toCard = (venue) => ({
  ...venue,
  id: venue.name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  address: `${venue.street}, ${venue.suburb} ${venue.state} ${venue.postcode}`,
  website: venue.website ?? tourByCode.get(venue.tours[0])?.website ?? '',
  operators: venue.tours.map((code) => {
    const tour = tourByCode.get(code)
    return { code, name: tour?.name ?? code, website: tour?.website ?? '' }
  }),
})

/** Every venue as a card, in name order; content/cities.js and content/tourPages.js draw on it. */
export const venues = rows.map(toCard).sort((a, b) => a.name.localeCompare(b.name, 'en-AU'))

export const whereToPlay = {
  seo: {
    title: 'Where to Play Poker in Australia: Rooms & Venues by State',
    description:
      'Every poker room and venue hosting a tournament series on the Australian Poker Calendar, by state: addresses, the operators that play there and links to each room.',
  },
  eyebrow: 'Where to play',
  title: 'Poker rooms and venues across Australia',
  intro:
    'Every club, casino and card room that hosts a series on the calendar, grouped by state, with the address, the operators who deal there and a link to the venue.',
  /** Label for the state jump links above the list. */
  jumpLabel: 'Jump to a state',
  operatorsLabel: 'Series by',
  visitLabel: 'Visit website',
  /** @param {number} count */
  countLabel: (count) => `${count} ${count === 1 ? 'venue' : 'venues'}`,
  /** @type {{ code: string, name: string, venues: VenueCard[] }[]} */
  states: STATES.map((state) => ({
    ...state,
    venues: rows
      .filter((venue) => venue.state === state.code)
      .sort((a, b) => a.name.localeCompare(b.name, 'en-AU'))
      .map(toCard),
  })).filter((state) => state.venues.length > 0),
}
