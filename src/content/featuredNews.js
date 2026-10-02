// Featured News: PokerNews' Australian coverage, newest first.
//
// Taken from the Google News results for "poker news australia" (first three
// pages, PokerNews stories only) on 2026-10-03. Every link goes out to the
// article on pokernews.com; the photos are the articles' own share images,
// resized into public/images/news/. The newest story is the hero and the rest
// are the list, with `initialCount` rows shown before "Show more".

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
  /** rows shown before the "Show more" button */
  initialCount: 7,
  showMore: 'Show more stories',
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
      category: 'PokerNews',
      date: 'Sep 28',
      title: "Australia's Star Sydney Casino's Licence Suspension Extended to June 2027",
      href: 'https://www.pokernews.com/casino/news/2026/09/australia-star-sydney-casino-licence-suspension-extended-52481.htm',
      thumbSrc: '/images/news/australia-star-sydney-casino-licence-suspension-extended-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'Sep 23',
      title: 'Cooper Feltham Wins WPT Prime Australia Championship',
      href: 'https://www.pokernews.com/news/2026/09/cooper-heltham-wpt-prime-australia-52449.htm',
      thumbSrc: '/images/news/cooper-heltham-wpt-prime-australia-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'Sep 18',
      title: 'Poker Hall of Famer Loses $50K Gambling Debt Case, But Is It Fair?',
      href: 'https://www.pokernews.com/news/2026/09/poker-hall-of-famer-loses-court-battle-over-unpaid-gambling-52420.htm',
      thumbSrc:
        '/images/news/poker-hall-of-famer-loses-court-battle-over-unpaid-gambling-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'Sep 2',
      title: "Who's Next? Meet the Last Four Players to Win WPT Australia",
      href: 'https://www.pokernews.com/news/2026/09/meet-the-last-four-wpt-australia-champions-52283.htm',
      thumbSrc: '/images/news/meet-the-last-four-wpt-australia-champions-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'Aug 17',
      title: 'WPT Australia Returns to Sydney With Two Championship Events',
      href: 'https://www.pokernews.com/news/2026/08/world-poker-tour-australia-full-schedule-52129.htm',
      thumbSrc: '/images/news/world-poker-tour-australia-full-schedule-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'Jun 28',
      title: 'The Irish Open Heads to Australia Aug. 31 for 15 Days of Juicy Poker Action',
      href: 'https://www.pokernews.com/news/2026/06/irish-open-heading-to-australia-51695.htm',
      thumbSrc: '/images/news/irish-open-heading-to-australia-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 19',
      title: 'Win a World Poker Tour Title Down Under at WPT Australia Festival',
      href: 'https://www.pokernews.com/news/2026/05/wpt-australia-festival-announced-51296.htm',
      thumbSrc: '/images/news/wpt-australia-festival-announced-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 10',
      title: '$10,600 Aussie Millions Main Event | 2026 Aussie Millions Poker Championship',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/10600-aussie-millions-main-event/',
      thumbSrc: '/images/news/aussie-millions-2026-pokernews-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 10',
      title: "'Rollercoaster Ride' Ends in Glory for Aussie Millions Champion Trayner",
      href: 'https://www.pokernews.com/news/2026/05/malcolm-trayner-wins-2026-aussie-millions-main-event-51230.htm',
      thumbSrc: '/images/news/malcolm-trayner-wins-2026-aussie-millions-main-event-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 10',
      title: 'Daily Tournament Highlights | 2026 Aussie Millions Poker Championship',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/daily/',
      thumbSrc: '/images/news/aussie-millions-2026-pokernews-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 10',
      title: "Tony Hachem and the Australian Poker Tour is Reimagining Poker's Future",
      href: 'https://www.pokernews.com/news/2026/05/tony-hachem-australian-poker-tour-reimagining-the-future-51227.htm',
      thumbSrc: '/images/news/tony-hachem-australian-poker-tour-reimagining-the-future-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 9',
      title: 'Final Table Set for the 2026 Aussie Millions Main Event',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/10600-aussie-millions-main-event/chips.815994.htm',
      thumbSrc:
        '/images/news/aussie-millions-2026-10600-aussie-millions-main-event-chips-815994-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 8',
      title: '$10,600 Aussie Millions Main Event Day 3 | 2026 Aussie Millions Poker Championship',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/10600-aussie-millions-main-event/day3/',
      thumbSrc: '/images/news/aussie-millions-2026-pokernews-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 7',
      title: 'Day 3 of Aussie Millions A$10,600 Main Event Kicks Off at 12:30 p.m.',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/10600-aussie-millions-main-event/chips.815498.htm',
      thumbSrc:
        '/images/news/aussie-millions-2026-10600-aussie-millions-main-event-chips-815498-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 7',
      title: 'NBA Star Josh Giddey Makes Poker Debut at Aussie Millions',
      href: 'https://www.pokernews.com/news/2026/05/nba-star-josh-giddey-makes-poker-debut-at-aussie-millions-51207.htm',
      thumbSrc: '/images/news/nba-star-josh-giddey-makes-poker-debut-at-aussie-millions-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 7',
      title: '$10,600 Aussie Millions Main Event Day 2 | 2026 Aussie Millions Poker Championship',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/10600-aussie-millions-main-event/day2/',
      thumbSrc: '/images/news/aussie-millions-2026-pokernews-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 7',
      title: 'Like It Never Went Away: 2026 Aussie Millions Main Event is Fifth-Largest Ever',
      href: 'https://www.pokernews.com/news/2026/05/aussie-millions-main-event-fifth-largest-ever-51203.htm',
      thumbSrc: '/images/news/aussie-millions-main-event-fifth-largest-ever-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 5',
      title: 'Final Starting Flight Set to Begin in Aussie Millions Main Event',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/10600-aussie-millions-main-event/chips.815060.htm',
      thumbSrc:
        '/images/news/aussie-millions-2026-10600-aussie-millions-main-event-chips-815060-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 5',
      title: '$25,000 Challenge | 2026 Aussie Millions Poker Championship',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/25000-challenge/',
      thumbSrc: '/images/news/aussie-millions-2026-pokernews-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 4',
      title: 'Kei Tanaka Surges into the Lead in Day 2 of $25k Challege',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/25000-challenge/chips.814713.htm',
      thumbSrc: '/images/news/aussie-millions-2026-25000-challenge-chips-814713-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 3',
      title: 'Aussie Millions Main Event Kicks Off Today at 12:30 p.m',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/10600-aussie-millions-main-event/chips.814022.htm',
      thumbSrc:
        '/images/news/aussie-millions-2026-10600-aussie-millions-main-event-chips-814022-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 3',
      title: '$5,000 Challenge | 2026 Aussie Millions Poker Championship',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/5000-challenge/',
      thumbSrc: '/images/news/aussie-millions-2026-pokernews-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'May 2',
      title: '$5,000 Challenge Payouts | 2026 Aussie Millions Poker Championship',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/5000-challenge/payouts.htm',
      thumbSrc: '/images/news/aussie-millions-2026-pokernews-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'Apr 30',
      title: '$1,500 Mystery Bounty | 2026 Aussie Millions Poker Championship',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/1500-mystery-bounty/',
      thumbSrc: '/images/news/aussie-millions-2026-pokernews-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'Apr 29',
      title: '$1,500 Mystery Bounty Payouts | 2026 Aussie Millions Poker Championship',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/1500-mystery-bounty/payouts.htm',
      thumbSrc: '/images/news/aussie-millions-2026-pokernews-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'Apr 24',
      title: 'Martinelli Among 60 Survivors as Opening Event Day 1A Draws 403 Entries',
      href: 'https://www.pokernews.com/tours/aussie-millions/2026-aussie-millions/daily/chips.812110.htm',
      thumbSrc: '/images/news/aussie-millions-2026-daily-chips-812110-thumb.webp',
    },
    {
      category: 'PokerNews',
      date: 'Apr 23',
      title: 'For the First Time in Six Years, Cards Are in the Air for Aussie Millions',
      href: 'https://www.pokernews.com/news/2026/04/aussie-millions-kicks-off-at-crown-melbourne-51109.htm',
      thumbSrc: '/images/news/aussie-millions-kicks-off-at-crown-melbourne-thumb.webp',
    },
  ],
}
