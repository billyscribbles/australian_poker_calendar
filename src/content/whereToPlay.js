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
import { tourBrands } from './tourBrands.js'

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
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NSW', name: 'New South Wales' },
  { code: 'NT', name: 'Northern Territory' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'WA', name: 'Western Australia' },
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
    // Gambier Poker's home room: its weekly and monthly games, and (by its
    // past festivals) the October Pokerfest.
    name: 'The Globe Hotel',
    street: '6 Ferrers Street',
    suburb: 'Mount Gambier',
    city: 'mount-gambier',
    state: 'SA',
    postcode: '5290',
    tours: ['GAMBIER'],
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
  // World Pro Poker's two finals venues, from its own venue list.
  {
    name: 'Sunbury Bowls Club',
    street: '49 Riddell Road',
    suburb: 'Sunbury',
    city: 'melbourne',
    state: 'VIC',
    postcode: '3429',
    tours: ['WPP'],
  },
  {
    name: 'Westend Market Hotel',
    street: '47 McIntyre Road',
    suburb: 'Sunshine',
    city: 'melbourne',
    state: 'VIC',
    postcode: '3020',
    tours: ['WPP'],
  },
]

// Poker rooms with no series on the calendar: casino rooms and card clubs
// that deal cash games and weekly tournaments, so every state and territory
// has somewhere to play. Listed on this page only; the city and tour pages
// draw on the series venues above. Details are from each room's own site
// (2026-10-03).
//
// `mark` is the room's round icon: a tour code to borrow that poker brand's
// mark (Crown Poker, The Star Poker), or the room's own glyph from
// public/images/rooms with the colours sampled from its site.

/**
 * @typedef {object} RoomMark
 * @property {string} iconSrc  square glyph, drawn in a circle
 * @property {string} primary  the ring colour
 * @property {string} iconBg   the circle's backing
 */

/**
 * @typedef {Omit<Venue, 'city' | 'tours'> & {
 *   website: string,
 *   mark: string | RoomMark,
 * }} Room
 */

