// Poker Tours in Asia: the home-page carousel of Asian series this month. Rows
// were taken from the SoMuchPoker October 2026 calendar on 2026-10-03
// (data/somuchpoker-asia-2026-10.json has the same records, with the listing
// URL per series). The cards are plain: nothing here has a page on this site
// and they do not link out. Series marks live in public/images/tours/asia/
// (300×300 transparent PNGs, light on dark); flags in public/images/flags/.

/**
 * @typedef {object} AsiaTour
 * @property {string} name
 * @property {string} dates    "Oct 8 – Oct 19"
 * @property {string} country
 * @property {string} [place]  "City, Venue", when the listing gives one
 * @property {string} [prize]  the advertised guarantee, in the local currency;
 *   the card adds a rough AUD figure from `audRates`
 * @property {string} logoSrc  the series mark, 300×300
 */

export const asiaTours = {
  heading: 'Poker Tours in Asia',
  prevLabel: 'Previous tours',
  nextLabel: 'Next tours',
  /** 4:3 flag per country named in `items` */
  flags: {
    'South Korea': '/images/flags/kr.svg',
    Japan: '/images/flags/jp.svg',
    Malaysia: '/images/flags/my.svg',
    Philippines: '/images/flags/ph.svg',
    Vietnam: '/images/flags/vn.svg',
    Taiwan: '/images/flags/tw.svg',
    Macau: '/images/flags/mo.svg',
  },
  /**
   * Units of each currency per 1 AUD, for the rough "(~$5.3m)" beside a prize
   * pool. From open.er-api.com (free, no key) on 2026-10-03; the figures are
   * shorthand, so refresh only when a rate has moved a lot. A prize in a
   * currency missing here shows without the AUD figure.
   */
  audRates: {
    KRW: 936,
    MYR: 2.84,
    PHP: 43.5,
    TWD: 22.2,
    NTD: 22.2,
    VND: 18046,
    JPY: 110,
    HKD: 5.45,
    MOP: 5.62,
    USD: 0.695,
  },
  rows: [
    { key: 'dates', label: 'Dates' },
    { key: 'place', label: 'Venue' },
    { key: 'prize', label: 'Prize pool' },
  ],
  /** @type {AsiaTour[]} */
  items: [
    {
      name: 'APT Jeju 2026',
      dates: 'Sep 25 – Oct 7',
      country: 'South Korea',
      place: 'Jeju, LES A Casino',
      prize: '5B KRW',
      logoSrc: '/images/tours/asia/apt.png',
    },
    {
      name: 'U Series Championship Osaka Q3 2026',
      dates: 'Oct 2 – Oct 6',
      country: 'Japan',
      place: 'Osaka',
      logoSrc: '/images/tours/asia/usc.png',
    },
    {
      name: 'Super Cup 7 Incheon 2026',
      dates: 'Oct 8 – Oct 18',
      country: 'South Korea',
      place: 'Incheon',
      logoSrc: '/images/tours/asia/sc.png',
    },
    {
      name: 'JOPT 2026 Tokyo #03',
      dates: 'Oct 8 – Oct 12',
      country: 'Japan',
      place: 'Tokyo',
      logoSrc: '/images/tours/asia/jopt.png',
    },
    {
      name: 'Poker Dream 26 Malaysia',
      dates: 'Oct 8 – Oct 19',
      country: 'Malaysia',
      place: 'Pahang, Resorts World Genting',
      prize: '7.3M MYR',
      logoSrc: '/images/tours/asia/pd.png',
    },
    {
      name: 'APPT Championship 2026',
      dates: 'Oct 8 – Oct 19',
      country: 'Philippines',
      place: 'Manila, Okada Manila',
      prize: '126.3M PHP',
      logoSrc: '/images/tours/asia/appt.png',
    },
    {
      name: 'KPC Poker Series October 2026',
      dates: 'Oct 10 – Oct 21',
      country: 'South Korea',
      place: 'Jeju, LES A Casino',
      prize: '1.7B KRW',
      logoSrc: '/images/tours/asia/kpc-poker.png',
    },
    {
      name: 'QPC Circuit 2026',
      dates: 'Oct 12 – Oct 21',
      country: 'Vietnam',
      logoSrc: '/images/tours/asia/qpc.png',
    },
    {
      name: 'TMT Championship 2026',
      dates: 'Oct 16 – Oct 26',
      country: 'Taiwan',
      place: 'Taipei City, CTP Asia Poker Arena',
      prize: '48M NTD',
      logoSrc: '/images/tours/asia/tmt.png',
    },
    {
      name: 'USOP Grand Championship Vietnam 2026',
      dates: 'Oct 22 – Nov 4',
      country: 'Vietnam',
      place: 'Venue to be announced',
      prize: '160B VND',
      logoSrc: '/images/tours/asia/usop.png',
    },
    {
      name: 'MGM Poker Championship 2026',
      dates: 'Oct 23 – Nov 2',
      country: 'Macau',
      logoSrc: '/images/tours/asia/mgm.png',
    },
    {
      name: 'Jeju Poker Festival 2026',
      dates: 'Oct 28 – Nov 11',
      country: 'South Korea',
      place: 'Jeju',
      logoSrc: '/images/tours/asia/jpf.png',
    },
    {
      name: 'JOPT 2026 Osaka #02',
      dates: 'Oct 29 – Nov 3',
      country: 'Japan',
      place: 'Osaka',
      logoSrc: '/images/tours/asia/jopt.png',
    },
    {
      name: 'WPT Seoul 2026',
      dates: 'Oct 30 – Nov 9',
      country: 'South Korea',
      place: 'Incheon, Inspire Casino',
      prize: '1.3B KRW',
      logoSrc: '/images/tours/asia/wpt.png',
    },
    {
      name: 'The Labyrinth Trail – GOP Incheon 2026',
      dates: 'Oct 30 – Nov 8',
      country: 'South Korea',
      place: 'Incheon, Paradise City Incheon',
      prize: '643.8M KRW',
      logoSrc: '/images/tours/asia/gop.png',
    },
  ],
}
