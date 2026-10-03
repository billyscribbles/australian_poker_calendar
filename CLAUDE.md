# CLAUDE.md — Australian Poker Calendar

This repo is the **Australian Poker Calendar** site: poker news, the Australian
and Asia-Pacific tournament calendar, player rankings and venue guides. It is a
live project, not a template. Work here is on this site's content, pages and
data.

The repo is Billy's (Onrai Studio) build, on the studio's standard React + Vite
prerender stack. The engineering rules below are the parts of that stack that
are load-bearing. Break them and the site silently stops being crawlable.

---

## Tech stack (do not change without asking)

- React 18 + Vite 5, JSX only, **no TypeScript**
- React Router v7 (SPA, BrowserRouter, lazy-loaded pages) driven by one route table, `src/routes.js`
- **Build-time prerender**: every route ships as a real HTML document that React hydrates
- Plain CSS with CSS variables, **no Tailwind** or CSS-in-JS
- Framer Motion 11, Lucide React icons
- Yarn 4 with `.pnp` caching, Node 22 (`.nvmrc`)
- `react-helmet-async` for per-page SEO; the forms post to the site's own `/api/enquiry`, which saves them and emails them on through Formspree
- Railway deployment: `yarn start` runs `server/index.mjs`, a dependency-free Node static server (NOT `vite preview`). It also answers the forms, counts page views, serves the dashboard and renders the published stories live; `server/store.mjs` keeps enquiries, the daily traffic tally, and the dashboard's stories, shorts and uploaded media under `DATA_DIR` (`.data/` locally, a volume on Railway, required: without it a redeploy erases every published story)
- `tinymce@6.8.6` (MIT; never 7 or later, which is GPL or paid) is the dashboard's article editor, served from the package by `admin/handler.mjs` and marked `unplugged` in `package.json` so PnP leaves real files on disk
- ESLint flat config + Prettier; Vitest contract suite with axe
- GitHub Actions CI: lint, format check, test, build, Lighthouse gate
- Opt-in GA4 behind a consent banner (`integrations.consent: true`) and opt-in Sentry; both no-op until env keys are set

## The three config layers

Components are dumb. They contain zero site strings, colours or links.

1. **`src/config/theme.config.js`** — design tokens, the "Midnight & Gold" palette from the design handoff. `src/lib/applyTheme.js` flattens it to CSS custom properties on `:root` at boot, so CSS uses `var(--color-accent)` etc. Fonts named in `fonts` must also be listed in `googleFonts`; `vite.config.js` injects the links and `src/test/config.test.js` fails on a family declared but never fetched.
2. **`src/config/site.config.js`** — brand, nav, footer, social, SEO defaults, contact, integrations. Uses `import.meta.env`, so plain Node cannot import it.
3. **`src/content/*.js`** — one file per section. Section components import directly from their content file. No prop drilling, no context.

`src/config/server.config.js` is the fourth file: what `server/index.mjs` needs as literal data with no bundler involvement. `canonicalHost` (`'apex'`, `'www'` or `null`; the other host 301s on every path), `legacyRedirects` (301s for old URLs) and `cspExtra` (extra Content-Security-Policy sources for any embed; without an entry the browser blocks it silently, in production only).

## Directory map

