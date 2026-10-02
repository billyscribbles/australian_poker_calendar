// One route table, three consumers.
//
// src/App.jsx builds the live router from it, src/entry-prerender.jsx renders a
// static HTML document per entry, and src/main.jsx uses it to warm the current
// route's chunk before hydrating. A route that is not in this file does not
// exist anywhere.
//
// Plain data, no JSX, so a build script can import it without a bundler.
//
// `module` repeats the path `load` imports, as a string Rollup's manifest can
// be keyed by. scripts/prerender.mjs uses it to find the CSS and JS chunk a
// route needs and links them from that route's document — without it the page
// paints against the entry stylesheet and reflows when its own CSS lands.
// src/test/routes.test.js asserts the two agree.

import { preload } from './lazyWithRetry.js'
import { festivals, YEARS } from './content/festivals.js'

/** The calendar document for `year`; CalendarPage's year switcher links these. */
export const calendarPath = (year) => `/poker-calendar/${year}`
import { venueForm } from './content/contact.js'

export const ROUTES = [
  {
    path: '/',
    // The LCP route. Statically imported by App.jsx rather than split into a
    // chunk, so the hero paints without a second round trip — which also means
    // it has no manifest entry of its own and needs no per-route asset tags.
    eager: true,
    module: 'src/pages/Home.jsx',
  },
  // One document per calendar year, for every year the series rows in
  // src/content/festivals.js touch; a new season's rows add its year.
  ...YEARS.map((year) => ({
    path: calendarPath(year),
    load: () => import('./pages/CalendarPage.jsx'),
    module: 'src/pages/CalendarPage.jsx',
    props: { year },
  })),
  // One page per series on the calendar, at the href content/festivals.js
  // derives from its name. content/eventPages.js resolves the path to a
  // hand-built poster where one exists, or to a hero-and-dates page with the
  // schedule pending where it does not.
  ...festivals.map((festival) => ({
    path: festival.href,
    load: () => import('./pages/EventPage.jsx'),
    module: 'src/pages/EventPage.jsx',
    props: { path: festival.href },
  })),
  // Every venue the series are dealt at, by state (content/whereToPlay.js).
  {
    path: '/where-to-play',
    load: () => import('./pages/WhereToPlayPage.jsx'),
    module: 'src/pages/WhereToPlayPage.jsx',
  },
  // Holding page until the first series' results are in. noindex while it has
  // no standings; drop the flag when the rankings table lands.
  {
    path: '/players',
    load: () => import('./pages/PlayersPage.jsx'),
    module: 'src/pages/PlayersPage.jsx',
    noindex: true,
  },
  {
    path: '/about',
    load: () => import('./pages/AboutPage.jsx'),
    module: 'src/pages/AboutPage.jsx',
  },
  {
    path: '/contact',
    load: () => import('./pages/ContactPage.jsx'),
    module: 'src/pages/ContactPage.jsx',
  },
  // The poker-room listing form. Its path is content/contact.js's to set, since
  // the footer band on every page links to it from there.
  {
    path: venueForm.path,
    load: () => import('./pages/ListVenuePage.jsx'),
    module: 'src/pages/ListVenuePage.jsx',
  },
  // Two documents, one template. `type` must match a key in src/content/legal.js.
  {
    path: '/privacy',
    load: () => import('./pages/LegalPage.jsx'),
    module: 'src/pages/LegalPage.jsx',
    props: { type: 'privacy' },
  },
  {
    path: '/terms',
    load: () => import('./pages/LegalPage.jsx'),
    module: 'src/pages/LegalPage.jsx',
    props: { type: 'terms' },
  },
  {
    path: '*',
    load: () => import('./pages/NotFoundPage.jsx'),
    module: 'src/pages/NotFoundPage.jsx',
    // StaticRouter needs a concrete location, so the catch-all prerenders as
    // /404. server/index.mjs serves that document with a real 404 status for
    // anything it cannot place.
    prerenderAs: '/404',
    noindex: true,
  },
]

/** Concrete paths that get a static HTML document at build time. */
export const PRERENDER_ROUTES = ROUTES.map((route) => ({
  ...route,
  out: route.prerenderAs || route.path,
}))

/** The ROUTES entry that owns `pathname`, falling back to the catch-all. */
export function matchRoute(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
  return ROUTES.find((route) => route.path === path) ?? ROUTES.find((route) => route.path === '*')
}

/**
 * Resolve the chunk `pathname` renders from.
 *
 * Called by main.jsx before hydrateRoot. An eager route has nothing to fetch
 * and resolves in a microtask.
 */
export function preloadRoute(pathname) {
  const route = matchRoute(pathname)
  return route?.load ? preload(route.load) : Promise.resolve()
}

/** Manifest ids whose CSS and JS a route's document should link. */
export function routeModules(pathname) {
  const route = matchRoute(pathname)
  // An eager route is compiled into the entry chunk, so its CSS is already in
  // the entry stylesheet and Rollup gives it no manifest entry to look up.
  return route && route.module && !route.eager ? [route.module] : []
}
