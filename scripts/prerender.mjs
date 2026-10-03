// Post-build step: turn the SPA into a set of real HTML documents.
//
// Runs after `vite build` (browser bundle) and `vite build --ssr` (the
// prerender entry). For every route in src/routes.js it renders the page to a
// string and writes dist/<route>/index.html, complete with that page's own
// title, description, canonical, Open Graph tags and JSON-LD.
//
// See src/entry-prerender.jsx for why. Short version: without this, every
// crawler that does not execute JavaScript — Bing, the AI crawlers, every
// social unfurler — sees an empty document, and nothing in the page body
// (including the footer credit link) exists as far as they are concerned.
//
// Pure Node, no headless browser, so it runs in any build environment.

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(root, 'dist')
const SSR = join(root, '.prerender')

const TEMPLATE = join(DIST, 'index.html')
const ENTRY = join(SSR, 'entry-prerender.js')

function fail(message) {
  console.error(`[prerender] ${message}`)
  process.exit(1)
}

if (!existsSync(TEMPLATE)) fail('dist/index.html missing — run `vite build` first.')
if (!existsSync(ENTRY)) fail('.prerender/entry-prerender.js missing — run `yarn build:ssr` first.')

const manifestFile = join(DIST, '.vite', 'manifest.json')
if (!existsSync(manifestFile)) {
  fail('dist/.vite/manifest.json missing — `build.manifest` in vite.config.js is what writes it.')
}
const viteManifest = JSON.parse(await readFile(manifestFile, 'utf8'))

const { render, prepare, themeStyles, PRERENDER_ROUTES, routeModules, siteConfig } = await import(
  pathToFileURL(ENTRY).href
)

// --- og:image ----------------------------------------------------------------
//
// Facebook, LinkedIn, X and iMessage all ignore SVG, so an SVG og:image means a
// blank card everywhere a link is shared. The template ships og-image.svg as a
// placeholder and the old note to "replace before launch" lived in a code
// comment, which is exactly the kind of instruction that gets missed. This
// fails the build instead.
//
// Dimensions are read from the file header rather than by adding an image
// library — a few bytes per format, and the build stays dependency-free.
function imageSize(buf) {
  // PNG: 8-byte signature, then the IHDR chunk carries width/height as u32be.
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }
  // JPEG: walk the marker segments to a Start-Of-Frame, which holds the size.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i += 1
        continue
      }
      const marker = buf[i + 1]
      // SOF0-SOF15, excluding DHT (c4), JPG (c8) and DAC (cc).
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) }
      }
      i += 2 + buf.readUInt16BE(i + 2)
    }
  }
  // WebP: RIFF container, size lives in the VP8X / VP8 / VP8L chunk.
  if (
    buf.length > 30 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const chunk = buf.toString('ascii', 12, 16)
    if (chunk === 'VP8X') {
      return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) }
    }
    if (chunk === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
    }
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
  }
  return null
}