```
src/
├── routes.js             THE route table: router, prerender, sitemap and preload read it
├── entry-prerender.jsx   build-time entry: renders each route to a string
├── lazyWithRetry.js      lazy pages that render synchronously once loaded
├── config/               theme.config.js, site.config.js, server.config.js
├── content/              festivals.js (the calendar rows), calendarPage.js, calendar.js,
│                         tourBrands.js, events.js, news sections, players,
│                         guides, pokerRooms, partners, faq, consent, legal
├── lib/                  applyTheme, seo.jsx, motion, calendar.js (date/layout maths),
│                         useToday, useHydrated, consent, analytics, errorReporter,
│                         runtimeContent (published stories/shorts), dates
├── components/           Navbar, Footer, EventsBanner, FeaturedNews, Stories, Shorts,
│                         LiveNews, PokerCalendar, FestivalCalendar/List/Timeline,
│                         RecentChampions, PlayersOfTheYear, Guides, FAQ,
│                         PokerRooms, TourLogo, ConsentBanner, Contact, ...
├── pages/                Home, CalendarPage, PlayersPage, AboutPage, ContactPage,
│                         StoriesPage, StoryPage, LegalPage, NotFoundPage
└── test/                 the contract suite
data/                     scraped series timeline (json/csv), one series schedule, promo HTML
public/brand/             wordmark, favicon set (yarn icons), og card
public/images/tours/      operator logos: full colour, icon, and -mono (scripts/gen-tour-mono.py)
scripts/                  prerender.mjs, gen-seo-files.mjs, gen-icons.mjs, gen-tour-mono.py,
                          series-status.mjs (the status model behind `yarn status` and admin/),
                          lib/document.mjs (document assembly shared with server/render.mjs)
admin/                    the dashboard at /admin (handler.mjs, mounted by the site and dev servers;
                          publish.js + publish.css are the Publish section's editors)
server/index.mjs          production server: prerendered docs, live pages, media, real 404s, CSP
server/api.mjs            POST /api/enquiry: saves the form submission, forwards it to Formspree
server/store.mjs          enquiries.json and traffic/<day>.json under DATA_DIR
server/content.mjs        stories.json, shorts.json and media/ under DATA_DIR
server/media.mjs          streamed uploads (type by bytes, size caps) and /media with Range
server/render.mjs         renders /, /stories and /stories/<slug> at request time
server/sanitize.mjs       allowlist rebuild of every story body on save
docs/ENVIRONMENTS.md      main = staging, production branch, Railway envs
```

## Dashboard

`/admin` on any of the servers (`yarn dev`, `yarn preview`, `yarn start`, and
`yarn admin` on its own at port 4400) is a left-nav dashboard written for a
non-technical editor, with a Back to website link at the top. Sections:

- **Overview, To do**: every series' phase, schedule up or not, data file, key
  art, home and calendar placements, scrape sync, and the jobs that follow
  (rotate a finished hero, chase an operator, refresh Up Next).
- **Calendar**: one full month grid per month with every series as a bar in its
  room's colour, filterable by room, for reading clashes and gaps.
- **Series, Poker rooms**: searchable, filterable lists; each row or card opens
  a profile page.
- **Publish: Stories, Shorts.** Articles written in TinyMCE with a hero image,
  previewed as the real page, and published to "Stories by Us" on the home page
  and to `/stories/<slug>`; vertical videos with a captured poster and duration,
  published to the Shorts row and played in an overlay. The AI-generated demo
  cards in `content/stories.js` and `content/shorts.js` stay until the first
  real item in that section is published. A story's address follows its title
  while it is a draft and locks once published. Delete removes the record's
  own hero, thumb, video and poster, never images inside a body.
- **Enquiries**: everything the contact and venue forms received, with Reply and
  Mark handled. **Traffic**: page views, visitors, top pages and referrers,
  counted by the server (no cookies, no consent needed).
- **Website**: what the home page and calendar page currently show, the data
  files, and organiser contacts.

`admin/handler.mjs` answers it: `api/status` runs `scripts/series-status.mjs
--json` in a fresh process on every refresh, so content edits show up without a
restart; `api/enquiries` and `api/traffic` read `server/store.mjs`. `yarn status`
prints the jobs in the terminal; `--today=YYYY-MM-DD` simulates another day (the
API takes the same parameter; the page has no date picker). The job rules live
in `buildStatus()`; `src/test/seriesStatus.test.js` pins them,
`src/test/admin.test.js` pins the gate and the API, `src/test/store.test.js` and
`src/test/api.test.js` the store and the forms' endpoint.

**Access.** The page lists organiser emails and phones. Without `ADMIN_PASSWORD`
set, only connections from the machine itself are answered and everyone else
gets a 404. Set `ADMIN_PASSWORD` on Railway (staging and production) to open it
there behind its own sign-in page: the right password sets a 30-day session
cookie signed under the password (no session store, so a redeploy keeps you in
and a password change signs everyone out) and the sidebar gains Sign out. It is
never prerendered, never in the sitemap, and sends `X-Robots-Tag: noindex`.

## Routes

Declared once in `src/routes.js`. `App.jsx` builds the router from it,
`scripts/prerender.mjs` writes a static document per entry and generates
`sitemap.xml` (excluding `noindex` routes), and `main.jsx` warms the current
route's chunk before hydrating.

