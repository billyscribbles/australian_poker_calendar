// Poker Players page: the Australian Global Poker Index standings in full,
// the GPI ranking and the PoY 2026 race. The rows come from
// content/gpiRankings.js; this file is the page's copy.

import { gpiRankings } from './gpiRankings.js'

const { season, boards, womenBoards } = gpiRankings
const count = boards[0].standings.length
const board = (/** @type {string} */ id) => boards.find((b) => b.id === id) ?? boards[0]
const poyLeader = board('poy').standings[0]
const gpiLeader = board('gpi').standings[0]
const inGlobalTop1000 = board('gpi').standings.filter((p) => p.globalRank <= 1000).length

export const playersPage = {
  seo: {
    title: `Australian Poker Rankings: GPI and Player of the Year ${season}`,
    description: `The top ${count} Australians in the Global Poker Index ranking and the GPI Player of the Year ${season} race, with points and worldwide rank. Updated weekly.`,
  },
  eyebrow: 'Poker Players',
  title: 'Australian poker rankings',
  intro: `Where Australia's live tournament players stand on the Global Poker Index: the three-year GPI ranking and this year's Player of the Year race. The top ${count} on each, refreshed after every weekly GPI update.`,

  credit: {
    sourceLabel: 'Rankings by',
    updatedLabel: 'Last updated',
  },

  stats: [
    {
      label: 'GPI ranking leader',
      value: gpiLeader.name,
      detail: `${gpiLeader.points} pts · #${gpiLeader.globalRank} worldwide`,
    },
    {
      label: `PoY ${season} leader`,
      value: poyLeader.name,
      detail: `${poyLeader.points} pts · #${poyLeader.globalRank} worldwide`,
    },
    {
      label: 'In the global GPI top 1,000',
      value: `${inGlobalTop1000} Australians`,
      detail: `of the ${count} ranked here`,
    },
  ],

  tabsLabel: 'GPI rankings',
  search: {
    label: 'Search players',
    placeholder: 'Search by player name',
    count: (/** @type {number} */ shown, /** @type {number} */ total) =>
      shown === total ? `${total} players` : `${shown} of ${total} players`,
    empty: (/** @type {string} */ query) => `No ranked player matches “${query}”.`,
  },
  womenOnly: {
    label: 'Female only',
  },
  podium: {
    label: (/** @type {string} */ title) => `${title}: top three`,
    points: 'pts',
  },
  table: {
    caption: (/** @type {string} */ title) => `Australian ${title} standings`,
    columns: { rank: 'Rank', player: 'Player', points: 'Points' },
    otherRank: (/** @type {string} */ label) => `${label} rank`,
    unranked: (/** @type {string} */ label) => `Not ranked on ${label}`,
  },

  how: {
    heading: 'GPI or PoY: what is the difference?',
    items: [
      {
        title: 'GPI ranking',
        body: 'A rolling ranking of the last three years of live results, with recent results counting for more than older ones. It measures sustained form, so it moves more slowly.',
      },
      {
        title: `Player of the Year ${season}`,
        body: `Counts only results from this calendar year, so it resets on 1 January. It answers who is having the best ${season}, and a strong few months can take someone to the top.`,
      },
      {
        title: 'Same scoring, updated weekly',
        body: 'Both score every eligible cash on finish, field size and buy-in. GPI recalculates once a week; the date above is their latest update, and each name links to the player’s GPI profile.',
      },
    ],
  },

  source: gpiRankings.source,
  updated: gpiRankings.updated,
  updatedText: gpiRankings.updatedLabel,
  boards,
  womenBoards,

  cta: { label: 'See the poker calendar', to: '/poker-calendar/2026' },
}
