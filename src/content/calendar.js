// Poker Calendar sidebar: the next six series, from the Australian Poker
// Schedule series timeline (data/poker-series-timeline.json).

/**
 * @typedef {object} CalendarEntry
 * @property {string} day    two-digit day of month
 * @property {string} month  three-letter, uppercase
 * @property {string} name
 * @property {string} range  e.g. "2026.10.10 – 10.21"
 * @property {string} venue  city, venue
 * @property {string} href
 */

export const calendar = {
  heading: 'Poker Calendar',
  cta: { label: 'View Poker Calendar 2026', to: '/poker-calendar/2026' },
  /** @type {CalendarEntry[]} */
  items: [
    {
      day: '30',
      month: 'SEP',
      name: 'APT Melbourne Champs II',
      range: '2026.09.30 – 10.11',
      venue: 'Melbourne, Crown Melbourne (Metropol, Sky Bar 28)',
      href: '/events/apt-melbourne-champs-ii',
    },
    {
      day: '01',
      month: 'OCT',
      name: 'Aurum Sydney Showdown',
      range: '2026.10.01 – 10.19',
      venue: 'Sydney, St Johns Park Bowling Club',
      href: '/events/aurum-sydney-showdown',
    },
    {
      day: '06',
      month: 'OCT',
      name: 'APLPT Brisbane',
      range: '2026.10.06 – 10.11',
      venue: 'Brisbane, Broncos Club',
      href: '/events/aplpt-brisbane',
    },
    {
      day: '12',
      month: 'OCT',
      name: 'Victorian Poker Championship 2026',
      range: '2026.10.12 – 10.27',
      venue: 'Melbourne, Crown Poker Room',
      href: '/events/victorian-poker-championship-2026',
    },
    {
      day: '18',
      month: 'OCT',
      name: 'APL The Ville 600 Townsville',
      range: '2026.10.18 – 10.25',
      venue: 'Townsville, The Ville Resort-Casino',
      href: '/events/apl-the-ville-600-townsville',
    },
    {
      day: '27',
      month: 'OCT',
      name: 'Kings Poker Sydney Millions',
      range: '2026.10.27 – 11.09',
      venue: 'Sydney, St. George Leagues Club',
      href: '/events/kings-poker-sydney-millions',
    },
  ],
}
