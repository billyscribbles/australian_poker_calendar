# Environments & Release Flow

The site runs **two environments on one Railway project**. This file is the
release contract.

|                           | Staging                                                                      | Production                           |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------ |
| Git branch                | `main`                                                                       | `production`                         |
| Railway environment       | `staging`                                                                    | `production` (Railway's default env) |
| Deploys when              | every push to `main`, CI green                                               | every push to `production`, CI green |
| Domain                    | `<service>.up.railway.app`                                                   | the real domain                      |
| Indexed by search engines | **no** (see [Keeping staging out of Google](#keeping-staging-out-of-google)) | yes                                  |
| Analytics (`VITE_GA_ID`)  | blank                                                                        | the GA4 ID                           |
| Audience                  | internal review                                                              | the public                           |

```
feature/xyz ──PR──▶ main ──auto──▶ staging.up.railway.app
                     │
                     └── git merge --ff-only ──▶ production ──auto──▶ australianpokercalendar.com
```

`main` is **staging, not production.** It is always deployable, and it is never
the thing the public sees. Shipping to production is an explicit, separate act:
fast-forwarding the `production` branch.

---

## Git branch model

- **`main`** — integration branch. Protected. Every merge lands on staging
  automatically. Keep it deployable at all times.
- **`production`** — release branch. Only ever receives **fast-forward** merges
  from `main`, so it is always an exact, older-or-equal snapshot of `main`.
  Never commit directly to it (except hotfixes, below).
- **`feature/*` / `fix/*`** — short-lived, PR into `main`. CI
  (`.github/workflows/ci.yml`) runs lint + format + test + build + Lighthouse on
  every branch and PR.

### Branches on GitHub

The repo is `billyscribbles/australian_poker_calendar`, with `main` and
`production` both pushed.

On GitHub, protect both branches: require the `CI / build` check to pass, and
require a PR for `main`. `production` needs no PR — it only ever fast-forwards.

### Ship to production

```bash
git checkout production
git merge --ff-only main         # fails loudly if production has drifted
git push
git checkout main
```

`--ff-only` is the safety rail. If it refuses, `production` has commits `main`
doesn't (a hotfix that was never merged back) — fix that before releasing.

Tag releases if a changelog is wanted:
`git tag -a v1.2.0 -m "..." && git push --tags`.

### Hotfix a live bug while `main` has unfinished work

```bash
git checkout production && git checkout -b fix/urgent
# ...fix, commit, PR into production, CI green, merge...
git checkout main && git merge production      # merge it back so main stays ahead
```

Skipping the merge-back is what causes `--ff-only` to fail on the next release.

### Roll back

1. Fastest: Railway dashboard → production environment → Deployments → **Redeploy**
   a previous successful build (or `mcp__railway__list_deployments` to find it).
2. Then make git match reality: `git revert <bad-commit>` on `main`, and
   fast-forward `production` again. Never leave the branch and the live deploy
   out of sync.

---

## Railway setup (once)

Railway's default environment is already named `production` — keep it, and add
`staging` alongside it. One project, one service per environment.

1. Create the project and link the repo (see the `railway-deploy` skill).
2. Create the second environment: `mcp__railway__create_environment` with name
   `staging`.
3. Point each environment's service at its branch — Railway service →
   **Settings → Source → Branch**:
   - `staging` environment → branch `main`
   - `production` environment → branch `production`
4. Enable **Settings → Deploy → Wait for CI** on **both** services, so Railway
   only builds after GitHub Actions is green. Without this, a red build ships.
5. Set the env vars per environment (see the matrix below) — `mcp__railway__set_variables`
   after `mcp__railway__link_environment` for the environment you're targeting.
   Getting the wrong environment linked is the #1 way to leak the staging config
   into production; run `mcp__railway__list_variables` to confirm before deploying.
6. Generate a domain for staging (`mcp__railway__generate_domain`). Attach the
   real domain to **production only**.

### Custom domains and `allowedHosts`

**Attaching a custom domain needs no code change.** `yarn start` runs
`server/index.mjs` (a plain Node server, added with the prerender pipeline), and it
serves any Host header. The blank-403-on-the-live-domain failure mode that used to
follow a forgotten `allowedHosts` entry is gone.

`vite.config.js` still ships `preview.allowedHosts: ['.up.railway.app']` for anyone
running `vite preview` directly to debug a build. If you do that against a custom
domain, append it literally:

```js
allowedHosts: ['.up.railway.app', 'australianpokercalendar.com', 'www.australianpokercalendar.com'],
```

The `www` → apex redirect is driven by `canonicalHost` in
`src/config/server.config.js`. Set it before both hostnames are attached, or
Google sees two complete copies of the site.

---

## Environment variables

All `VITE_*` vars are **build-time** — Vite inlines them into the bundle. Changing
one has no effect until the next build, so always redeploy after editing.

| Variable            | Staging                                          | Production                            |
| ------------------- | ------------------------------------------------ | ------------------------------------- |
| `VITE_SITE_URL`     | the staging `*.up.railway.app` URL               | `https://australianpokercalendar.com` |
| `VITE_FORMSPREE_ID` | a **separate** Formspree form, or blank          | the real form                         |
| `VITE_GA_ID`        | **blank** — never pollute real analytics         | the real `G-XXXXXXXXXX`               |
| `VITE_SENTRY_DSN`   | optional; useful for catching errors pre-release | the DSN if used                       |
| `VITE_NOINDEX`      | `true` — keeps staging out of search             | **never set**                         |

`VITE_SITE_URL` drives canonical/OG tags and the post-build rewrite of
`sitemap.xml` / `robots.txt` (`scripts/gen-seo-files.mjs`). Pointing staging at
the production domain would publish canonicals claiming to _be_ production — set
it to the staging URL.

Give staging its own Formspree form (or leave it blank) so test submissions never
hit the real inbox. The browser never talks to Formspree: both forms post to the
site's own `/api/enquiry`, which saves the enquiry for the dashboard and then
emails it on through Formspree, so `VITE_FORMSPREE_ID` is also read by the
server at run time.

### Run-time variables and the data volume

| Variable         | Purpose                                                                  |
| ---------------- | ------------------------------------------------------------------------ |
| `ADMIN_PASSWORD` | opens `/admin` (see CLAUDE.md, "Dashboard")                              |
| `DATA_DIR`       | where `server/store.mjs` keeps `enquiries.json` and `traffic/<day>.json` |

Railway's filesystem is wiped on every deploy, so **each environment needs a
volume** (service → Settings → Volumes) mounted at, say, `/data`, with
`DATA_DIR=/data`. Without one, enquiries and the traffic tally start from empty
after every push; the email copy of each enquiry still arrives via Formspree.

---

## Keeping staging out of Google

Set `VITE_NOINDEX=true` on the **staging** environment
(and never on production). On the next build:

- `scripts/gen-seo-files.mjs` overwrites `dist/robots.txt` with
  `User-agent: *` / `Disallow: /`.
- `src/lib/seo.jsx` emits `<meta name="robots" content="noindex, nofollow" />`
  on every page of that build.

Like every `VITE_*` var it is **build-time** — setting it does nothing until the
next deploy. The production environment must **never** have it set. Verify
`curl https://australianpokercalendar.com/robots.txt` still allows crawling after every
production deploy.

(Independently of this flag, the 404 page always carries `noindex` — an SPA 404
returns HTTP 200, so crawlers are told explicitly.)

---

## Per-environment verification

**After a staging deploy** — every route loads (`/`, `/poker-calendar/2026`,
`/poker-calendar/2027`, `/players`, `/about`, `/contact`, `/privacy`, `/terms`, a 404 path), contact form submits to the
staging form, no console errors.

**After a production deploy** — all of the above on the real domain, plus:
`sitemap.xml` and `robots.txt` show the real domain (not `example.com`), the
contact form reaches the real inbox, GA4 registers a pageview, and Lighthouse
still clears performance ≥ 90 / SEO ≥ 95 / a11y ≥ 90.

Report results with evidence — URLs and observed behavior, not vibes.

---

## Alternative: manual promotion instead of a `production` branch

If the release cadence is ad hoc and a second branch is overhead, you can
run a single-branch setup instead: point **both** environments at `main`, turn
**off** auto-deploy on the production service, and promote by triggering a deploy
manually (`mcp__railway__deploy` or the dashboard's Deploy button).

Trade-off: you lose the git record of what's live. The `production` branch is the
default for exactly that reason — `git log production` answers "what is live right now?" without opening Railway.
