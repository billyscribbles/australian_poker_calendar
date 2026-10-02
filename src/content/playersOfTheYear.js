// Players of the Year standings sidebar.

/**
 * @typedef {object} PlayerStanding
 * @property {number} rank
 * @property {string} name
 * @property {string} country
 * @property {number} cashes
 * @property {string} points    formatted APC Index points
 * @property {string} earnings  formatted
 * @property {string} href
 * @property {string} [avatarSrc]
 */

export const playersOfTheYear = {
  heading: 'Players of the Year: 2026',
  indexLabel: 'APC Index',
  cta: { label: 'View 2026 Player Rankings', to: '/players' },
  /** @type {PlayerStanding[]} */
  items: [
    {
      rank: 1,
      name: 'Player One',
      country: 'Thailand',
      cashes: 94,
      points: '30,367',
      earnings: '$3,882,705',
      href: '/players/player-one',
    },
    {
      rank: 2,
      name: 'Player Two',
      country: 'China',
      cashes: 114,
      points: '30,282',
      earnings: '$2,712,535',
      href: '/players/player-two',
    },
    {
      rank: 3,
      name: 'Player Three',
      country: 'China',
      cashes: 136,
      points: '28,905',
      earnings: '$794,652',
      href: '/players/player-three',
    },
  ],
}
