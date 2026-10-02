---
name: railway-deploy
description: Deploy a Foundation client site to Railway. Use when the user says "deploy", "ship to Railway", "push live", "set up hosting", "create the Railway project", or asks to update env vars or check deploy logs for a site built from this template.
---

# Railway deploy — Foundation client sites

Deploys a site built from the Foundation template to Railway, using the Railway
MCP server (configured in `.mcp.json`). This is Step 5 of "The Big Switch" —
the `big-switch` skill hands off here once the site verifies locally.

**Read `docs/ENVIRONMENTS.md` first.** Every site runs two environments on one
project: `main` → the `staging` environment, and the `production` branch → the
`production` environment on the client's real domain. The steps below cover a
single environment; that doc covers which environment you're targeting, the
per-environment env-var matrix, and how a release is promoted. Deploy to staging
first — production is never the default target.

## Prerequisites — check before deploying

1. `railway.json` exists at the repo root (it ships with the template):
   NIXPACKS builder, `startCommand: yarn start`, restart-on-failure.
2. `package.json` has a `start` script — `vite preview --host 0.0.0.0 --port 4173`.
3. `yarn build` passes locally and `yarn lint && yarn test` are green. Never
   deploy a build you have not verified.
4. The Railway MCP tools are available (`mcp__railway__*`). If not, tell the user
   to add the railway MCP server or run `railway login` themselves.

## First deploy — new project

1. `mcp__railway__check-railway-status` — confirm auth.
2. `mcp__railway__list-projects` — check the client doesn't already have one.
3. `mcp__railway__create-project-and-link` — create the project and link this
   repo directory to it.
4. `mcp__railway__link-service` (and `link-environment` if prompted) — attach
   the service Railway provisions.
5. **Set environment variables** with `mcp__railway__set-variables` — mirror the
   site's `.env`:
   - `VITE_FORMSPREE_ID` — required for the contact form
   - `VITE_SITE_URL` — required; the build templates `sitemap.xml`/`robots.txt`
     from it via `scripts/gen-seo-files.mjs`
   - `VITE_GA_ID` — only if the client uses analytics
   - `VITE_SENTRY_DSN` — only if the client uses error monitoring
   These are build-time vars (Vite inlines `VITE_*`), so they must be set
   **before** the deploy build runs.
6. `mcp__railway__deploy` — trigger the deploy.
7. `mcp__railway__generate-domain` — get a public URL (or attach the client's
   custom domain in the Railway dashboard).

## Redeploy / update env vars

- Changed code: `mcp__railway__deploy` again.
- Changed config: `mcp__railway__set-variables`, then redeploy — `VITE_*` vars
  only take effect on the next build.
- Inspect current vars: `mcp__railway__list-variables`.

## Troubleshooting

- `mcp__railway__list-deployments` — deployment history and status.
- `mcp__railway__get-logs` — build or runtime logs. Most failures are a missing
  env var or a build that wasn't verified locally first.

## After every deploy — verify on the live domain

1. Every route loads: `/`, `/services`, `/about`, `/contact`, `/privacy`,
   `/terms`, and a 404 path.
2. The contact form submits against the real Formspree endpoint.
3. `sitemap.xml` and `robots.txt` show the real domain (not `example.com`).
4. Re-run a Lighthouse check on the live URL.

Report results with evidence — the live URL and what you observed — not vibes.
