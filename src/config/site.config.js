// Single source of truth for brand identity, nav, SEO, integrations.
// Edit this file, not the components, to change any of them.

export const site = {
  brand: {
    name: 'Australian Poker Calendar',
    logoText: 'Australian Poker Calendar',
    tagline:
      'Australian Poker Calendar is your home for Australian and Asia-Pacific poker: live tournament coverage, the full events calendar, player interviews and local venue guides.',
    // Gold wordmark on a transparent background. The header shows it at
    // 72px tall and the footer at 52px, so this is a 720px (2x) cut of the
    // 1709×341 master logo-v2.png: 15 KB instead of 283 KB on every page's
    // critical path, which on a phone was what the hero image queued behind.
    logoSrc: '/brand/logo-v2-720.png',
    logoWidth: 720,
    logoHeight: 144,
  },

  // Header tabs. `icon` names an entry in NAV_ICONS (src/components/Navbar.jsx),
  // which maps it to a Lucide glyph. News is the home route, so it reads as
  // active on "/".
  nav: [
    { label: 'News', icon: 'news', to: '/' },
    { label: 'Poker Calendar', icon: 'calendar', to: '/poker-calendar/2026' },
    { label: 'Poker Players', icon: 'players', to: '/players' },
  ],
  // The hamburger that stands in for the tabs on a phone (see Navbar.css).
  navMenu: {
    label: 'Main navigation',
    open: 'Open menu',
    close: 'Close menu',
  },

  footer: {
    about: { label: 'About us', to: '/about' },
    newsletter: {
      heading: 'Subscribe to our newsletter',
      placeholder: 'Your email',
      button: 'Subscribe',
    },
    followHeading: 'Follow Us',
    columns: [
      {
        title: 'We have everything you need!',
        links: [
          { label: 'Poker Rules', to: '/how-to-play' },
          { label: 'Poker Calendar', to: '/poker-calendar/2026' },
          { label: 'Poker Players', to: '/players' },
          { label: 'Poker Tours in Asia', to: '/guides' },
          { label: 'Why Trust Us', to: '/about' },
          { label: 'Responsible Gambling', to: '/responsible-gambling' },
          { label: 'RSS Feed', to: '/rss' },
        ],
      },
    ],
    copyright: 'Copyright © 2026 All Rights Reserved',
    legal: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms & Conditions', to: '/terms' },
    ],
    responsible: ['18+', 'Play responsibly', 'GambleAware', 'GamCare'],
  },

  // Rendered as circular icon buttons in the footer, in this order.
  social: {
    youtube: 'https://www.youtube.com/',
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    twitter: 'https://x.com/',
  },

  contact: {
    email: 'info@australianpokercalendar.com',
    phone: '',
    location: '',
  },

  seo: {
    defaultTitle: 'Australian Poker Calendar — Poker Schedule, Events & News',
    titleTemplate: '%s · Australian Poker Calendar',
    description:
      "Australia's poker calendar: the full poker tournament schedule with every series and event, dates, venues and buy-ins, plus poker news, player rankings and promotions.",
    // The home document's h1. The design has no visible page title, so it is
    // read by crawlers and screen readers only; it names the site and what the
    // site is for.
    homeHeading: 'Australian Poker Calendar: Poker Tournament Schedule, Events & News',
    // Other names the site goes by, for the WebSite record's alternateName.
    alternateNames: ['APC'],
    siteUrl: import.meta.env.VITE_SITE_URL || 'https://example.com',
    // A real 1200x630 PNG. The build FAILS on an SVG or a wrong-shaped file, and
    // fails again if this placeholder is still here when VITE_SITE_URL is a real
    // domain — see assertOgImage in scripts/prerender.mjs.
    ogImage: '/brand/og-image.png',
    locale: 'en_AU',
  },

  integrations: {
    formspreeId: import.meta.env.VITE_FORMSPREE_ID || '',
    gaId: import.meta.env.VITE_GA_ID || '',

    // Ask before loading analytics, and show a cookie banner to ask with.
    //
    // ON for this site. GA4 (and its `_ga` cookies) loads only after the
    // visitor accepts; the footer's "Cookie settings" control reopens the
    // banner so the choice can be changed. Copy lives in src/content/consent.js
    // and the cookie list in the Cookies section of src/content/legal.js.
    // Nothing is tracked until VITE_GA_ID is set in .env.
    consent: true,
  },
}
