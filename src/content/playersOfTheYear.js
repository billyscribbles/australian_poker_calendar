// Players of the Year standings sidebar.
//
// The rankings are not live yet (see content/playersPage.js for why), so
// `items` is empty and the sidebar shows `pending` instead. Fill `items` with
// the top three once the first series of the season scores and the card list
// takes over.

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
  pending: {
    title: 'Coming soon',
    body: 'The 2026 leaderboard goes live once the first series of the season closes out and its results are on The Hendon Mob.',
  },
  cta: { label: 'How the rankings will work', to: '/players' },
  /** @type {PlayerStanding[]} */
  items: [],
}
