// FAQ: three-line display heading (last line gold) and the accordion items.

/**
 * @typedef {object} FaqItem
 * @property {string} q
 * @property {string} a
 */

export const faq = {
  // Rendered one line each; the last line is coloured gold.
  headingLines: ['Frequently', 'asked', 'questions'],
  heading: 'Frequently asked questions',
  /** @type {FaqItem[]} */
  items: [
    {
      q: 'Does Australian Poker Calendar cover global news, or does it only focus on news from the Asian region?',
      a: 'We cover poker news from around the world, with a particular emphasis on the Asia-Pacific scene: live tournament coverage, player interviews and local guides.',
    },
    {
      q: 'Are there Australian Poker Calendar freerolls?',
      a: 'Yes. We regularly run exclusive freerolls and ticket giveaways for readers. Announcements are posted in the Promotions section.',
    },
    {
      q: 'How can I advertise with you or have my event covered?',
      a: 'Contact us with your event dates and venue. We offer live reporting, previews, recaps and sponsored placements.',
    },
  ],
}
