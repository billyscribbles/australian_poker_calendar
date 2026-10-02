# CLAUDE.md — Foundation Starter Repo

This repo is **Billy's agency foundation template**. It is NOT a client site. It is the clean, opinionated scaffold that every new client site starts from.

When Billy opens this repo and tells you to start a new business site, your job is to perform **"The Big Switch"** — reskin this foundation into a new site end-to-end — without touching component internals unless strictly necessary.

---

## What this repo is

A marketing/landing-site starter distilled from `onrai_studio` (Onrai Studio). It covers the ~80% case: homepage, services, about, contact, legal, 404. **Scope is landing pages only** — this template is not for commerce or app/SaaS builds.

**Sibling reference repo on this machine** (read-only, for patterns):

- `/Users/billyhuynh/Github/onrai_studio` — the source marketing site this foundation was distilled from. When in doubt about a pattern, look here.

## Tech stack (do not change without asking)

- React 18 + Vite 5
- React Router v7 (SPA, BrowserRouter, lazy-loaded pages) driven by one route table, `src/routes.js`
- **Build-time prerender** — every route ships as a real HTML document that React hydrates (see "Prerendering")
- Plain CSS with CSS variables — **no Tailwind**
- Framer Motion 11 (scroll-in `whileInView` pattern)
- Lucide React icons
- Yarn 4.12 with `.pnp` caching
- `react-helmet-async` for per-page SEO
- Formspree for the contact form (env-driven)
- Railway deployment (`railway.json`) — driven by the `railway-deploy` skill; `yarn start` runs `server/index.mjs`, a dependency-free Node static server (NOT `vite preview`)
- ESLint (flat config) + Prettier for code quality; Vitest for the contract suite
- GitHub Actions CI (`.github/workflows/ci.yml`) — lint (incl. jsx-a11y) + format check + test (incl. axe) + build + Lighthouse gate
- Opt-in analytics (`src/lib/analytics.js`) and error reporting (`src/lib/errorReporter.js`) — both no-op until env keys are set
- JSX, **no TypeScript**

## The Three-File Swap Model

Every client-specific value lives in one of three layers. Components are "dumb" — they read from config/content and contain zero client strings, colors, or links.

1. **`src/config/theme.config.js`** — design tokens (colors, fonts, radii, shadows, transitions, breakpoints). A boot helper (`src/lib/applyTheme.js`) flattens this to CSS custom properties on `:root` at app start, so all CSS keeps using `var(--color-accent)` etc.

2. **`src/config/site.config.js`** — brand identity and integrations:

   ```
   brand:        { name, logoSrc, logoText, tagline }
   nav:          [{ label, href }]
   footer:       { columns, legal, copyright }
   social:       { instagram, linkedin, ... }
   seo:          { defaultTitle, titleTemplate, description, ogImage, siteUrl }
   integrations: { formspreeId, gaId }
   contact:      { email, phone, address }
   ```

3. **`src/content/*.js`** — per-section copy, one file per section: `hero.js`, `stats.js`, `services.js`, `howItWorks.js`, `testimonials.js`, `faq.js`, `legal.js`. Section components import directly from their content file. No prop drilling, no context.

Plus: **`public/brand/`** for `logo.svg`, `favicon.svg`, `icon-master.png` (square ≥512px — `yarn icons` builds the .ico/apple-touch/192/512/webmanifest set from it) and the og card (a real 1200×630 raster; the build fails on an SVG or on shipping the placeholder to a real domain). **`public/fonts/`** is only for self-hosted woff2 — by default webfonts come from `googleFonts` in `theme.config.js` and are injected by `vite.config.js`, so there is nothing to uncomment in `index.html`.

## Directory structure

