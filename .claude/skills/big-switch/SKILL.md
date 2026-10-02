---
name: big-switch
description: Use when Billy wants to start a new client site from this Foundation template — triggers on "start a new site", "build [Client]'s site", "kick off a new business", "reskin this for [Client]", or any request to turn the Foundation scaffold into a real client site. Orchestrates the full Big Switch end to end.
---

# The Big Switch — new client site orchestration

This skill drives the workflow defined in `CLAUDE.md` ("The Big Switch") from
brief to live site. `CLAUDE.md` is the source of truth for *what* each step
does; this skill is the *order of operations* and tells you which other skills
to invoke at each beat. Read `CLAUDE.md` first, then follow this.

## Step 0 — Confirm the brief (never skip)

Ask Billy for anything missing, then stop and wait for answers:

**Identity**

1. Business name + one-line tagline
2. Industry / what they do
3. Brand colors or a vibe ("dark luxury", "minimal pastel", "bold tech")
4. Fonts — a pairing or a feel. Goes in `theme.config.js` `fonts` **and** `googleFonts`
5. Logo asset path (or "generate a text logo"), plus a square ≥512px master for `yarn icons`

**Shape of the site — ask what to ADD, not only what to cut.** The default set is
a starting point, not the menu. A site that only ever has sections removed ends
up looking like every other site built from this template.

6. Nav pages (default: Home, Services, About, Contact)
7. Which sections does this business actually need? Offer them: portfolio / case
   studies, pricing or packages, gallery, team, process, service areas, blog or
   guides, accreditations, opening hours, map. Most need two or three, and none
   ship in the default set.
8. Sections to drop from the default set
9. Hero treatment — imagery-led or type-led?

**Wiring**

10. Domain (for SEO), and www or apex → `canonicalHost` in `src/config/server.config.js`
11. Is there an existing site? Get the URL — its ranking pages become 301s in
    `legacyRedirects`, and losing them is how a rebuild goes backwards
12. Phone number (renders as click-to-call) and Formspree ID
13. Consent banner needed? → `integrations.consent` (off by default)

Do not guess brand identity, and do not guess the shape of the site.

## Step 1 — Isolate the workspace

Default: clone this foundation into a sibling dir
(`/Users/billyhuynh/Github/<client-name>`) and work there. Never commit
client-specific changes back into `foundation/` itself. Only edit in place if
Billy explicitly says so — and warn him first.

Then set up the branch model from `docs/ENVIRONMENTS.md`: `git init`, commit,
create **both** `main` (staging) and `production` (live), and push both. Doing
this at init time means the release path exists before the first deploy.

## Step 2 — Execute the swap (in order)

Follow `CLAUDE.md` Step 2 exactly:

1. `src/config/site.config.js` — brand, nav, footer, social, SEO, contact, IDs
2. `src/config/theme.config.js` — colors, fonts, radii (+ `public/fonts/` and
   the `index.html` preload block if using custom fonts)
3. `public/brand/` — `logo.svg`, `favicon.svg`, `og-image` (ship a 1200×630
   **PNG/JPG** — social platforms do not render SVG previews)
4. `src/content/*.js` — rewrite every section with real marketing copy
5. `.env` — `VITE_FORMSPREE_ID`, `VITE_SITE_URL`; optionally `VITE_GA_ID`
   (analytics) and `VITE_SENTRY_DSN` (error monitoring). Both observability
   helpers no-op when left blank — see README.
6. `index.html` — fallback `<title>`, meta, og/twitter image
7. `public/sitemap.xml` / `public/robots.txt` — leave the placeholder domain;
   `yarn build` rewrites it from `VITE_SITE_URL` via `scripts/gen-seo-files.mjs`

Invoke supporting skills during the swap:

- **`impeccable`** / **`design-taste-frontend`** — when proposing or polishing
  the theme and section layout
- **`accessibility`** — after content is in, to audit the assembled pages
- **`seo`** — to review meta, structured data, and `sitemap.xml`

## Step 3 — Add/remove pages

Per `CLAUDE.md` Step 3: extra section → new `src/content/<name>.js` + closest
component cloned; extra page → lazy route in `src/App.jsx`; remove a section →
delete it from `src/pages/Home.jsx` composition only.

## Step 4 — Verify end-to-end

Run the full `CLAUDE.md` Step 4 checklist. Do not declare done until every item
passes. Key automated gates: `yarn lint` (incl. jsx-a11y), `yarn test` (contract
+ axe suite), `yarn build`, and Lighthouse ≥ 90 / 95 / 90. Report results with
evidence, not vibes.

## Step 5 — Deploy

Hand off to the **`railway-deploy`** skill, following `docs/ENVIRONMENTS.md`:
deploy `main` to the **staging** environment first, verify there, then promote
to production (`git merge --ff-only main` onto the `production` branch). After
each deploy, re-verify every route and the contact form on that environment's
domain.