/** @type {Room[]} */
const rooms = [
  {
    // A pub, not a card room: "Home of Anzac Cup Poker and weekly tournaments"
    // (newmarkethotel.com.au, 2026-10-04).
    name: 'Newmarket Hotel',
    street: 'Corner Gardeners Road and Botany Road',
    suburb: 'Mascot',
    state: 'NSW',
    postcode: '2020',
    website: 'https://newmarkethotel.com.au/',
    // Initials tile: its logo is a wordmark with no square form.
    mark: {
      iconSrc: '/images/rooms/newmarket-hotel-icon.webp',
      primary: '#F5F2EB',
      iconBg: '#0E0E0E',
    },
  },
  {
    name: 'Casino Canberra',
    street: '21 Binara Street',
    suburb: 'Canberra',
    state: 'ACT',
    postcode: '2601',
    website: 'https://casinocanberra.com.au/poker-pit/',
    // Red diamond from Casino_Canberra_Icon.svg; backing is the site's #11171F.
    mark: {
      iconSrc: '/images/rooms/casino-canberra-icon.svg',
      primary: '#EB1C2D',
      iconBg: '#11171F',
    },
  },
  {
    name: 'Club Italia Sporting Club',
    street: '128-152 Furlong Road',
    suburb: 'North Sunshine',
    state: 'VIC',
    postcode: '3020',
    website: 'https://www.clubitaliasportingclub.com.au/',
    // The club's stacked script favicon, turned white on its dark grey.
    mark: {
      iconSrc: '/images/rooms/club-italia-sporting-club-icon.webp',
      primary: '#FFFFFF',
      iconBg: '#222222',
    },
  },
  {
    name: 'Country Club Tasmania',
    street: 'Country Club Avenue',
    suburb: 'Prospect Vale',
    state: 'TAS',
    postcode: '7250',
    website: 'https://countryclubtasmania.com.au/casino/',
    // The club suit from the wordmark SVG, cream on the club's green.
    mark: {
      iconSrc: '/images/rooms/country-club-tasmania-icon.svg',
      primary: '#FEFCDA',
      iconBg: '#00491E',
    },
  },
  {
    name: 'Crown Perth',
    street: 'Great Eastern Highway',
    suburb: 'Burswood',
    state: 'WA',
    postcode: '6100',
    website: 'https://www.crownperth.com.au/casino/table-games/crown-poker',
    mark: 'CROWN',
  },
  {
    name: 'Cyprus Poker Club (The Caxton Hotel)',
    street: '38 Caxton Street',
    suburb: 'Petrie Terrace',
    state: 'QLD',
    postcode: '4000',
    website: 'https://cypruspokerbrisbane.com/',
    // Its tile logo: gold laurels and cards on maroon.
    mark: {
      iconSrc: '/images/rooms/cyprus-poker-club-icon.webp',
      primary: '#D89858',
      iconBg: '#480808',
    },
  },
  {
    name: 'Lasseters',
    street: '93 Barrett Drive',
    suburb: 'Alice Springs',
    state: 'NT',
    postcode: '0870',
    website: 'https://www.lasseters.com.au/casino/table-games/texas-holdem/',
    // The circled L from logo-white.svg: gold ring, white script.
    mark: {
      iconSrc: '/images/rooms/lasseters-icon.svg',
      primary: '#A39161',
      iconBg: '#2E2E2E',
    },
  },
  {
    name: 'Matchroom Poker',
    street: '33 Shannon Place',
    suburb: 'Adelaide',
    state: 'SA',
    postcode: '5000',
    website: 'https://thematchroom.com.au/',
    // The pair of threes from the logo, on black; ring is the site's red.
    mark: {
      iconSrc: '/images/rooms/matchroom-poker-icon.webp',
      primary: '#E02633',
      iconBg: '#000000',
    },
  },
  {
    name: 'Mindil Beach Casino Resort',
    street: 'Gilruth Avenue',
    suburb: 'Darwin',
    state: 'NT',
    postcode: '0820',
    website: 'https://www.mindilbeachcasinoresort.com.au/casino/table-games/',
    // The spade-palm favicon on the resort's deep teal, ringed in its gold.
    mark: {
      iconSrc: '/images/rooms/mindil-beach-casino-resort-icon.webp',
      primary: '#A79655',
      iconBg: '#003531',
    },
  },
  {
    name: 'SkyCity Adelaide',
    street: 'North Terrace',
    suburb: 'Adelaide',
    state: 'SA',
    postcode: '5000',
    website: 'https://skycityadelaide.com.au/eat-and-drink/the-district/poker/',
    // The "s" cut from the header logo's SVG, white as the site draws it, on
    // black with the site's gold (#B38D2F) for the ring.
    mark: {
      iconSrc: '/images/rooms/skycity-adelaide-icon.svg',
      primary: '#B38D2F',
      iconBg: '#0E0909',
    },
  },
  {
    name: 'The Reef Hotel Casino',
    street: '35-41 Wharf Street',
    suburb: 'Cairns City',
    state: 'QLD',
    postcode: '4870',
    website: 'https://www.reefcasino.com.au/poker-texas-holdem/',
    // Its black seahorse-diamond icon, turned white on black.
    mark: {
      iconSrc: '/images/rooms/the-reef-hotel-casino-icon.webp',
      primary: '#FFFFFF',
      iconBg: '#000000',
    },
  },
  {
    name: 'The Star Brisbane',
    street: '33 William Street',
    suburb: 'Brisbane City',
    state: 'QLD',
    postcode: '4000',
    website: 'https://www.starpoker.com.au/brisbane',
    mark: 'STAR',
  },
]

// Pub poker leagues: free and low buy-in games in pubs and clubs, most
// nights. Their venues change week to week, so the page gives one card per
// league linking to its own venue finder rather than listing every pub.
// `code` borrows a calendar tour's mark for a league that also runs series;
// otherwise `mark` is the league's own, as for a room. Details are from each
// league's own site (2026-10-03).

/**
 * @typedef {object} League
 * @property {string} name
 * @property {string[]} states   STATES codes it plays in
 * @property {string} about      one line on how it runs, as its site puts it
 * @property {string} website    its venue finder or game list
 * @property {string} [code]     a calendarPage.tours code whose mark it shares
 * @property {RoomMark} [mark]   its own mark when it has no code
 */

