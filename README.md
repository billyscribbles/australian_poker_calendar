# Foundation — Agency Starter Template

Opinionated React + Vite starter for spinning up marketing/landing sites in minutes.
Distilled from `onrai_studio`. Not a client site — a scaffold every client site forks from.

Read `CLAUDE.md` for the full contract (design system, routes, component rules, "Big Switch" workflow).

## Quick start

Requires Node 20+ (pinned in `.nvmrc`).

```bash
yarn install
cp .env.example .env      # fill VITE_FORMSPREE_ID + VITE_SITE_URL
yarn dev
```

Open http://localhost:5173. You should see a fully-rendered site with placeholder content.

## The three-file swap

Every new client site is built by editing these — **not** components:

1. **`src/config/site.config.js`** — brand name, logo, nav, footer, SEO, social, contact, integration IDs.
2. **`src/config/theme.config.js`** — colors, fonts, radii, shadows, transitions. Flows into CSS variables automatically.
3. **`src/content/*.js`** — one file per section (`hero.js`, `services.js`, `testimonials.js`, …). Rewrite copy in place.

Plus **`public/brand/`** — drop in `logo.svg`, `favicon.svg`, a square `icon-master.png` (≥512px) and the 1200×630 og card.

## How to fork for a new client

The `big-switch` skill orchestrates all of this — ask Claude to "start a new
site for [Client]". Manual checklist:

1. Copy this repo: `cp -R foundation /path/to/client-name` (or use GitHub "Use this template").
2. Edit `src/config/site.config.js` — brand name, nav, footer, SEO, contact, social.
3. Edit `src/config/theme.config.js` — colors and fonts. Name the families in `fonts` **and** list them in `googleFonts`; the links are injected for you, and a test fails if a family is declared but never fetched. Self-hosting instead? `@font-face` in `src/index.css`, `googleFonts: []`.
4. Drop assets into `public/brand/`: `logo.svg`, `favicon.svg`, a square `icon-master.png` (≥512px) then run `yarn icons`, and the client's **1200×630 PNG/JPG** og card — the build fails if the placeholder is still there once `VITE_SITE_URL` is a real domain.
5. Rewrite each file in `src/content/` with real copy.
6. Copy `.env.example` → `.env`, set `VITE_FORMSPREE_ID` and `VITE_SITE_URL`. Optionally set `VITE_GA_ID` / `VITE_SENTRY_DSN` (see "Analytics & error monitoring").
7. Adjust the `<url>` entries in `public/sitemap.xml` to match the client's routes — the domain is templated from `VITE_SITE_URL` at build time, so leave `https://example.com` in place.
8. `yarn lint && yarn format:check && yarn test` — confirm the swap is wired and clean.
9. `yarn dev` — verify, then `yarn build && yarn preview` for the production check (`preview` serves the prerendered build exactly as Railway does).

## What's included

**Routes:** `/`, `/services`, `/about`, `/contact`, `/privacy`, `/terms`, `*` (404).

**Components:** `Navbar`, `Footer`, `Hero`, `Stats`, `Services`, `HowItWorks`, `Testimonials`, `FAQ`, `Contact`.

**Utilities:** `SEO` wrapper + JSON-LD (`src/lib/seo.jsx`), `applyTheme()` bootstrap (`src/lib/applyTheme.js`), reduced-motion scroll-in helper (`src/lib/motion.js`), opt-in analytics/error reporting (`src/lib/analytics.js`, `src/lib/errorReporter.js`).

**Resilience:** route-level `ErrorBoundary`, `Suspense` loading state (`RouteFallback`), skip-to-content link, and a chunk-retry guard for stale tabs after redeploys.

**Prerendering:** every route ships as a real HTML document — see below.

## Prerendering

`yarn build` does not stop at a JavaScript bundle. It renders every route in
`src/routes.js` to a static HTML document — `dist/about/index.html` and friends —
with that page's own title, description, canonical, Open Graph tags and JSON-LD
baked in, then React hydrates over it in the browser.

**Why it is not optional.** Googlebot executes JavaScript; almost nothing else
does. Bing, DuckDuckGo, the AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and
every social unfurler (Facebook, X, Slack, WhatsApp, iMessage) read the HTML they
are served and stop. To all of them a client-rendered SPA is an empty page with
one set of fallback meta tags. That means no per-page link previews, no content
to index — and nothing in the page body exists, including the "site by Onrai
Studio" footer credit, which is only a backlink if a crawler can see it.

The moving parts:

