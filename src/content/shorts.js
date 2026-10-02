// Shorts: vertical video cards in a horizontal scroll row. These are teasers
// only; no short has a page or a video behind it yet, so the cards do not link.
//
// Posters are generated artwork under public/images/shorts/, 360x640 WebP
// (2x the 180x320 card), named after the short's slug.

/**
 * @typedef {object} Short
 * @property {string} duration  "m:ss"
 * @property {string} title
 * @property {string} [posterSrc]
 */

export const shorts = {
  heading: 'Shorts',
  /** @type {Short[]} */
  items: [
    {
      duration: '0:30',
      title: "She had the tens... and wasn't going anywhere.",
      posterSrc: '/images/shorts/she-had-the-tens.webp',
    },
    {
      duration: '0:18',
      title: '"Chop?" ... "No chop."',
      posterSrc: '/images/shorts/no-chop.webp',
    },
    {
      duration: '0:19',
      title: 'Kings vs Jacks... and the flop made it worse.',
      posterSrc: '/images/shorts/kings-vs-jacks.webp',
    },
    {
      duration: '1:53',
      title: 'From first-time chip leader to Mystery Bounty champion.',
      posterSrc: '/images/shorts/mystery-bounty-champion.webp',
    },
    {
      duration: '1:06',
      title: 'The bubble had other plans.',
      posterSrc: '/images/shorts/bubble-other-plans.webp',
    },
    {
      duration: '1:12',
      title: 'A second trophy for a local hero.',
      posterSrc: '/images/shorts/second-trophy-local-hero.webp',
    },
    {
      duration: '0:46',
      title: 'Two outs. One river. One huge escape.',
      posterSrc: '/images/shorts/two-outs-one-river.webp',
    },
    {
      duration: '1:30',
      title: 'Three biggest pocket pairs. One massive pot.',
      posterSrc: '/images/shorts/three-biggest-pocket-pairs.webp',
    },
  ],
}