/** @type {League[]} */
const leagueRows = [
  // From each league's own site (Bullets: its Facebook page) on 2026-10-04.
  // World Pro Poker and Gambier Poker also run series on the calendar.
  {
    name: 'World Pro Poker',
    code: 'WPP',
    states: ['VIC'],
    about:
      'Weekly $35 to $55 games at Melbourne pubs and clubs, from Darebin and Fawkner RSLs to Sunbury and Rosebud, where 1 in 10 qualify for its $80,000 finals.',
    website:
      'https://www.worldpropoker.com.au/index.php?option=com_content&view=article&id=3:venue-details-and-location&catid=22&Itemid=113',
  },
  {
    name: 'Gambier Poker',
    code: 'GAMBIER',
    states: ['SA'],
    about:
      'Wednesday and monthly Sunday games at the Globe Hotel, Mount Gambier, Thursdays at the Western Tavern and the Prince of Wales Hotel in Penola, and three series a year.',
    website: 'https://gambierpoker.com.au/',
  },
  {
    name: 'Australian Poker Series (APS)',
    states: ['NSW'],
    about:
      'League nights around Newcastle: Mondays at Kahibah Sports Club, Wednesday to Saturday at Valentine Bowling Club, and a $75 Mega Game on the third Sunday of each month.',
    website: 'https://apsnewcastle.com/',
    // Its gold APS frame on black, from apsnewcastle.com/assets/aps-logo.png.
    mark: {
      iconSrc: '/images/rooms/australian-poker-series-icon.webp',
      primary: '#E2B236',
      iconBg: '#000000',
    },
  },
  {
    name: 'Deep Stack Poker',
    states: ['QLD'],
    about:
      'Weekly $10 to $27 games at pubs and clubs across north Brisbane, Moreton Bay, the Sunshine Coast and Kingaroy, in seasons that feed a ladder and state finals.',
    website: 'https://www.deepstackpoker.com.au/deep-stack-poker-venues',
    // Initials tile: its only logo file is a 324px script wordmark, unreadable
    // in a circle. Red is the suits on its wristbands. Replace with a real mark.
    mark: {
      iconSrc: '/images/rooms/deep-stack-poker-icon.webp',
      primary: '#E8263A',
      iconBg: '#0E0E0E',
    },
  },
  {
    name: 'Bullets Poker League',
    states: ['TAS'],
    about:
      'Tournaments most nights across north and north-west Tasmania, including Burnie RSL and Devonport Football Club, in hold’em, Omaha and team formats.',
    // No working website (bulletspoker.com.au does not resolve).
    website: 'https://www.facebook.com/Bulletpokerleague/',
    // Its bullet-and-aces badge, from its Facebook profile picture.
    mark: {
      iconSrc: '/images/rooms/bullets-poker-league-icon.webp',
      primary: '#C9A13B',
      iconBg: '#000000',
    },
  },
  {
    name: 'Jacks Poker League (JPL)',
    states: ['NSW'],
    about:
      'Tuesday nights in the lounge bar at the Central Hotel Shellharbour, with a $1,000 guaranteed prize pool.',
    // No site or page of its own found; this is the venue's listing.
    website: 'https://www.centralhotelshellharbour.com.au/whats-on/jpl-jacks-poker-league-.html',
    // Initials tile: no league logo found. Replace with a real mark.
    mark: {
      iconSrc: '/images/rooms/jacks-poker-league-icon.webp',
      primary: '#DFA95A',
      iconBg: '#0E0E0E',
    },
  },
  // APL's own site states no figures; these are from its owner's page,
  // fullhousevenues.com.au/products/apl. States are those its venues and
  // series are in on this calendar and playapl.com's venue pages.
  {
    name: 'Australian Poker League (APL)',
    code: 'APL',
    states: ['NSW', 'QLD', 'SA', 'TAS', 'VIC'],
    about:
      'Australia’s first poker league, founded in 2005, with over 600 games a week in pubs and clubs. Weekly games lead to state finals, the APL Poker Tour and the APL Million.',
    website: 'https://playapl.com/',
  },
  {
    name: 'National Poker League (NPL)',
    code: 'NPL',
    states: ['NSW', 'QLD', 'SA', 'TAS', 'VIC'],
    about:
      'Free to join, with over 500 games a week in pubs and clubs: sign up at any NPL night. It also runs the Super Series and the Sydney Poker Open.',
    website: 'https://www.npl.com.au/Events/List',
  },
  {
    name: 'WPT League',
    code: 'WPTL',
    states: ['NSW', 'QLD'],
    about:
      'The World Poker Tour’s free-to-play pub league, with tournaments every night at 36 venues across Sydney, the Illawarra, the Hunter, the Gold Coast and Brisbane.',
    website: 'https://au.wptleague.com/venue.aspx',
  },
  {
    name: 'Kings Poker',
    code: 'KINGS',
    states: ['NSW'],
    about:
      'Weekly tournaments every day of the week at pubs and clubs around Sydney and Newcastle, with buy-ins from $20, plus its big series at the Kings Room.',
    website: 'https://kingspoker.com.au/venues',
  },
  {
    name: 'Check Raise Poker',
    code: 'CHECKRAISE',
    states: ['QLD'],
    about:
      'Low buy-in weekly tournaments, from $17, at pubs and clubs around Brisbane, Logan, Ipswich and the Gold Coast.',
    website: 'https://www.checkraisepoker.com.au/weeklypokerevents',
  },
  {
    name: 'Kings Queens Promotions (KQP)',
    states: ['QLD'],
    about:
      'Pub poker seven days a week at nine venues around north Brisbane and Moreton Bay, from Chermside and Lawnton to Redcliffe and Caboolture, plus quarterly Boost weekends.',
    website: 'https://playkqp.com.au/events/',
    mark: {
      iconSrc: '/images/rooms/kings-queens-promotions-icon.webp',
      primary: '#D8B888',
      iconBg: '#0B0B0B',
    },
  },
  {
    name: 'Pokermania',
    states: ['NSW'],
    about:
      'Pub and club poker around Sydney’s Sutherland Shire, inner west and Chatswood, seven days a week, with cash games as well as tournaments.',
    website: 'https://pokermania.com.au/',
    mark: {
      iconSrc: '/images/rooms/pokermania-icon.webp',
      primary: '#C81818',
      iconBg: '#FFFFFF',
    },
  },
  {
    name: 'Big Boyz Poker',
    states: ['NSW'],
    about:
      'Western Sydney league around Penrith, with poker seven days a week and monthly feature events at Kingswood Sports and St Marys Leagues Club.',
    website: 'https://bigboyzgroup.com/big-boyz-poker',
    mark: {
      iconSrc: '/images/rooms/big-boyz-poker-icon.webp',
      primary: '#E0A800',
      iconBg: '#0B0B0B',
    },
  },
  {
    name: 'Poker Nation',
    states: ['VIC'],
    about:
      'Melbourne pub poker four nights a week at Clayton Bowls Club, the Fitzroy Beer Garden and the Tungamah Hotel.',
    website: 'https://pokernation.com.au/events/',
    mark: {
      iconSrc: '/images/rooms/poker-nation-icon.webp',
      primary: '#E8C848',
      iconBg: '#082838',
    },
  },
  {
    name: 'Perth Poker League',
    states: ['WA'],
    about:
      'Cash games and tournaments seven days a week across 10 Perth venues, including five weekly dealer-dealt tournaments, with grand finals paying up to $50,000.',
    website: 'https://www.perthpokerleague.com.au/map',
    mark: {
      iconSrc: '/images/rooms/perth-poker-league-icon.webp',
      primary: '#842932',
      iconBg: '#2B2B2B',
    },
  },
  {
    name: 'West Coast Poker',
    states: ['WA'],
    about:
      'Dealer-dealt tournaments and cash games at partner clubs around Perth, in Gosnells and Canning Vale.',
    website: 'https://www.westcoast.poker/',
    mark: {
      iconSrc: '/images/rooms/west-coast-poker-icon.webp',
      primary: '#C8184A',
      iconBg: '#14121A',
    },
  },
  {
    name: 'The Poker Factory',
    states: ['WA'],
    about:
      'Tournaments and cash games at Perth bowling clubs: every Sunday afternoon at Doubleview Bowling Club, with a Wednesday game added in September.',
    website: 'https://thepokerfactory.com.au/events/',
    mark: {
      iconSrc: '/images/rooms/the-poker-factory-icon.webp',
      primary: '#3DA4A3',
      iconBg: '#0B0C0E',
    },
  },
  // No working website; its Facebook page is where it posts its games.
  {
    name: 'Full House Poker',
    states: ['WA'],
    about:
      'Cash games at Perth bowling clubs: Wednesdays at Bayswater Bowling and Recreation Club and Thursdays at Perth Bowling Club.',
    website: 'https://www.facebook.com/fullhousepokeraus',
    mark: {
      iconSrc: '/images/rooms/full-house-poker-icon.webp',
      primary: '#F8F8E8',
      iconBg: '#F8F8E8',
    },
  },
  {
    name: 'WA Poker League',
    states: ['WA'],
    about:
      'Perth’s league since 2006, with weekly $100 tournaments at the Scarborough, Yanchep and Innaloo sports clubs.',
    website: 'https://wapokerleague.com.au/venue_list.aspx',
    mark: {
      iconSrc: '/images/rooms/wa-poker-league-icon.webp',
      primary: '#F8D808',
      iconBg: '#080808',
    },
  },
]