```
foundation/
├── public/
│   ├── brand/          logo.svg, favicon.svg + .ico, icon-master.png, og card
│   ├── fonts/          default display + body (woff2, preloaded)
│   └── images/         placeholder hero/section imagery
├── src/
│   ├── config/
│   │   ├── theme.config.js
│   │   └── site.config.js
│   ├── content/
│   │   ├── hero.js
│   │   ├── stats.js
│   │   ├── services.js
│   │   ├── howItWorks.js
│   │   ├── testimonials.js
│   │   ├── faq.js
│   │   └── legal.js
│   ├── routes.js             THE route table — router, prerender and preload read it
│   ├── entry-prerender.jsx   build-time entry: renders each route to a string
│   ├── lazyWithRetry.js      lazy pages that render synchronously once loaded
│   ├── lib/
│   │   ├── applyTheme.js     theme.config -> CSS vars on :root, and as a stylesheet
│   │   ├── seo.jsx           Helmet wrapper + JSON-LD using site.config.seo
│   │   ├── motion.js         reduced-motion-aware scroll-in variants
│   │   ├── analytics.js      opt-in GA4 wiring (no-op without VITE_GA_ID)
│   │   └── errorReporter.js  opt-in error reporting (no-op without Sentry)
│   ├── components/
│   │   ├── ErrorBoundary.jsx / .css   route-level render-error fallback
│   │   ├── RouteFallback.jsx / .css   Suspense loading state
│   │   ├── Navbar.jsx / .css
│   │   ├── Footer.jsx / .css
│   │   ├── Hero.jsx / .css
│   │   ├── Stats.jsx / .css
│   │   ├── Services.jsx / .css
│   │   ├── HowItWorks.jsx / .css
│   │   ├── Testimonials.jsx / .css
│   │   ├── FAQ.jsx / .css
│   │   └── Contact.jsx / .css
│   ├── pages/
│   │   ├── Home.jsx            composes all sections
│   │   ├── ServicesPage.jsx
│   │   ├── AboutPage.jsx
│   │   ├── ContactPage.jsx
│   │   ├── LegalPage.jsx       renders privacy or terms from legal.js
│   │   └── NotFoundPage.jsx
│   ├── App.jsx                 AppRoutes (router-agnostic) + App (BrowserRouter)
│   ├── main.jsx                applyTheme(), then hydrate the prerendered markup
│   └── index.css               base resets + utility classes
├── .env.example                VITE_FORMSPREE_ID, VITE_SITE_URL, VITE_GA_ID, VITE_SENTRY_DSN, VITE_NOINDEX
├── .nvmrc                      Node 20 — single source of truth (CI + Nixpacks read it)
├── .editorconfig / .gitattributes / .vscode/   editor + line-ending hygiene
├── index.html
├── package.json
├── vite.config.js              manual vendor chunks (react, motion) + security headers on preview
├── lighthouserc.json           Lighthouse CI thresholds
├── server/
│   └── index.mjs               production server: prerendered docs, real 404s, cache headers
├── scripts/
│   ├── prerender.mjs           post-build: writes dist/<route>/index.html for every route
│   └── gen-seo-files.mjs       post-build: templates sitemap/robots domain; VITE_NOINDEX=true → Disallow-all robots.txt
├── docs/
│   └── ENVIRONMENTS.md         main=staging / production branch + Railway envs
├── .github/                    ci.yml, dependabot.yml (monthly, grouped), PR template
├── railway.json
└── README.md                   "How to fork" checklist
```

### Components included

Lifted from `onrai_studio`: `Navbar`, `Footer`, `Hero`, `Stats`, `Services`, `HowItWorks`, `Testimonials`, `FAQ`, `Contact`.

Explicitly **excluded** as too site-specific (add back per-project only if asked): `Industries`, `AIFeatures`, `Shop` pricing cards, `Portfolio`, `TechStack`, `BacklinkSourcesDiagram`, `ContentClusterDiagram`, `CaseStudyElusiveRacing`, `TheClimbPage`, `AIPage`.

### CSS utility classes kept

`.container`, `.section`, `.section--dark`, `.section-label`, `.section-sub`, `.glow-card` — all copied from `onrai_studio/src/index.css`. These are the shared styling primitives; keep using them rather than inventing new ones.

### Routes

Declared once, in **`src/routes.js`**. `App.jsx` builds the router from it,
`scripts/prerender.mjs` writes a static document per entry, and `main.jsx` uses it
to warm the current route's chunk before hydrating. A route that is not in that
file does not exist.

```
/            Home                          (eager — in the entry chunk, LCP route)
/services    ServicesPage
/about       AboutPage
/contact     ContactPage
/privacy     LegalPage (type="privacy")
/terms       LegalPage (type="terms")
*            NotFoundPage                  (prerendered at /404)
```

---

## Prerendering — every route ships as real HTML

