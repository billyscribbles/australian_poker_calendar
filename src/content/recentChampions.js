// Recent Champions: the latest Main Event winners on the calendar, newest first.
//
// No series has published a result through the site yet, so `items` is empty
// and the section shows `pending` instead. Add a card per champion as the
// operators publish them; `href` is the series' event page, derived the same
// way the calendar derives it (/events/<slug>).

/**
 * @typedef {object} Champion
 * @property {string} name
 * @property {string} event        the title won, e.g. "Main Event"
 * @property {string} series       the series it was part of; a festivals.js name
 * @property {string} date         day the final table finished
 * @property {string} prize        formatted first-place prize
 * @property {string} href
 * @property {string} [portraitSrc]
 */

export const recentChampions = {
  heading: 'Recent Champions',
  pending: {
    title: 'Coming soon',
    body: 'Main Event winners will appear here as each series on the calendar finishes and the operator publishes the result.',
  },
  cta: { label: 'See the poker calendar', to: '/poker-calendar/2026' },
  /** @type {Champion[]} */
  items: [],
}
