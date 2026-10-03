# Australian Poker Calendar

Poker news, the full Australian and Asia-Pacific tournament calendar, player
rankings and venue guides, at **australianpokercalendar.com**.

Built as a prerendered React single-page app: every route ships as a real HTML
document that React hydrates, so the calendar and the news are readable by every
crawler and social unfurler, not only Googlebot.

Read `CLAUDE.md` for the engineering contract (config layers, routes, prerender
rules). Read `docs/ENVIRONMENTS.md` for how staging and production are released.

## Quick start

Requires Node 20 (pinned in `.nvmrc`) and Yarn 4 via Corepack.

```bash
corepack enable
yarn install
cp .env.example .env      # fill VITE_SITE_URL; the rest can stay blank
yarn dev                  # http://localhost:5173
```

## What is on the site

| Route                  | Page                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                    | News home: live event banner, featured news, stories, shorts, live news, calendar sidebar, player news, Players of the Year, guides, FAQ, poker rooms |
| `/poker-calendar/2026` | Month-by-month timeline of every 2026 series, with a tour filter                                                                                      |
| `/poker-calendar/2027` | Same document for 2027                                                                                                                                |
| `/where-to-play`       | Every venue the series are dealt at, by state, with address, operator marks and a link out (`src/content/whereToPlay.js`)                             |
| `/players`             | Players holding page (noindex until the first rankings land)                                                                                          |
| `/about`, `/contact`   | About and contact (Formspree form)                                                                                                                    |
| `/privacy`, `/terms`   | Legal, rendered from `src/content/legal.js`                                                                                                           |
| anything else          | A real 404 document, served with a 404 status                                                                                                         |

Routes are declared once in `src/routes.js`. The router, the prerender and the
sitemap all read that file; a route that is not in it does not exist.

## Where things live

Components are dumb. Every string, colour and link comes from one of three layers:

1. **`src/config/theme.config.js`** — the "Midnight & Gold" design tokens. Flattened to CSS custom properties on `:root` at boot by `src/lib/applyTheme.js`.
2. **`src/config/site.config.js`** — brand, nav, footer, social, SEO defaults, contact, integrations. `src/config/server.config.js` holds the production server's canonical-host and redirect settings as plain data.
3. **`src/content/*.js`** — one file per section. The ones that matter most:

| File                                                                              | Feeds                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `festivals.js`                                                                    | Every series on the calendar, one compact row each            |
| `calendarPage.js`                                                                 | Calendar page chrome: tours, filter labels, SEO copy per year |
| `calendar.js`                                                                     | The "next six series" sidebar on the home page                |
| `tourBrands.js`                                                                   | Each operator's colours and wordmark treatment                |
| `events.js`                                                                       | The live events banner and ticker                             |
| `featuredNews.js`, `stories.js`, `shorts.js`, `liveNews.js`, `recentChampions.js` | News sections                                                 |
| `playersOfTheYear.js`, `playersPage.js`                                           | Rankings sidebar and players page                             |
| `guides.js`, `pokerRooms.js`, `partners.js`, `faq.js`                             | The rest of the home page                                     |
| `consent.js`, `legal.js`                                                          | Cookie banner copy, privacy and terms                         |

Brand assets are in `public/brand/`: the gold wordmark, favicon set and the
Open Graph card. Tour logos are in `public/images/tours/`.

## The calendar data

The series list comes from the Australian Poker Schedule series timeline
(https://australianpokerschedule.com.au/series-timeline/), scraped on 2 October 2026.

- `data/poker-series-timeline.json` and `.csv` hold the full record per series:
  organiser contacts, venue address and coordinates, guarantees, poster facts.
- `data/README.md` is the human-readable version of the same data.
- `data/melbourne-champs-ii-schedule.json` is one series' full event schedule.
- `src/content/festivals.js` is the slice the calendar draws, by hand.

To add or update a series, edit the row in `festivals.js`. If a new operator
appears, add its brand profile to `tourBrands.js` and its logo to
`calendarPage.js`, then regenerate the greyscale wordmark:

```bash
pip install pillow
python3 scripts/gen-tour-mono.py
```

Each calendar year is its own route. Next year is another entry in
`src/routes.js` with its own `year`; the festivals it reads are filtered from
the same file.

## Scripts

| Command              | What it does                                                            |
| -------------------- | ----------------------------------------------------------------------- |
| `yarn dev`           | Vite dev server with hot reload                                         |
| `yarn build`         | Browser bundle, SSR bundle, prerender every route, write sitemap/robots |
| `yarn preview`       | Serve `dist/` with the production server on port 4173                   |
| `yarn start`         | Same server; what Railway runs                                          |
| `yarn test`          | Vitest contract suite, including axe accessibility checks               |
| `yarn lint`          | ESLint, including jsx-a11y                                              |
| `yarn format:check`  | Prettier                                                                |
| `yarn icons`         | Rebuild the favicon set from `public/brand/icon-master.png`             |
| `yarn build:analyze` | Build with a bundle visualiser                                          |

Port 4173 is often taken by another local site. Run `PORT=4310 yarn preview`
when it is.

## Environment variables

All `VITE_*` variables are inlined at build time. Change one, rebuild.

| Variable            | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `VITE_SITE_URL`     | Canonical origin for meta tags, sitemap and robots               |
| `VITE_FORMSPREE_ID` | Where the server emails form submissions on to (optional)        |
| `VITE_GA_ID`        | GA4 measurement ID. Loads only after cookie consent              |
| `VITE_SENTRY_DSN`   | Optional error reporting                                         |
| `VITE_NOINDEX`      | `true` on staging only. Writes a Disallow-all robots and noindex |

Two more are read by the server at run time, not the build: `ADMIN_PASSWORD`
opens the `/admin` dashboard, and `DATA_DIR` is where it keeps enquiries and
the traffic tally (default `.data/`; a volume on Railway).

## Testing and quality gates

`yarn test` runs the contract suite in `src/test/`: config and theme shape,
route and sitemap agreement, SEO canonical rules, calendar page state, the
consent banner, tour brand profiles, the studio credit, and axe on the home and
calendar pages.

CI (`.github/workflows/ci.yml`) runs lint, format check, tests, the full build
and Lighthouse on five routes. Thresholds: performance 90, accessibility 90,
SEO 95.

## Deploying

The site runs on Railway with two environments on one project. `main` is
staging and auto-deploys on every green push. `production` is a separate branch
that only ever fast-forwards from `main`:

```bash
git checkout production
git merge --ff-only main
git push
git checkout main
```

Full detail, including the per-environment variable matrix and how staging is
kept out of search, is in `docs/ENVIRONMENTS.md`.

## Not yet built

The nav and footer link to pages that do not have routes yet: `/how-to-play`,
`/guides`, `/responsible-gambling`, `/rss` and the per-tour pages under
`/tours/`. They fall through to the 404 document until they are added to
`src/routes.js`.

## Credit

Site by [Onrai Studio](https://onraistudio.com/). The footer credit is part of
the build contract and must not be removed or changed to `nofollow`.