`yarn build` runs four steps: the browser bundle, an SSR bundle of
`src/entry-prerender.jsx`, `scripts/prerender.mjs`, then `scripts/gen-seo-files.mjs`.
The third one renders every route to `dist/<route>/index.html` with that page's own
title, description, canonical, OG tags and JSON-LD, links the route's split CSS and
JS chunk, and inlines the theme tokens. React then hydrates over that markup.

**Why this is not optional.** Googlebot executes JavaScript; almost nothing else
does. Bing, DuckDuckGo, the AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and every
social unfurler (Facebook, X, Slack, WhatsApp, iMessage) read the HTML they are
served and stop. To all of them a client-rendered SPA is a blank page with one set
of fallback meta tags: no per-page previews, no indexable content, and **no footer
credit link** — "site by Onrai Studio" only counts as a backlink if a crawler can
see it in the HTML.

How the pieces fit:

- **`src/routes.js`** — the route table. `module` must name the exact file `load()`
  imports; that string is how the build finds the route's stylesheet.
- **`src/lazyWithRetry.js`** — a page module that has finished loading renders
  synchronously, with no Suspense boundary. This is what makes a _lazy_ route
  prerenderable AND hydratable.
- **`src/entry-prerender.jsx`** — `prepare()` resolves every page module, then
  `render(url)` returns the markup plus Helmet's head tags.
- **`scripts/prerender.mjs`** — writes the documents and `prerender-manifest.json`.
- **`server/index.mjs`** — serves them. `vite preview` cannot: it answers every
  unknown URL with a 200 and the app shell, which is a soft 404 on an unlimited
  number of URLs.
- **`index.html`** — the `<!-- seo:fallback:start/end -->` markers wrap the dev-only
  meta tags. The prerender replaces that block with the page's real ones. **Do not
  remove the markers** — the build fails without them, on purpose.

Non-obvious behaviours worth knowing before you change any of this:

- **Hydration is load-bearing.** `main.jsx` awaits the current route's chunk before
  `hydrateRoot`. Skip that and React finds an empty Suspense boundary on its first
  render, declares a mismatch, and throws the prerendered body away — silently
  undoing the whole thing for every route but `/`.
- **A route that renders without a body fails the build.** Deliberate: shipping an
  empty document is the exact regression this pipeline exists to prevent.
- **Entrances are inert, and the build enforces it.** framer-motion renders a motion
  element's `initial` styles during `renderToString`, so an entrance written
  `initial={{ opacity: 0 }}` ships its whole section as `style="opacity:0"` in the
  static HTML. That is hidden text to a crawler — undoing the reason the prerender
  exists — and, because the static paint happens first, a section that blanks and
  fades back in under the visitor's own scroll after React hydrates. `src/lib/motion.js`
  therefore returns `{ initial: false }` always, and `assertNoHiddenContent()` in
  `scripts/prerender.mjs` **fails the build** on any `opacity:0` outside
  `aria-hidden`. Gestures (`whileHover`/`whileTap`) and state-driven `animate`
  changes still animate; only the mount is held at rest.
- **The studio credit is the reason the footer has to be in the static HTML**, and
  `assertStudioCredit()` fails the build on any document that loses it, rewrites it,
  or adds `rel="nofollow"`. A route that deliberately renders without site chrome
  sets `noCredit: true` in `src/routes.js` — that is the only exemption.
- **Never put a fallback credit inside `#root`.** It is the obvious-looking shortcut
  and it is wrong twice: `createRoot`/`hydrateRoot` replaces it, so a visitor on a
  slow connection watches a bare "Site by Onrai Studio" footer sit alone and vanish;
  and the prerender replaces the exact string `<div id="root"></div>`, so anything
  inside it means the rendered body is silently never injected. Six client sites
  shipped that way. The placeholder is asserted now, and the build fails loudly.

---

## The two config files

`src/config/site.config.js` is read by the app (brand, nav, SEO, integrations).
It uses `import.meta.env`, so **plain Node cannot import it** — which is why the
production server reads a second file instead:

`src/config/server.config.js` holds what `server/index.mjs` needs, as literal
data with no bundler involvement:

- **`canonicalHost`** — `'apex'`, `'www'` or `null`. The other host 301s to it on
  **every path**. With both answering 200, Google indexes two copies of every
  page and splits the ranking between them; onraistudio.com lost its sitelinks to
  exactly that. A host that redirects `/` but 404s `/about` is worse still — that
  is live on a client domain right now, and is what this setting exists to stop.
