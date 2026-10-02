// Player Related News: portrait cards.

/**
 * @typedef {object} PlayerNewsItem
 * @property {string} date
 * @property {string} title
 * @property {string} href
 * @property {string} [portraitSrc]
 */

export const playerNews = {
  heading: 'Player Related News',
  cta: { label: 'More Player Related News', to: '/news/players' },
  /** @type {PlayerNewsItem[]} */
  items: [
    {
      date: '2026.09.20',
      title: "A Tour Director on Taipei's Return, Local Grinders and a Refined Structure",
      href: '/news/players/tour-director-taipei-return',
    },
    {
      date: '2026.09.18',
      title: "A Veteran Wants Poker's Character Back",
      href: '/news/players/veteran-wants-pokers-character-back',
    },
    {
      date: '2026.09.12',
      title: 'US Pro Ends 10-Year Wait at WPT Australia',
      href: '/news/players/us-pro-ends-10-year-wait',
    },
    {
      date: '2026.09.07',
      title: 'From Banking to the Asian Poker Scene',
      href: '/news/players/from-banking-to-asian-poker',
    },
  ],
}
