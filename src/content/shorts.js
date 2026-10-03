// Shorts: vertical video cards in a horizontal scroll row. The real ones are
// uploaded in the dashboard (/admin → Publish → Shorts) and reach the site
// through lib/runtimeContent.js; a published short plays in an overlay. This
// file holds the section's strings and the demo cards shown until then.
//
// Demo posters are generated artwork under public/images/shorts/, 360x640 WebP
// (2x the 180x320 card), named after the short's slug.

/**
 * @typedef {object} Short  a demo card
 * @property {string} duration  "m:ss"
 * @property {string} title
 * @property {string} [posterSrc]
 */

export const shorts = {
  heading: 'Shorts',
  homeLimit: 8,
  play: 'Play',
  close: 'Close video',
  /** @type {Short[]} */
  demo: [
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
