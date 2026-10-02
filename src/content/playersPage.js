// Poker Players page. The rankings are not live yet: points are awarded per
// completed series once the operator's results are uploaded to The Hendon Mob,
// so until the first series of the season closes out there is nothing to rank.
// This file is the holding page's copy; the rankings table replaces it later.

export const playersPage = {
  seo: {
    title: 'Poker Player Rankings: Coming Soon',
    description:
      'Australian poker player rankings and stats are on the way. Points are awarded for every completed series, from results uploaded to The Hendon Mob.',
  },
  eyebrow: 'Poker Players',
  title: 'Poker player stats coming soon',
  intro:
    'We are building a season-long leaderboard of Australian live tournament players. Rankings go live once the first series of the season closes out.',

  how: {
    heading: 'How points will work',
    items: [
      {
        title: 'Awarded by series',
        body: 'Points are awarded when a series on the calendar is completed, not per event, so a deep run in one festival counts in full.',
      },
      {
        title: 'Sourced from The Hendon Mob',
        body: 'Results are taken from what the operator uploads to The Hendon Mob after each series. If a result is not on there, it does not score.',
      },
      {
        title: 'Updated as series finish',
        body: 'Each time a series on the poker calendar closes out and its results are uploaded, the standings are recalculated and published here.',
      },
    ],
  },

  source: {
    label: 'Results database',
    name: 'The Hendon Mob',
    href: 'https://pokerdb.thehendonmob.com/',
  },

  cta: { label: 'See the poker calendar', to: '/poker-calendar/2026' },
}