function assertOgImage() {
  const src = siteConfig?.seo?.ogImage
  if (!src) fail('site.config.js has no seo.ogImage — social shares get no card at all.')
  if (/^https?:/i.test(src)) return // hosted elsewhere; not ours to validate

  if (/\.svgz?$/i.test(src)) {
    fail(
      `seo.ogImage is "${src}". Facebook, LinkedIn, X and iMessage all ignore SVG, ` +
        'so every shared link would render a blank card. Export a 1200x630 PNG or ' +
        'JPG into public/brand/ and point seo.ogImage at it.',
    )
  }

  const file = join(DIST, src.replace(/^\//, ''))
  if (!existsSync(file)) {
    fail(`seo.ogImage is "${src}" but ${file} does not exist — the card would 404.`)
  }

  const size = imageSize(readFileSync(file))
  if (!size) {
    fail(`seo.ogImage "${src}" is not a PNG, JPEG or WebP — social platforms will not render it.`)
  }
  // 1200x630 is the spec. Larger is fine (retina), and a couple of pixels of
  // rounding is not worth failing a build over, but the shape has to be right
  // or the card is cropped.
  const ratio = size.width / size.height
  if (size.width < 1200 || ratio < 1.85 || ratio > 1.95) {
    fail(
      `seo.ogImage "${src}" is ${size.width}x${size.height}. It needs to be at least ` +
        '1200px wide at roughly 1.91:1 (1200x630), or the card is cropped or refused.',
    )
  }
  // The head declares og:image:width/height from site.config so the card
  // renders on the first share; a stale declaration crops it instead.
  const declared = { width: siteConfig.seo.ogImageWidth, height: siteConfig.seo.ogImageHeight }
  if (declared.width !== size.width || declared.height !== size.height) {
    fail(
      `site.config.js declares seo.ogImageWidth/Height as ${declared.width}x${declared.height} ` +
        `but ${src} is ${size.width}x${size.height}. Update the config to match the file.`,
    )
  }
  // The shipped placeholder is named for what it is, so this can tell "nobody
  // has made a card yet" from "this is the real card" without hashing bytes.
  // Harmless while VITE_SITE_URL is unset or example.com — that is a scaffold
  // being built locally. Once there is a real domain, the site is going live
  // with a card that says "replace this card before launch", so stop the build.
  const siteUrl = process.env.VITE_SITE_URL || ''
  const realDomain = siteUrl && !/example\.com/.test(siteUrl)
  if (src.includes('.placeholder.') && realDomain) {
    fail(
      `seo.ogImage is still the template placeholder (${src}) but VITE_SITE_URL is ` +
        `${siteUrl}. Export the site's own 1200x630 card to public/brand/ and point ` +
        'seo.ogImage at it before shipping.',
    )
  }

  console.log(`[prerender] og:image ${src} — ${size.width}x${size.height} OK`)
}

// Resolves every lazy page module, so render() emits the real page instead of
// a Suspense fallback. Must happen before the first render.
await prepare()

const template = await readFile(TEMPLATE, 'utf8')

// --- Entry stylesheet, inlined ----------------------------------------------
// The entry stylesheet is the one request between the HTML and the first paint
// on every route: the browser will not paint until it lands, so on a phone it
// costs a full round trip before anything shows (Lighthouse's "render-blocking
// requests"). It is small once compressed, so each document carries it as a
// <style> instead. The fonts it names are then discovered with the HTML.
//
// Only the entry's: a route's own stylesheet stays a <link>, because the
// client's lazy loader looks for that <link> before fetching the route's CSS
// and would request it again if it were inlined.
const entryStyles = await Promise.all(
  (Object.values(viteManifest).find((entry) => entry.isEntry)?.css ?? []).map(async (file) => ({
    file,
    css: await readFile(join(DIST, file), 'utf8'),
  })),
)

function inlineEntryStyles(doc) {
  for (const { file, css } of entryStyles) {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const tag = new RegExp(`<link rel="stylesheet"[^>]*href="/${escaped}"[^>]*>`)
    if (!tag.test(doc)) {
      fail(
        `the entry stylesheet /${file} is not linked from dist/index.html, so it cannot be inlined.`,
      )
    }
    doc = doc.replace(tag, () => `<style>${css}</style>`)
  }
  return doc
}

const shell = inlineEntryStyles(template)

assertOgImage()

// --- Route assets ------------------------------------------------------------
// Vite code-splits each page's CSS into its own file, which the browser only
// requests once the route's JS chunk has run. A prerendered document would
// therefore paint against the entry stylesheet and restyle when its own CSS
// lands. Linking it from the document instead lets the preload scanner start it
// with the HTML.

/** CSS and JS a route needs, walked transitively through the import graph. */
function assetsFor(moduleId) {
  const css = new Set()
  const js = new Set()
  const seen = new Set()

  const walk = (id) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    const entry = viteManifest[id]
    if (!entry) return
    for (const file of entry.css || []) css.add(file)
    // The entry chunk is already in the template's script tag; only the route's
    // own chunk and its shared dependencies need preloading.
    if (entry.file && !entry.isEntry) js.add(entry.file)
    for (const dep of entry.imports || []) walk(dep)
  }

  walk(moduleId)
  return { css: [...css], js: [...js] }
}

/**
 * Assets index.html already references.
 *
 * Vite writes the entry's stylesheet and its modulepreloads into the template,
 * so anything matched here is emitted already and must not be repeated.
 */
const templateAssets = new Set(
  [...template.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map((m) => m[1]),
)

// index.html carries a fallback <title>/description/OG block for `vite dev`,
// where nothing prerenders. In a built document Helmet supplies the real tags,
// so the fallback is stripped rather than left to duplicate them — two <title>
// elements in one document is a genuine SEO fault, not a cosmetic one.
const FALLBACK = /<!--\s*seo:fallback:start\s*-->[\s\S]*?<!--\s*seo:fallback:end\s*-->/

// The studio credit is the reason the footer has to be in the static HTML at
// all: it only counts as a backlink if a crawler that skips JS can see it.
// Plain https://onraistudio.com/ (no www) lands without a redirect; an ordinary
// link, never rel="nofollow". Checked on every document so a footer restyle
// that drops or rewrites it fails the build instead of shipping silently.
const CREDIT_HREF = 'https://onraistudio.com/'
const CREDIT_TEXT = 'Site by Onrai Studio'

function assertStudioCredit(html) {
  const link = html.match(/<a\s[^>]*href="https:\/\/onraistudio\.com\/"[^>]*>[^<]*<\/a>/)?.[0]
  if (!link) throw new Error(`the studio credit <a href="${CREDIT_HREF}"> is not in the markup.`)
  if (!link.includes(`>${CREDIT_TEXT}<`)) {
    throw new Error(`the studio credit must read "${CREDIT_TEXT}", got: ${link}`)
  }
  if (/nofollow/i.test(link)) throw new Error('the studio credit must not carry rel="nofollow".')
}

// A prerendered document must be readable with JavaScript switched off, and
// `style="opacity:0"` is how that quietly stops being true. framer-motion
// renders a motion element's `initial` styles during renderToString, so one
// entrance written `initial={{ opacity: 0 }}` ships the section it wraps
// invisible — hidden text to a crawler, and a section that blanks and fades
// back in under the visitor's scroll once React hydrates over the static
// paint. src/lib/motion.js keeps entrances inert to prevent it; this is the
// guard that stops a new one being added without anyone noticing.
//
// aria-hidden elements are exempt: a decorative layer is meant to be invisible
// and carries no content a crawler should read.
function assertNoHiddenContent(html) {
  const hidden = [...html.matchAll(/<[a-z][^>]*style="[^"]*opacity: ?0(?![.\d])[^"]*"[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => !/aria-hidden="true"/i.test(tag))

  if (hidden.length) {
    throw new Error(
      `${hidden.length} element(s) prerender at opacity 0, so this page ships ` +
        'partly invisible. An entrance animation is rendering its `initial` ' +
        'state into the static HTML — see src/lib/motion.js. First: ' +
        `${hidden[0].slice(0, 120)}`,
    )
  }
}

function buildDocument({ html, head, complete }, assets) {
  assertStudioCredit(html)
  assertNoHiddenContent(html)
  let doc = shell

  if (!FALLBACK.test(doc)) {
    throw new Error(
      'the seo:fallback markers are missing from index.html — without them the ' +
        'fallback tags duplicate the per-page ones.',
    )
  }
  // Swap the fallback block for this route's own tags — but only if there are
  // any. A site whose pages set their title imperatively (a useEffect, not
  // Helmet) renders no head during renderToString, and replacing the block with
  // an empty string would ship documents with no <title> at all: worse than the
  // shared fallback it removed. Keeping the fallback means every page carries
  // the site-level title until per-page tags exist.
  doc = head.trim() ? doc.replace(FALLBACK, () => head) : doc

  // This route's own stylesheets, render-blocking on purpose: the document must
  // not paint before the CSS that lays it out.
  const links = assets.css
    .filter((file) => !templateAssets.has(`/${file}`))
    .map((file) => `    <link rel="stylesheet" crossorigin href="/${file}" />`)

  // Its JS chunk, preloaded so main.jsx is not waiting on the entry bundle to
  // run before the browser discovers what to fetch next.
  const preloads = assets.js
    .filter((file) => !templateAssets.has(`/${file}`))
    .map((file) => `    <link rel="modulepreload" crossorigin href="/${file}" />`)

  // Design tokens as a real stylesheet. applyTheme() sets these from JS at
  // runtime; inlining them means the static document paints correctly before
  // the bundle has run, instead of flashing unstyled.
  const injected = [...links, ...preloads, `    <style id="theme-tokens">${themeStyles}</style>`]

  // Match the leading whitespace too, so the injected block controls its own
  // indentation rather than inheriting the closing tag's.
  doc = doc.replace(/[ \t]*<\/head>/, () => `${injected.join('\n')}\n  </head>`)

  // data-prerender tells src/main.jsx whether this markup is hydratable.
  // "full" — the whole tree rendered, so React adopts the DOM. Anything else
  // means a page module was missing, and React must not try to adopt a body
  // that does not match what it is about to render.
  // An exact placeholder, and its absence is a hard failure rather than a
  // no-op. A String.replace that matches nothing returns the string unchanged,
  // so a document with anything inside #root — say a hand-written fallback
  // footer left over from before this pipeline existed — would quietly ship
  // with no page body at all, looking like a successful build. That happened.
  const PLACEHOLDER = '<div id="root"></div>'
  if (!doc.includes(PLACEHOLDER)) {
    throw new Error(
      `index.html has no exact ${PLACEHOLDER} for the rendered body to replace. ` +
        'Empty it — the prerender is what puts real content (and the studio ' +
        'credit) in the page now, and anything left inside #root is markup the ' +
        'visitor sees before React wipes it.',
    )
  }
  doc = doc.replace(
    PLACEHOLDER,
    () => `<div id="root" data-prerender="${complete ? 'full' : 'partial'}">${html}</div>`,
  )
  return doc
}

// The untouched shell, kept for routes that deliberately have no static
// document (a catalogue page whose data only exists at runtime, an auth-gated
// area). The server serves THIS for them — not dist/index.html, which is about
// to become the prerendered home page. Handing the home page's markup to
// /shop/some-product would show a crawler the wrong content and, worse, leave
// main.jsx trying to hydrate the product route against the home page's DOM,
// which React rejects outright.
await writeFile(join(DIST, 'app-shell.html'), template)

const written = []
const failed = []
const incomplete = []

for (const route of PRERENDER_ROUTES) {
  // The catch-all renders at its prerenderAs path — StaticRouter needs a
  // concrete location, and '*' is not one.
  // The concrete URL to render. It is NOT route.path: a parameterised route's
  // path is a pattern (/models/:slug), and rendering that literally makes
  // useParams() return ":slug", so the page looks its record up, finds
  // nothing and redirects — writing a correctly-named file containing an
  // empty page. src/routes.js expands each pattern into one entry per real
  // value and carries the URL on `location`; the catch-all uses its `out`
  // (/404) because StaticRouter cannot be given '*'.
  const location = route.location || (route.path === '*' ? route.out : route.path)
  try {
    // An eager route is compiled into the entry chunk rather than split out, so
    // Rollup gives it no manifest entry and its CSS is already in the entry
    // stylesheet. Only a split route is expected to appear.
    if (route.module && !route.eager && !viteManifest[route.module]) {
      throw new Error(
        `module "${route.module}" is not in dist/.vite/manifest.json — the route ` +
          'table and the import path have drifted apart.',
      )
    }
    const result = render(location)
    if (!result.complete) incomplete.push(route.out)
    const doc = buildDocument(result, assetsFor(routeModules(location)[0]))

    const outDir = route.out === '/' ? DIST : join(DIST, route.out.slice(1))
    await mkdir(outDir, { recursive: true })
    await writeFile(join(outDir, 'index.html'), doc)

    written.push(route.out)
    const kb = (Buffer.byteLength(doc) / 1024).toFixed(1)
    console.log(`[prerender] ${route.out.padEnd(20)} ${kb.padStart(7)} kB`)
  } catch (err) {
    failed.push(route.out)
    console.error(`[prerender] FAILED ${route.out}: ${err.message}`)
  }
}

// A route that silently fell back to the client-rendered shell is the exact
// regression this script exists to prevent, so either failure mode fails the
// build rather than shipping an invisible page.
if (failed.length) fail(`${failed.length} route(s) failed to render: ${failed.join(', ')}`)
if (incomplete.length) {
  fail(
    `${incomplete.length} route(s) rendered without a page body: ${incomplete.join(', ')}. ` +
      'A page module failed to load — see src/lazyWithRetry.js.',
  )
}

// Canonicals and OG urls come from site.config.seo.siteUrl, which reads
// VITE_SITE_URL at build time. Unset, every document ships example.com — worth
// a warning, not a failure, since `yarn build` runs plenty of times pre-launch.
const home = await readFile(join(DIST, 'index.html'), 'utf8')
if (home.includes('https://example.com')) {
  console.warn(
    '[prerender] VITE_SITE_URL is not set — canonical and og:url tags point at ' +
      'https://example.com. Set it before deploying.',
  )
}

// sitemap.xml, generated from the same route table that was just rendered.
//
// It used to be a hand-written file in public/ listing six URLs, which meant a
// new page was live, prerendered and linked while the sitemap still described
// the old site — and nothing failed. Deriving it here makes that impossible:
// a route either rendered a document or it is not in the sitemap.
//
// `noindex` routes are excluded (the 404 catch-all, a staging-only page): asking
// Google to crawl a URL and then telling it not to index it is a contradiction.
// The domain stays as the placeholder; scripts/gen-seo-files.mjs swaps it for
// VITE_SITE_URL, the same way it does for robots.txt.
const SITEMAP_PLACEHOLDER = 'https://example.com'

function sitemapPriority(route) {
  if (route.out === '/') return '1.0'
  // Two segments or more is a detail page under a section — one step down.
  return route.out.split('/').filter(Boolean).length > 1 ? '0.6' : '0.8'
}

// <lastmod>: the date of the last commit that touched the route's page module
// or any content file it draws on (followed through content -> content
// imports), so a new series row moves every page that lists it. Google acts on
// lastmod only while it stays truthful, which is why this is not the build
// date — that would mark every page changed on every deploy, and Google would
// learn to ignore it. Omitted entirely when git is not available (a build from
// a tarball), which is the honest fallback.
const CONTENT_DIR = join(root, 'src', 'content')

/** The content files a module pulls in, transitively through src/content. */
function contentDeps(file, seen = new Set()) {
  if (!existsSync(file) || seen.has(file)) return seen
  seen.add(file)
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/from\s+'(\.\.?\/[^']*content\/[^']+\.js)'/g)) {
    contentDeps(join(dirname(file), match[1]), seen)
  }
  for (const match of source.matchAll(/from\s+'(\.\/[^']+\.js)'/g)) {
    const dep = join(dirname(file), match[1])
    if (dep.startsWith(CONTENT_DIR)) contentDeps(dep, seen)
  }
  return seen
}

const lastmodCache = new Map()
function lastmodFor(route) {
  const page = join(root, route.module)
  const files = [...contentDeps(page)]
  const key = files.join('|')
  if (!lastmodCache.has(key)) {
    let stamp = ''
    try {
      stamp = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...files], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    } catch {
      stamp = ''
    }
    lastmodCache.set(key, stamp ? stamp.slice(0, 10) : '')
  }
  return lastmodCache.get(key)
}

