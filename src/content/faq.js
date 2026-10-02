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
      q: 'Does Australian Poker Calendar cover global news, or does it only focus on Australia?',
      a: 'We focus on Australia. Our coverage is the Australian live scene: tournament series, poker rooms, player news and venue guides. Overseas events appear only when an Australian player is involved or a tour brings a stop here.',
    },
    {
      q: 'Where do the calendar dates come from, and how often are they updated?',
      a: 'Every series is taken from the operator’s own published schedule and checked against the venue. We update the calendar as operators confirm new stops, usually within a few days of an announcement.',
    },
    {
      q: 'Can tournament dates change after they are listed?',
      a: 'Yes. Operators occasionally move a series or add and drop side events, so treat the calendar as a planning guide and confirm with the venue before booking travel.',
    },
    {
      q: 'Is live poker legal in Australia?',
      a: 'Yes. Poker at licensed casinos and registered clubs is legal in every state and territory, and all of the venues on this site are licensed. You must be 18 or over to enter a poker room.',
    },
    {
      q: 'Do you cover online poker?',
      a: 'No. Australian Poker Calendar is about the live game: tournament series, poker rooms and the players who travel the circuit. We do not list or promote online poker sites.',
    },
    {
      q: 'Is Australian Poker Calendar affiliated with a casino or tour operator?',
      a: 'No. We are an independent publisher. Calendar listings are a paid placement for operators, and our editorial coverage is not tied to any one venue or tour.',
    },
    {
      q: 'How can I advertise with you or have my event covered?',
      a: 'Contact us with your event dates and venue. We offer live reporting, previews, recaps and sponsored placements.',
    },
  ],
}
