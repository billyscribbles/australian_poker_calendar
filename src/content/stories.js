// Stories by Us: in-house articles. The real ones are written in the
// dashboard (/admin → Publish → Stories) and reach the site through
// lib/runtimeContent.js; this file holds the section's strings and the demo
// cards shown while nothing has been published yet.
//
// Demo images are generated artwork under public/images/stories/, 540x300 WebP,
// named after the story's slug.

/**
 * @typedef {object} Story  a demo card
 * @property {string} date
 * @property {string} title
 * @property {string} [imageSrc]
 */

export const stories = {
  heading: 'Stories by Us',
  allLink: 'All stories',
  /** How many published stories the home page shows. */
  homeLimit: 8,
  path: '/stories',
  index: {
    title: 'Stories by Us',
    description:
      'Features, hands and reads from the Australian poker scene, written by the Australian Poker Calendar team.',
    intro: 'Features, hands and reads from the Australian poker scene, written by us.',
    empty: 'The first story is on its way.',
    /** Screen-reader heading over the grid, so the cards' h3s sit under an h2. */
    listHeading: 'Latest stories',
  },
  page: {
    eyebrow: 'Stories by Us',
    more: 'More stories',
    back: 'All stories',
  },
  /** @type {Story[]} */
  demo: [
    {
      date: 'Oct 2',
      title: 'The River Card That Changed Everything',
      imageSrc: '/images/stories/river-card.webp',
    },
    {
      date: 'Sep 29',
      title: 'Why Your Chip Stack Is Lying to You',
      imageSrc: '/images/stories/chip-stack.webp',
    },
    {
      date: 'Sep 26',
      title: 'Reading the Table Before the Flop',
      imageSrc: '/images/stories/table-read.webp',
    },
    {
      date: 'Sep 22',
      title: 'Pocket Aces: The Hand Everyone Fears',
      imageSrc: '/images/stories/pocket-aces.webp',
    },
    {
      date: 'Sep 18',
      title: 'Inside the Final Table Bubble',
      imageSrc: '/images/stories/final-table.webp',
    },
    {
      date: 'Sep 14',
      title: 'The Art of the Perfect Chip Riffle',
      imageSrc: '/images/stories/chip-riffle.webp',
    },
    {
      date: 'Sep 10',
      title: 'What the Dealer Sees That You Miss',
      imageSrc: '/images/stories/dealer-view.webp',
    },
    {
      date: 'Sep 6',
      title: 'Flop, Turn, River: Anatomy of a Cooler',
      imageSrc: '/images/stories/cooler.webp',
    },
  ],
}