const indexable = PRERENDER_ROUTES.filter((route) => !route.noindex && written.includes(route.out))
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...indexable.map((route) => {
    const lastmod = lastmodFor(route)
    return (
      `  <url><loc>${SITEMAP_PLACEHOLDER}${route.out === '/' ? '/' : route.out}</loc>` +
      (lastmod ? `<lastmod>${lastmod}</lastmod>` : '') +
      `<priority>${sitemapPriority(route)}</priority></url>`
    )
  }),
  '</urlset>',
  '',
].join('\n')
if (!indexable.some((route) => lastmodFor(route))) {
  console.warn('[prerender] git history unavailable — sitemap.xml written without <lastmod>.')
}
await writeFile(join(DIST, 'sitemap.xml'), sitemap)
console.log(`[prerender] sitemap.xml — ${indexable.length} indexable URLs`)

// The manifest tells server/index.mjs which paths have a real document, which
// is how it tells a page from a 404 instead of serving a 200 shell for every
// unknown URL.
await writeFile(
  join(DIST, 'prerender-manifest.json'),
  JSON.stringify({ routes: written, generatedAt: new Date().toISOString() }, null, 2),
)

// The SSR bundle is a build artefact, not something to deploy.
await rm(SSR, { recursive: true, force: true })

console.log(`[prerender] ${written.length} routes written`)