| File                      | Job                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/routes.js`           | The one route table. Router, prerender and hydration preload all read it.                               |
| `src/entry-prerender.jsx` | Build-time entry: renders the app to a string and collects Helmet's head tags.                          |
| `src/lazyWithRetry.js`    | Lets an already-loaded page module render synchronously, which is what makes a _lazy_ route hydratable. |
| `scripts/prerender.mjs`   | Writes the documents, links each route's CSS/JS, inlines the theme tokens.                              |
| `server/index.mjs`        | Serves them, with real 404s and one canonical URL per page.                                             |

**Rules.**

- A new page goes in `src/routes.js`. Nothing else adds a route.
- The `module` field must name the exact file `load()` imports — that string is
  how the build finds the route's stylesheet. `src/test/routes.test.js` asserts it.
- A route that renders without a body **fails the build**. That is deliberate:
  silently shipping an empty document is the regression this exists to prevent.
- Sections below the fold use Framer Motion's `whileInView`, so they render into
  the static HTML at `opacity: 0` and reveal on hydration. The text is in the
  document either way; the fold itself paints from HTML and CSS alone.

## Code quality

- `yarn lint` — ESLint (flat config, `eslint.config.js`), including `jsx-a11y` accessibility rules.
- `yarn format` / `yarn format:check` — Prettier (`.prettierrc`).
- `yarn test` — Vitest contract suite (`src/test/`), including an axe accessibility check.
- `yarn build:analyze` — build with a `dist/bundle-stats.html` size report.
- CI (`.github/workflows/ci.yml`) runs lint + format check + test + build + a Lighthouse gate (performance ≥ 90, a11y ≥ 90, SEO ≥ 95) on every push and PR. It audits `/` and `/about` — the second one is there so a prerender regression on a lazy route cannot pass.

## House rules

- No Tailwind. Plain CSS + CSS variables only.
- No TypeScript. JSX only.
- No hardcoded client strings, colors, or links in components — read from `site.config`/`content` files.
- New design tokens go in `theme.config.js`, not as raw hex/rem in CSS.
- Section components keep the Framer Motion `whileInView` pattern for scroll-in animations.

## Adding a new section

1. Create `src/content/mySection.js` exporting the data.
2. Create `src/components/MySection.jsx` (+`.css`) that imports it.
3. Compose it into the relevant page in `src/pages/`.

## Adding a new page

1. Create `src/pages/MyPage.jsx`.
2. Add an entry to `src/routes.js` — `path`, `load`, and a `module` string naming
   the same file `load` imports. `App.jsx` and the prerender both pick it up.
3. Add the nav link in `site.config.js` under `nav`.
4. Add a `<url>` entry to `public/sitemap.xml`.
5. `yarn build` — the new route should appear in the prerender output.

## Analytics & error monitoring

Both are opt-in and cost nothing when unused — leave the env vars blank to ship neither.

**Analytics (GA4).** Set `VITE_GA_ID` (e.g. `G-XXXXXXXXXX`) in `.env`. `src/lib/analytics.js`
then injects the gtag script at boot and sends a `page_view` on every route change.
Blank `VITE_GA_ID` → no script, no calls.

**Error monitoring (Sentry).** `ErrorBoundary` forwards caught render errors to
`src/lib/errorReporter.js`, which calls `window.Sentry.captureException` **if** a Sentry
SDK is present. The template bundles no SDK. To enable it, either:

- add the [Sentry Loader Script](https://docs.sentry.io/platforms/javascript/install/loader/)
  to `index.html` with the client's DSN, or
- `yarn add @sentry/react` and initialise it in `src/main.jsx` using `VITE_SENTRY_DSN`.

Until then `reportError` is silent in production and logs to the console in development.

## Deployment

Ready for Railway out of the box (`railway.json` included). `yarn start` runs
`server/index.mjs`, a dependency-free Node static server that serves the prerendered
documents on port 4173 with baseline security headers, long-lived caching on hashed
assets, a real 404 status for unknown URLs, and a 301 from `/page/` to `/page`.

`vite preview` cannot hold that job once routes are prerendered: it answers every
unknown URL with a 200 and the app shell, which is a soft 404 on an unlimited number
of URLs. Per-client redirects (a `www` → apex 301, legacy URL moves) belong in
`server/index.mjs`.

Ask Claude to "deploy to Railway" — the `railway-deploy` skill drives project creation, env
vars, deploy, and domain generation via the Railway MCP.

**Two environments, always.** `main` is **staging** (auto-deploys to the Railway `staging`
environment); a `production` branch, fast-forwarded from `main`, is what goes live on the
client's domain. Set both up when you create the clone —
see [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md) for the branch model, Railway setup,
per-environment env vars, rollback, and hotfix flow. Set `VITE_NOINDEX=true` on the staging
environment so it never gets indexed; never set it on production.
