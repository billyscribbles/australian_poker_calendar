// Featured News: the standout PokerNews stories. Every story, including
// these, is in liveNews.js; this is the hand-picked hero plus five.
//
// Links go out to pokernews.com; images are the articles' own share images
// under public/images/news/.

/**
 * @typedef {object} HeroArticle
 * @property {string} title
 * @property {string} excerpt
 * @property {string} href        absolute URLs open in a new tab
 * @property {string} date
 * @property {{ label: string, variant: 'filled' | 'outline' }[]} badges
 * @property {string} [imageSrc]
 * @property {string} [imageLabel]  placeholder caption while no image exists
 */

/**
 * @typedef {object} Article
 * @property {string} category
 * @property {string} date
 * @property {string} title
 * @property {string} href        absolute URLs open in a new tab
 * @property {string} [thumbSrc]
 */

export const featuredNews = {
  heading: 'Featured News',
  /** @type {HeroArticle} */
  hero: {
    title: 'Alex Thompson Goes Wire-to-Wire at WPT Australia Championship Final Table',
    excerpt:
      'Alex Thompson never lost his chip lead at the final table on his way to a WPT Australia Championship title.',
    href: 'https://www.pokernews.com/news/2026/10/alex-thompson-wins-wpt-australia-52518.htm',
    date: 'Oct 1',
    badges: [
      { label: 'PokerNews', variant: 'filled' },
      { label: 'Live Poker', variant: 'outline' },
    ],
    imageSrc: '/images/news/alex-thompson-wins-wpt-australia.webp',
  },
  /** @type {Article[]} */
  items: [
    {
      category: 'Industry',
      date: 'Sep 28',
      title: "Australia's Star Sydney Casino's Licence Suspension Extended to June 2027",
      href: 'https://www.pokernews.com/casino/news/2026/09/australia-star-sydney-casino-licence-suspension-extended-52481.htm',
      thumbSrc: '/images/news/australia-star-sydney-casino-licence-suspension-extended-thumb.webp',
    },
    {
      category: 'Live Poker',
      date: 'Sep 23',
      title: 'Cooper Feltham Wins WPT Prime Australia Championship',
      href: 'https://www.pokernews.com/news/2026/09/cooper-heltham-wpt-prime-australia-52449.htm',
      thumbSrc: '/images/news/cooper-heltham-wpt-prime-australia-thumb.webp',
    },
    {
      category: 'Live Poker',
      date: 'May 10',
      title: "'Rollercoaster Ride' Ends in Glory for Aussie Millions Champion Trayner",
      href: 'https://www.pokernews.com/news/2026/05/malcolm-trayner-wins-2026-aussie-millions-main-event-51230.htm',
      thumbSrc: '/images/news/malcolm-trayner-wins-2026-aussie-millions-main-event-thumb.webp',
    },
    {
      category: 'Stories',
      date: 'May 7',
      title: 'NBA Star Josh Giddey Makes Poker Debut at Aussie Millions',
      href: 'https://www.pokernews.com/news/2026/05/nba-star-josh-giddey-makes-poker-debut-at-aussie-millions-51207.htm',
      thumbSrc: '/images/news/nba-star-josh-giddey-makes-poker-debut-at-aussie-millions-thumb.webp',
    },
    {
      category: 'Interview',
      date: 'May 10',
      title: "Tony Hachem and the Australian Poker Tour is Reimagining Poker's Future",
      href: 'https://www.pokernews.com/news/2026/05/tony-hachem-australian-poker-tour-reimagining-the-future-51227.htm',
      thumbSrc: '/images/news/tony-hachem-australian-poker-tour-reimagining-the-future-thumb.webp',
    },
  ],
}
