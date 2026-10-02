// Shorts: vertical video cards in a horizontal scroll row.

/**
 * @typedef {object} Short
 * @property {string} duration  "m:ss"
 * @property {string} title
 * @property {string} href
 * @property {string} [posterSrc]
 */

export const shorts = {
  heading: 'Shorts',
  /** @type {Short[]} */
  items: [
    {
      duration: '0:30',
      title: "She had the tens... and wasn't going anywhere.",
      href: '/shorts/she-had-the-tens',
    },
    { duration: '0:18', title: '"Chop?" ... "No chop."', href: '/shorts/no-chop' },
    {
      duration: '0:19',
      title: 'Kings vs Jacks... and the flop made it worse.',
      href: '/shorts/kings-vs-jacks',
    },
    {
      duration: '1:53',
      title: 'From first-time chip leader to Mystery Bounty champion.',
      href: '/shorts/mystery-bounty-champion',
    },
    { duration: '1:06', title: 'The bubble had other plans.', href: '/shorts/bubble-other-plans' },
    {
      duration: '1:12',
      title: 'A second trophy for a local hero.',
      href: '/shorts/second-trophy-local-hero',
    },
    {
      duration: '0:46',
      title: 'Two outs. One river. One huge escape.',
      href: '/shorts/two-outs-one-river',
    },
    {
      duration: '1:30',
      title: 'Three biggest pocket pairs. One massive pot.',
      href: '/shorts/three-biggest-pocket-pairs',
    },
  ],
}