const tourByCode = new Map(calendarPage.tours.map((tour) => [tour.code, tour]))

/**
 * @typedef {Venue & {
 *   id: string,
 *   address: string,
 *   website: string,
 *   operators: { code: string, name: string, website: string }[],
 *   mark?: RoomMark,
 * }} VenueCard
 */

/** @param {string} name */
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** @param {Venue} venue @returns {VenueCard} */
const toCard = (venue) => ({
  ...venue,
  id: slug(venue.name),
  address: `${venue.street}, ${venue.suburb} ${venue.state} ${venue.postcode}`,
  website: venue.website ?? tourByCode.get(venue.tours[0])?.website ?? '',
  operators: venue.tours.map((code) => {
    const tour = tourByCode.get(code)
    return { code, name: tour?.name ?? code, website: tour?.website ?? '' }
  }),
})

/**
 * A room's mark as the card draws it: a borrowed tour code resolves to that brand's icon.
 * @param {string | RoomMark} mark
 * @returns {RoomMark}
 */
const toMark = (mark) =>
  typeof mark === 'string'
    ? {
        iconSrc: tourByCode.get(mark)?.iconSrc ?? '',
        primary: tourBrands[mark]?.primary ?? '',
        iconBg: tourBrands[mark]?.iconBg ?? '',
      }
    : mark