- **`legacyRedirects`** — 301s for URLs the old site ranked for. Nearly every
  client is a rebuild, and those pages are the most valuable thing they have.
  Fill it from the old site's Search Console "Pages" report before launch.
- **`cspExtra`** — extra Content-Security-Policy sources per directive. The
  baseline in `server/index.mjs` covers Google Fonts, GA4 and Formspree; an embed
  (booking widget, map, video) has to be named here or the browser blocks it
  silently, in production only.

HSTS and a CSP now ship by default. The CSP allows `'unsafe-inline'` for _styles_
only — unavoidable, since the prerender inlines the theme tokens and framer sets
inline styles — and never for scripts, which is the one that matters.

---

## Brand assets & SEO files — derived, not hand-maintained

Each of these used to be a file someone had to remember to update, and each one
silently shipped wrong on every site built from this template. They are all
generated from a single source now, and the build fails rather than shipping the
placeholder.

- **Webfonts come from `theme.config.js`.** `googleFonts` lists the families;
  `vite.config.js` turns them into the preconnect + stylesheet tags in dev and in
  the build. Do **not** hand-write font tags in `index.html`. A family named in
  `theme.fonts` with no `googleFonts` entry fails `src/test/config.test.js` —
  which is the bug this replaced: the template asked for Fraunces and Plus Jakarta
  Sans, fetched neither, and rendered Georgia and system-ui on every site.
  Self-hosting instead? `@font-face` in `src/index.css`, `googleFonts: []`.

- **`sitemap.xml` is generated** by `scripts/prerender.mjs` from the route table,
  excluding `noindex` routes. There is no `public/sitemap.xml`, and
  `src/test/routes.test.js` fails if one appears or if the generated file and the
  routes disagree. Add a page to `src/routes.js` and the sitemap follows.

- **`seo.ogImage` must be a real raster**, at least 1200px wide at ~1.91:1.
  `assertOgImage()` fails the build on an SVG (every social platform ignores
  them), a missing file, or the wrong shape. The shipped
  `og-image.placeholder.png` is named for what it is: the build fails if it is
  still in place once `VITE_SITE_URL` is a real domain, so a site cannot launch
  sharing a card that says "replace this card before launch".

- **`yarn icons` builds the favicon set** — `.ico` (16/32/48), apple-touch,
  192/512 and `site.webmanifest` — from `public/brand/icon-master.png` (square,
  ≥512px). Run it once when the client's logo lands and commit the output; it is
  deliberately **not** part of `yarn build`, so the deploy needs no image tooling.
  The `.ico` matters: an SVG favicon satisfies browsers but leaves a blank globe
  beside the site name in Google, which is what happened to onraistudio.com.

- **The contact form fires `contact_form_submitted`** via `trackConversion()` on a
  submission Formspree accepted. Mark it as a key event in GA4 (Admin → Events) to
  turn it into a goal — no code change needed, which is what previously kept a new
  site from being able to report a single enquiry.

---

## The Big Switch — kicking off a new business site

When Billy says something like _"start a new site for [Client]"_, _"let's build [Client]'s site"_, or _"kick off a new business"_, run this workflow. The **`big-switch` skill** orchestrates these steps end to end and tells you which other skills to invoke at each beat — start there; the steps below remain the source of truth for what each step does.

### Step 0 — Confirm the client brief first

Before editing anything, ask Billy for the basics if they aren't already in the conversation:

**Identity**

1. **Business name** and one-line tagline
2. **Industry / what they do**
3. **Brand colors** (or a vibe — "dark luxury", "minimal pastel", "bold tech") so you can propose `theme.config.js` values
4. **Fonts** — a pairing, or a feel ("editorial serif", "plain and modern"). Set them in `theme.config.js` **and** list them in `googleFonts`.
5. **Logo asset** (file path, or "generate a text logo for now"), plus a square ≥512px master for `yarn icons`

**Shape of the site** — ask what to ADD, not only what to cut. The default set is
a starting point, not the menu. A site that only ever has things removed from it
ends up looking like every other site built from this template, which is the
opposite of the point.

