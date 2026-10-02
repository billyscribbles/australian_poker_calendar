# Environments & Release Flow

Every site built from this Foundation runs **two environments on one Railway
project**. This file is the contract — set it up this way on every new clone,
before the first deploy.

|                           | Staging                                                                      | Production                           |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------ |
| Git branch                | `main`                                                                       | `production`                         |
| Railway environment       | `staging`                                                                    | `production` (Railway's default env) |
| Deploys when              | every push to `main`, CI green                                               | every push to `production`, CI green |
| Domain                    | `<service>.up.railway.app`                                                   | the client's real domain             |
| Indexed by search engines | **no** (see [Keeping staging out of Google](#keeping-staging-out-of-google)) | yes                                  |
| Analytics (`VITE_GA_ID`)  | blank                                                                        | client's GA4 ID                      |
| Audience                  | Billy + client review                                                        | the public                           |

```
feature/xyz ──PR──▶ main ──auto──▶ staging.up.railway.app
                     │
                     └── git merge --ff-only ──▶ production ──auto──▶ client.com
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

### Set up a new clone

```bash
git init && git add -A && git commit -m "Initial commit from Foundation template"
git branch -M main
git branch production            # production starts identical to main
git remote add origin git@github.com:<org>/<client>.git
git push -u origin main
git push -u origin production
```

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

Tag releases if the client wants a changelog:
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

## Railway setup (once per client)

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
   client's custom domain to **production only**.

### Custom domains and `allowedHosts`

**Attaching a custom domain needs no code change.** `yarn start` runs
`server/index.mjs` (a plain Node server, added with the prerender pipeline), and it
serves any Host header. The blank-403-on-the-live-domain failure mode that used to
follow a forgotten `allowedHosts` entry is gone.

`vite.config.js` still ships `preview.allowedHosts: ['.up.railway.app']` for anyone
running `vite preview` directly to debug a build. If you do that against a custom
domain, append it literally:

```js
allowedHosts: ['.up.railway.app', 'client.com', 'www.client.com'],
```

A `www` → apex redirect is **not** in the template. If the client has both hostnames
attached, add the 301 to `server/index.mjs` — otherwise Google sees two complete
copies of the site.

---

## Environment variables

All `VITE_*` vars are **build-time** — Vite inlines them into the bundle. Changing
one has no effect until the next build, so always redeploy after editing.

| Variable            | Staging                                          | Production              |
| ------------------- | ------------------------------------------------ | ----------------------- |
| `VITE_SITE_URL`     | the staging `*.up.railway.app` URL               | `https://client.com`    |
| `VITE_FORMSPREE_ID` | a **separate** Formspree form, or blank          | the client's real form  |
| `VITE_GA_ID`        | **blank** — never pollute client analytics       | client's `G-XXXXXXXXXX` |
| `VITE_SENTRY_DSN`   | optional; useful for catching errors pre-release | client's DSN if used    |
| `VITE_NOINDEX`      | `true` — keeps staging out of search             | **never set**           |

`VITE_SITE_URL` drives canonical/OG tags and the post-build rewrite of
`sitemap.xml` / `robots.txt` (`scripts/gen-seo-files.mjs`). Pointing staging at
the production domain would publish canonicals claiming to _be_ production — set
it to the staging URL.

Give staging its own Formspree form (or leave it blank) so test submissions never
hit the client's inbox.

---

## Keeping staging out of Google

Handled by the template — set `VITE_NOINDEX=true` on the **staging** environment
(and never on production). On the next build:

- `scripts/gen-seo-files.mjs` overwrites `dist/robots.txt` with
  `User-agent: *` / `Disallow: /`.
- `src/lib/seo.jsx` emits `<meta name="robots" content="noindex, nofollow" />`
  on every page of that build.

Like every `VITE_*` var it is **build-time** — setting it does nothing until the
next deploy. The production environment must **never** have it set. Verify
`curl https://client.com/robots.txt` still allows crawling after every
production deploy.

(Independently of this flag, the 404 page always carries `noindex` — an SPA 404
returns HTTP 200, so crawlers are told explicitly.)

---

## Per-environment verification

**After a staging deploy** — every route loads (`/`, `/services`, `/about`,
`/contact`, `/privacy`, `/terms`, a 404 path), contact form submits to the
staging form, no console errors.

**After a production deploy** — all of the above on the real domain, plus:
`sitemap.xml` and `robots.txt` show the real domain (not `example.com`), the
contact form reaches the client's inbox, GA4 registers a pageview, and Lighthouse
still clears performance ≥ 90 / SEO ≥ 95 / a11y ≥ 90.

Report results with evidence — URLs and observed behavior, not vibes.

---

## Alternative: manual promotion instead of a `production` branch

If a client's release cadence is ad hoc and a second branch is overhead, you can
run a single-branch setup instead: point **both** environments at `main`, turn
**off** auto-deploy on the production service, and promote by triggering a deploy
manually (`mcp__railway__deploy` or the dashboard's Deploy button).

Trade-off: you lose the git record of what's live. The `production` branch is the
default for exactly that reason — `git log production` answers "what's on the
client's site right now?" without opening Railway.