/** @param {Room} room @returns {VenueCard} */
const roomCard = (room) => ({
  ...room,
  city: '',
  tours: [],
  id: slug(room.name),
  address: `${room.street}, ${room.suburb} ${room.state} ${room.postcode}`,
  operators: [],
  mark: toMark(room.mark),
})

/**
 * @typedef {League & { id: string }} LeagueCard
 */

/** @param {League} league @returns {LeagueCard} */
const leagueCard = (league) => ({ ...league, id: slug(league.name) })

/** Every venue as a card, in name order; content/cities.js and content/tourPages.js draw on it. */
export const venues = rows.map(toCard).sort((a, b) => a.name.localeCompare(b.name, 'en-AU'))

export const whereToPlay = {
  seo: {
    title: 'Where to Play Poker in Australia: Rooms & Venues by State',
    description:
      'Where to play poker in Australia, by state: casino poker rooms, card clubs and every venue hosting a series on the calendar, with addresses, operators and links.',
  },
  eyebrow: 'Where to play',
  title: 'Poker rooms and venues across Australia',
  intro:
    'Casino poker rooms, card clubs and every venue that hosts a series on the calendar, grouped by state, with the address and a link to the venue. Switch to poker leagues for free and low buy-in games in pubs.',
  /** The switch between the rooms list and the leagues list; rooms shows first. */
  tabs: {
    label: 'Show poker rooms or poker leagues',
    rooms: 'Poker rooms',
    leagues: 'Poker leagues',
  },
  /** Label for the state jump links above the list. */
  jumpLabel: 'Jump to a state',
  /** Visible labels over the state tiles and the city links. */
  stateNavHeading: 'Browse by state',
  cityNavHeading: 'Poker by city',
  operatorsLabel: 'Series by',
  visitLabel: 'Visit website',
  /** @param {number} count */
  countLabel: (count) => `${count} ${count === 1 ? 'venue' : 'venues'}`,
  /** @type {{ code: string, name: string, venues: VenueCard[] }[]} */
  states: STATES.map((state) => ({
    ...state,
    venues: [
      ...rows.filter((venue) => venue.state === state.code).map(toCard),
      ...rooms.filter((room) => room.state === state.code).map(roomCard),
    ].sort((a, b) => a.name.localeCompare(b.name, 'en-AU')),
  })).filter((state) => state.venues.length > 0),
  leagues: {
    id: 'leagues',
    heading: 'Poker leagues',
    intro:
      'Free and low buy-in poker in pubs and clubs, most nights of the week. Leagues move between venues often, so each one links to its own list of where it plays.',
    /** What a league is, for a reader who has only played at a casino or not at all. */
    explainer: {
      heading: 'What is a poker league?',
      points: [
        'A poker league runs Texas Hold’em tournaments in local pubs and clubs on set nights each week. It is the easiest way to start playing live poker: turn up, register with the host and take a seat.',
        'Some leagues are free to enter and play for points and prizes, with points building across a season towards finals and seats in bigger series. Others charge a small buy-in, from about $20, and pay out a prize pool on the night.',
        'A poker room is different: a casino or card club with its own dealers, cash games and tournaments most days. A league’s games are run by its hosts in each venue.',
      ],
    },
    statesLabel: 'Plays in',
    findLabel: 'Find a game',
    /** @param {number} count */
    countLabel: (count) => `${count} ${count === 1 ? 'league' : 'leagues'}`,
    /** @type {LeagueCard[]} */
    list: leagueRows.map(leagueCard).sort((a, b) => a.name.localeCompare(b.name, 'en-AU')),
  },
}