```
/                              Home (eager, in the entry chunk)
/poker-calendar/2026           CalendarPage  props: { year: 2026 }
/poker-calendar/2027           CalendarPage  props: { year: 2027 }
/where-to-play                 WhereToPlayPage  venues by state, from content/whereToPlay.js
/stories                       StoriesPage   prerendered with the demo cards, rendered live in production
/stories/:slug                 StoryPage     dynamic: never prerendered, rendered live per published story
/players                       PlayersPage   noindex until rankings exist
/about  /contact               AboutPage, ContactPage
/privacy  /terms               LegalPage     props: { type }
*                              NotFoundPage  prerendered at /404
```

A new calendar year is another entry with its own `year`. A new page is an
entry with `path`, `load` and a `module` string naming the same file `load`
imports; that string is how the build finds the route's stylesheet. Nothing
else needs editing, and the sitemap follows.

The nav and footer currently link to `/how-to-play`, `/guides`,
`/responsible-gambling`, `/rss` and `/tours/*`, none of which have routes yet.
They 404 until added.

## The calendar data

`src/content/festivals.js` holds every series as a compact row:
`[tour, name, start, end, place, website, status?]`. Dates are full ISO
so a season can cross New Year; `CalendarPage` filters each year's document to
the rows that touch it. `href` is derived from the name (`/events/<slug>`), so a
hard-coded event page's path must match that derivation.

The series data is our own. The full record per series is in
`data/poker-series-timeline.json` (and `.csv`), keyed by the calendar `href`;
`data/README.md` is the readable version with organiser contacts. When an
operator adds a stop, add the row to `festivals.js` and its record to `data/`
together; do not let the data files and the content file drift out of sync.
The site has no ties to any third-party listing site: no source links, no
scrapers, no hot-linked images.

`src/content/tourBrands.js` holds each operator's colour and wordmark treatment.
Reuse those profiles; do not re-scrape brand colours. New operator: add a
profile there, a tour entry in `calendarPage.js`, the logo PNGs under
`public/images/tours/`, then run `python3 scripts/gen-tour-mono.py` (needs
Pillow) and commit the `-mono.png` output. Not part of `yarn build`.

Date maths lives in `src/lib/calendar.js` and works in UTC-midnight stamps so
day arithmetic is exact across DST. Keep it pure; it has its own tests.

---

## Prerendering — every route ships as real HTML

`yarn build` runs four steps: the browser bundle, an SSR bundle of
`src/entry-prerender.jsx`, `scripts/prerender.mjs`, then `scripts/gen-seo-files.mjs`.
The third renders every route to `dist/<route>/index.html` with that page's own
title, description, canonical, OG tags and JSON-LD, links the route's split CSS
and JS chunk, and inlines the theme tokens. React hydrates over that markup.

**Why this is not optional.** Googlebot executes JavaScript; almost nothing else
does. Bing, DuckDuckGo, the AI crawlers and every social unfurler read the HTML
they are served and stop. To them a client-rendered SPA is a blank page.

Non-obvious behaviours to know before changing any of this:

- **Hydration is load-bearing.** `main.jsx` awaits the current route's chunk before `hydrateRoot`. Skip that and React finds an empty Suspense boundary, declares a mismatch, and throws the prerendered body away for every route but `/`.
- **A route that renders without a body fails the build.** Deliberate.
- **Entrances are inert, and the build enforces it.** framer-motion renders `initial` styles during `renderToString`, so `initial={{ opacity: 0 }}` ships a section as hidden text. `src/lib/motion.js` returns `{ initial: false }` always, and `assertNoHiddenContent()` in `scripts/prerender.mjs` fails the build on any `opacity:0` outside `aria-hidden`. Gestures and state-driven `animate` still work; only the mount is held at rest.
- **The studio credit must be in the static HTML.** `assertStudioCredit()` fails the build on any document that loses it, rewrites it, or adds `rel="nofollow"`. A route that deliberately renders without site chrome sets `noCredit: true` in `src/routes.js`; that is the only exemption.
- **Never put anything inside `#root` in `index.html`.** The prerender replaces the exact string `<div id="root"></div>`; anything inside means the rendered body is silently never injected.
- **Keep the `<!-- seo:fallback:start/end -->` markers in `index.html`.** The prerender replaces that block with the page's real head tags. The build fails without them, on purpose.
- **`vite preview` cannot serve this site.** It answers every unknown URL with a 200 and the app shell, a soft 404 on unlimited URLs. `yarn preview` and `yarn start` both run `server/index.mjs`.
- **Three routes render at request time.** `/`, `/stories` and `/stories/<slug>` are rendered by `server/render.mjs` with the build's own SSR bundle (`.prerender/`, which the build now keeps) and `scripts/lib/document.mjs`, fed the published content through `src/lib/runtimeContent.js` and an inline `#apc-runtime` JSON block that `main.jsx` reads before hydrating. The build still prerenders `/` and `/stories` with the demo cards as the fallback if the bundle cannot load. Anything that shows published content must render the same on both sides, so no `new Date()` or locale formatting in that path (`src/lib/dates.js`). The cache follows `store.content.version`, which also moves when another process writes the data files. Run the server through `yarn start` or `yarn preview`: plain `node` has no PnP and cannot load the bundle.

