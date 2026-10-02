// Stories: short in-house features, rendered as a card grid. These are
// teasers only; none of them has a page yet, so the cards do not link.
//
// Images are generated artwork under public/images/stories/, 540x300 WebP,
// named after the story's slug.

/**
 * @typedef {object} Story
 * @property {string} date
 * @property {string} title
 * @property {string} [imageSrc]
 */

export const stories = {
  heading: 'Stories by Us',
  /** @type {Story[]} */
  items: [
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
