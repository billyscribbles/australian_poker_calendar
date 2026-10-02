// Promotions: banner cards.

/**
 * @typedef {object} Promotion
 * @property {string} date
 * @property {string} title
 * @property {string} href
 * @property {string} [bannerSrc]
 */

export const promotions = {
  heading: 'Promotions',
  label: 'Promotion',
  /** @type {Promotion[]} */
  items: [
    {
      date: 'Sep 19',
      title: 'APC x APT Jeju Points Race: $1,000 in Prizes',
      href: '/promotions/apc-apt-jeju-points-race',
    },
    {
      date: 'Sep 15',
      title: 'Early Bird Bonus Chips: Register Early, Start With Up to 10% More',
      href: '/promotions/early-bird-bonus-chips',
    },
    {
      date: 'Sep 12',
      title: 'OSS XL: 8 Multi-Day Events, $9.725M GTD',
      href: '/promotions/oss-xl',
    },
  ],
}
