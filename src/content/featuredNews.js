// Featured News: one hero article plus a list of five.

/**
 * @typedef {object} HeroArticle
 * @property {string} title
 * @property {string} excerpt
 * @property {string} href
 * @property {{ label: string, variant: 'filled' | 'outline' }[]} badges
 * @property {string} [imageSrc]
 * @property {string} [imageLabel]  placeholder caption while no image exists
 */

/**
 * @typedef {object} Article
 * @property {string} category
 * @property {string} date
 * @property {string} title
 * @property {string} href
 * @property {string} [thumbSrc]
 */

export const featuredNews = {
  heading: 'Featured News',
  /** @type {HeroArticle} */
  hero: {
    title: 'Record-Breaking APT Jeju Superstar Challenge Crowns a Ten-Time Champion',
    excerpt:
      'A heads-up battle for the biggest Superstar Challenge prize pool in APT history ends with a career-best KRW 451.7M score.',
    href: '/news/apt-jeju-superstar-challenge-record',
    badges: [
      { label: 'Live Poker', variant: 'filled' },
      { label: 'Recap', variant: 'outline' },
    ],
    imageLabel: 'hero photo: champion with trophy',
  },
  /** @type {Article[]} */
  items: [
    {
      category: 'Live Poker',
      date: '2026.09.30',
      title: 'WPT Australia 2026 Championship Decided After 527-Entry Field',
      href: '/news/wpt-australia-2026-championship-decided',
    },
    {
      category: 'Live Poker',
      date: '2026.09.23',
      title: 'Jeju Poker Festival 2026: Hotels, Transfers and Packages Explained',
      href: '/news/jeju-poker-festival-2026-packages',
    },
    {
      category: 'Live Poker',
      date: '2026.09.22',
      title: 'WPT Australia Championship: Final Six Set at The Star Sydney',
      href: '/news/wpt-australia-final-six',
    },
    {
      category: 'Strategy',
      date: '2026.09.16',
      title: '[Poker Basics] Target Stack and Timed Tournaments: The Complete Guide',
      href: '/news/poker-basics-target-stack-timed-tournaments',
    },
    {
      category: 'Stories',
      date: '2026.09.14',
      title: 'The Psychological Trap: When a Massive Stack Bursts the Bubble',
      href: '/news/psychological-trap-massive-stack-bubble',
    },
  ],
}
