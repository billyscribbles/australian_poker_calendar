// "Featured in" partner strip. Each entry is a 150×56 logo box; `logoSrc`
// swaps the placeholder for the real mark.

/**
 * @typedef {object} Partner
 * @property {string} name
 * @property {string} [logoSrc]
 */

export const partners = {
  heading: "We've been featured in",
  /** @type {Partner[]} */
  items: [
    { name: 'WPT' },
    { name: 'APPT' },
    { name: 'USOP' },
    { name: 'APL' },
    { name: 'APT' },
    { name: 'RDPT' },
    { name: 'VIP GRINDERS' },
    { name: 'SPADEPOKER' },
    { name: 'PCA' },
  ],
}
