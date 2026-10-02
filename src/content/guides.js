// Live Poker Guides: one card per country.

/**
 * @typedef {object} Guide
 * @property {string} country
 * @property {string} capital
 * @property {string} currency
 * @property {string} timezone
 * @property {string} href
 * @property {string} [imageSrc]
 */

export const guides = {
  heading: 'Live Poker Guides',
  cta: { label: 'More Poker Guides', to: '/guides' },
  rows: [
    { key: 'capital', label: 'Capital' },
    { key: 'currency', label: 'Currency' },
    { key: 'timezone', label: 'Timezone' },
  ],
  /** @type {Guide[]} */
  items: [
    {
      country: 'Malaysia',
      capital: 'Kuala Lumpur',
      currency: 'MYR',
      timezone: 'UTC+08:00',
      href: '/guides/malaysia',
    },
    {
      country: 'Philippines',
      capital: 'Manila',
      currency: 'PHP',
      timezone: 'UTC+08:00',
      href: '/guides/philippines',
    },
    {
      country: 'Singapore',
      capital: 'Singapore',
      currency: 'SGD',
      timezone: 'UTC+08:00',
      href: '/guides/singapore',
    },
    {
      country: 'Taiwan',
      capital: 'Taipei',
      currency: 'TWD',
      timezone: 'UTC+08:00',
      href: '/guides/taiwan',
    },
  ],
}