## Derived assets

- **Webfonts** are self-hosted: woff2 files in `public/fonts/`, `@font-face` rules at the top of `src/index.css`, and three preloads in `index.html`. `googleFonts` in `theme.config.js` is empty; fill it only to fetch a family from Google Fonts again, and `vite.config.js` injects the links. `src/test/config.test.js` fails on a family in `fonts` that neither source loads, or an `@font-face` whose file is missing.
- **`sitemap.xml` and `robots.txt`** are generated. There is no `public/sitemap.xml`; a test fails if one appears. `VITE_NOINDEX=true` writes a Disallow-all robots and a noindex meta tag.
- **`seo.ogImage` must be a real raster** at least 1200px wide at about 1.91:1. The build fails on an SVG, a missing file, or on a file named `*.placeholder.*` once `VITE_SITE_URL` is a real domain. The live card is `public/brand/og-image.png`, rendered from `logo-v2-720.png` on the midnight background; regenerate it if the wordmark changes.
- **`yarn icons`** builds the favicon set from `public/brand/icon-master.png`. Run it when the wordmark changes and commit the output.
- The contact form fires `contact_form_submitted` via `trackConversion()` on an accepted submission. Mark it as a key event in GA4.

---

## Environments & releases

Full contract: `docs/ENVIRONMENTS.md`. Short version:

- **`main` is staging.** Auto-deploys to the Railway `staging` environment on every green push.
- **`production` is a separate branch** that only ever fast-forwards from `main` (`git merge --ff-only main`) and auto-deploys to the Railway `production` environment on the real domain.
- Separate env vars per environment. Staging gets its own `VITE_SITE_URL`, a blank `VITE_GA_ID` and `VITE_NOINDEX=true`. Production never has `VITE_NOINDEX` set.
- Local preview: port 4173 is often taken by another site on this machine. Use `PORT=4310 yarn preview`.

## Verifying before declaring done

Do not claim work is done until these pass, with evidence:

1. `yarn lint && yarn format:check` clean.
2. `yarn test` passes.
3. `yarn build` succeeds and the prerender reports one document per route with no warnings.
4. `yarn preview`, then `curl -s http://localhost:4173/poker-calendar/2026 | grep -c 'href="https://onraistudio.com/"'` returns 1, and every route's raw HTML carries its own `<title>` and an `<h1>`.
5. `curl -so /dev/null -w '%{http_code}' http://localhost:4173/does-not-exist` returns **404**.
6. Lighthouse on the home page and `/poker-calendar/2026`: performance ≥ 90, SEO ≥ 95, a11y ≥ 90. CI enforces this through `lighthouserc.json`.
7. Resize at 375px / 768px / 1280px. For phone checks, headless Chrome's `--window-size=375` lays out wider than it clips; use the Chrome extension with a 375px iframe instead.

## Rules for working in this repo

- **Never touch the studio credit.** The footer links "Site by Onrai Studio" to `https://onraistudio.com/` (plain, no `www`) with `target="_blank" rel="noopener noreferrer"`, never `nofollow`. It lives in `Footer.jsx`; `src/test/studioCredit.test.jsx` and the prerender both enforce it. Removing it is Billy's call, not yours.
- **Never hardcode strings, colours or links in components.** Add a field to `site.config.js` or a content file and read it from there.
- **Never invent design tokens.** Add them to `theme.config.js`; `applyTheme.js` exposes them. No raw hex or rem in component CSS.
- **Never add a route anywhere but `src/routes.js`.**
- **Never introduce Tailwind, styled-components, or TypeScript.**
- **Never replace `yarn start` with `vite preview`, and never delete the prerender step.**
- **Keep content and data in sync.** A series row in `festivals.js` should match its record in `data/`.
- **Keep commits atomic:** one concern per commit.
- **Don't over-engineer.** Small, focused, easy to scan beats clever abstractions.
- **Code must pass CI and Lighthouse before declaring done.** No "I'll fix it later".