6. **Nav pages they want** (default: Home, Services, About, Contact)
7. **Which sections does this business actually need?** Offer, don't assume — portfolio / case studies, pricing or packages, a gallery, team, process, service areas, a blog or guides, accreditations, opening hours, a map. Most need two or three of these and none of them are in the default set.
8. **Any sections they DON'T want** from the default set
9. **Hero treatment** — imagery-led or type-led? It changes the feel of the site more than any other single answer.

**Wiring**

10. **Domain** (for SEO), and **www or apex?** — set `canonicalHost` in `src/config/server.config.js`
11. **Is there an existing site?** If so, get the URL: its ranking pages become 301s in `legacyRedirects`, and losing them is the most common way a rebuild goes backwards
12. **Phone number** (renders as click-to-call) and Formspree ID, or leave the env placeholder
13. **Do they need a consent banner?** (`integrations.consent` — off by default; see site.config.js for when it should be on)

Don't guess brand identity, and don't guess the shape of the site. Ask.

### Step 1 — Decide: in-place edit or new repo?

Default: **clone this foundation into a sibling directory** (e.g., `/Users/billyhuynh/Github/<client-name>`) and work there. Never commit client-specific changes back into `foundation/` itself. If Billy explicitly says "just edit in place for a test", you can — but warn him first.

Once the clone exists, set up the branch model from **`docs/ENVIRONMENTS.md`**: `main` is **staging**, a `production` branch is what goes live. Create both branches at init time so the release path exists before the first deploy.

### Step 2 — Execute the swap (in order)

