// GPI standings sidebar on the home page: the top five Australians on each GPI
// board, the GPI ranking first. The standings live in content/gpiRankings.js, shared
// with the full tables on /players.

import { gpiRankings } from './gpiRankings.js'

export const playersOfTheYear = {
  heading: 'GPI Rankings: Australia',
  tabsLabel: 'GPI rankings',
  pointsLabel: 'Points',
  sourceLabel: 'Rankings by',
  updatedLabel: 'Updated',
  source: gpiRankings.source,
  updated: gpiRankings.updated,
  updatedText: gpiRankings.updatedLabel,
  pending: {
    title: 'Coming soon',
    body: 'The standings return once GPI publishes its first weekly update of the season.',
  },
  cta: { label: 'Full Australian standings', to: '/players' },
  /** Each board cut to its first five; the page has the rest. */
  boards: gpiRankings.boards
    .filter((board) => board.standings.length)
    .map((board) => ({ ...board, standings: board.standings.slice(0, 5) })),
}
