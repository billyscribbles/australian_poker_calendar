// Live Poker News: tournament reporting, rendered as a list of eight.

/**
 * @typedef {object} LiveNewsItem
 * @property {string} date
 * @property {string} event   the series the report belongs to
 * @property {string} title
 * @property {string} href
 * @property {string} [thumbSrc]
 */

export const liveNews = {
  heading: 'Live Poker News',
  cta: { label: 'Read More Live Poker News', to: '/news/live' },
  /** @type {LiveNewsItem[]} */
  items: [
    {
      date: '2026.10.01',
      event: 'APT Jeju 2026',
      title: 'Superstar Challenge Sets New Record as Career-Best Score Lands in Jeju',
      href: '/news/live/superstar-challenge-record',
    },
    {
      date: '2026.10.01',
      event: 'APT Jeju 2026',
      title: 'Day 6: Main Event Hits 1,375 Entries as 198 Return for Day 3',
      href: '/news/live/apt-jeju-day-6',
    },
    {
      date: '2026.09.30',
      event: 'WPT Australia 2026',
      title: 'WPT Australia Championship Decided for AUD 450,900',
      href: '/news/live/wpt-australia-championship-decided',
    },
    {
      date: '2026.09.30',
      event: 'Jeju Poker Festival 2026',
      title: 'Jeju Poker Festival 2026: Free Transfers, Hotels, Packages & Leisure',
      href: '/news/live/jeju-poker-festival-packages',
    },
    {
      date: '2026.09.30',
      event: 'APT Jeju 2026',
      title: 'Day 5: Main Event Surpasses 1,100 Entries',
      href: '/news/live/apt-jeju-day-5',
    },
    {
      date: '2026.09.30',
      event: 'WPT Australia 2026',
      title: 'Final Six Set for the WPT Championship Event Final Table',
      href: '/news/live/wpt-australia-final-six',
    },
    {
      date: '2026.09.30',
      event: 'GOP Taipei 2026',
      title: 'Who Won What? Looking Back at The Trial of Wisdom',
      href: '/news/live/gop-taipei-trial-of-wisdom',
    },
    {
      date: '2026.09.29',
      event: 'APT Jeju 2026',
      title: 'Day 4: Superstar Challenge Breaks Record as Main Event Reaches 759 Entries',
      href: '/news/live/apt-jeju-day-4',
    },
  ],
}