1. **`src/config/site.config.js`** — brand, nav, footer, social, SEO, contact, integration IDs.
2. **`src/config/theme.config.js`** — colors, fonts, radii. Match the brand. Name each family in `fonts` **and** in `googleFonts` — `vite.config.js` injects the links, and `src/test/config.test.js` fails on a family that is declared but never fetched.
3. **`public/brand/`** — drop in `logo.svg`, `favicon.svg`, and an `og-image` (ship a 1200×630 PNG/JPG — social platforms don't render SVG). If assets aren't provided, generate clean SVG placeholders that match the brand name + colors.
4. **`src/content/*.js`** — rewrite each section's copy. Write real marketing copy for the client's industry, not lorem ipsum. Match the tone Billy specified (or ask).
5. **`.env`** — copy from `.env.example` and fill `VITE_FORMSPREE_ID`, `VITE_SITE_URL`. Optionally set `VITE_GA_ID` (analytics) and `VITE_SENTRY_DSN` (error monitoring) — both stay dormant when blank. `VITE_NOINDEX=true` goes on the **staging** Railway environment only (never production, never local `.env`) — see `docs/ENVIRONMENTS.md`.
6. **`index.html`** — update the fallback `<title>`, `<meta description>`, og/twitter tags, and favicon link. (Helmet will override at runtime, but this is the pre-hydration fallback.)
7. **`public/sitemap.xml`** and **`public/robots.txt`** — leave the placeholder domain in place; `yarn build` rewrites it from `VITE_SITE_URL` via `scripts/gen-seo-files.mjs`. Just add/remove `<url>` entries to match the client's routes.

### Step 3 — Add/remove pages if needed

If Billy asks for extra sections or pages not in the default set:

- **Extra section:** create a new `src/content/<name>.js`, copy the closest existing component as a starting point, and compose it into the relevant page. Prefer composition over editing existing components.
- **Extra page:** add an entry to `src/routes.js` — `path`, `load`, and a `module` string naming the same file `load` imports. `App.jsx` and the prerender both pick it up; nothing else needs editing. Add a `<url>` to `public/sitemap.xml` too.
- **Remove a section:** delete it from the page composition in `src/pages/Home.jsx`. Leave the component file in place unless Billy asks to delete it — easier to put back.

### Step 4 — Verify end-to-end before declaring done

Run through this list. Do not claim the site is done until every step passes.

1. `yarn install && yarn dev` — starts with zero warnings.
2. Home page renders every section with real client copy and no layout breakage.
3. Change `site.config.js` → brand name → verify Navbar, Footer, `<title>`, og meta all update without touching components.
4. Change `theme.config.js` → `colors.accent` → verify every accent surface (buttons, hover states, glow cards) updates site-wide.
5. Navigate every route including `/does-not-exist` (404).
6. Submit the contact form against the real Formspree endpoint — verify success state.
7. `yarn lint && yarn format:check` — ESLint and Prettier pass clean.
8. `yarn build && yarn preview` — production build succeeds, vendor chunks split as expected, and the prerender reports one document per route with no warnings.
   8b. `curl -s http://localhost:4173/about | grep -c 'href="https://onraistudio.com/"'` returns 1 (View Page Source shows "Site by Onrai Studio" before any script runs), and every route's raw HTML carries its own `<title>` and an `<h1>` — proof the page exists for crawlers that don't run JS.
   8c. `curl -so /dev/null -w '%{http_code}' http://localhost:4173/does-not-exist` returns **404**, not 200.
9. Lighthouse on `yarn preview`: performance ≥ 90, SEO ≥ 95, a11y ≥ 90 on the home page **and on `/about`** (a lazy route — the class of page a prerender regression hides in).
10. Resize at 375px / 768px / 1280px — hamburger, grids, and footer all respond cleanly.
11. `yarn test` — the `src/test/` contract suite passes, confirming the config/content swap is wired end-to-end.
12. Deploy with the `railway-deploy` skill — **staging first** (`main`), then promote to production per `docs/ENVIRONMENTS.md`. Re-verify routes and the contact form on each live domain.

Report verification results with evidence (command output, observed behavior), not vibes.

---

## Environments & releases

Full contract: **`docs/ENVIRONMENTS.md`**. The short version, which applies to every site built from this template:

- **`main` is staging**, not production. It auto-deploys to the Railway `staging` environment on every green push.
- **`production` is a separate branch** that only ever fast-forwards from `main` (`git merge --ff-only main`), and auto-deploys to the Railway `production` environment on the client's real domain.
- One Railway project per client, two environments, **separate env vars per environment** — staging gets its own `VITE_SITE_URL`, its own (or no) Formspree form, and a blank `VITE_GA_ID`.
- Never point staging at the production domain, and never hand out a staging URL without reading the "Keeping staging out of Google" section first.

---

## Rules for working in this repo

- **Never touch the studio credit.** Every site's footer links **"Site by Onrai Studio"** to **`https://onraistudio.com/`** (plain, no `www` — the www address redirects, and a backlink should land in one hop) as an ordinary link: `target="_blank" rel="noopener noreferrer"`, **never `nofollow`**. It lives in `Footer.jsx`; `src/test/studioCredit.test.jsx` checks the rendered link and `scripts/prerender.mjs` fails the build if any route's HTML is missing it. If a client asks to remove it, confirm with Billy first.
- **Never hardcode client strings, colors, or links in components.** If you're tempted to, the correct answer is to add a field to `site.config.js` or a content file and read it from there.
- **Never introduce Tailwind, styled-components, or any other CSS system.** Plain CSS + CSS variables is the house style.
- **Never add TypeScript.** JSX only, matching the existing sibling repos.
- **Never invent new design tokens.** Add them to `theme.config.js` and expose via `applyTheme.js`. Never write raw hex/rem in component CSS.
- **Never delete the placeholder content files** when reskinning — rewrite them in place. The shape is part of the contract.
- **Never add a route anywhere but `src/routes.js`.** A route hand-added to `App.jsx` renders in the browser and nowhere else — no static document, no crawlable page, no entry in the prerender manifest, so the server 404s it.
- **Never replace `yarn start` with `vite preview`, and never delete the prerender step** to make a build go faster. Both quietly revert every client site to an empty document.
- **Prefer lifting a pattern from `onrai_studio`** over inventing a new one. If `onrai_studio` does it a certain way and it's reasonable, match it.
- **Keep commits atomic** when editing — one commit per swap step (site config, theme, content, etc.) makes rollback trivial.
- **Don't over-engineer.** This is a template. Small, focused, easy to scan > clever abstractions.
- **Code must pass CI and Lighthouse before declaring done.** GitHub Actions (`.github/workflows/ci.yml`) must be green — lint (incl. jsx-a11y), format check, tests (incl. axe), and build all pass. Lighthouse thresholds in `lighthouserc.json` must be met: performance ≥ 90, SEO ≥ 95, a11y ≥ 90. No "I'll fix it later" — failing CI or Lighthouse means the work is not done.

## Known non-blocking considerations

- **Repo hosting:** this should be a GitHub Template repo so "Use this template" gives clean clones.
- **Default typography:** Inter + a display serif as safe defaults; override per client.
- **Scope:** landing pages only. Commerce and app/SaaS builds are out of scope for this template.
