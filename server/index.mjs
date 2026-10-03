// Production server for the built site. `yarn start` on Railway runs this.
//
// `vite preview` used to hold this job and cannot keep it once the build
// prerenders routes, for two reasons:
//
//   1. It answers every unknown URL with a 200 and the app shell. With a
//      prerendered index.html that means Google gets the homepage's markup at
//      /whatever-typo — a soft 404, and duplicate content on an infinite
//      number of URLs.
//   2. It has no notion of which paths are real, so a genuine 404 never gets a
//      404 status.
//
// Beyond that this does what a static host has to get right for search: one
// canonical URL per page (no trailing-slash twins) and long-lived caching on
// the hashed assets so the Lighthouse budget survives.
//
// It also serves what the dashboard publishes: uploaded media at /media/*
// (with Range support, server/media.mjs), and the home page, the stories
// index and each story rendered at request time with the published content
// (server/render.mjs), plus a sitemap that lists the stories. `vite preview`
// would do none of it.
//
// No dependencies — Node's own http/fs/zlib cover all of it. Add per-site
// concerns (a www -> apex redirect, legacy URL 301s) here when a site needs
// them; the template ships none.

import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs'
import { join, extname, normalize, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createGzip, createBrotliCompress, constants as zlib, gzipSync } from 'node:zlib'
import { pipeline } from 'node:stream'
import { canonicalHost, legacyRedirects, cspExtra } from '../src/config/server.config.js'
import { createAdminHandler } from '../admin/handler.mjs'
import { createApiHandler } from './api.mjs'
import { createMediaHandler } from './media.mjs'
import { createRenderer } from './render.mjs'
import { createStore } from './store.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(root, 'dist')
const PORT = Number(process.env.PORT) || 4173
// Enquiries and the traffic tally, as files under DATA_DIR (a Railway volume
// in production; .data/ locally). See server/store.mjs.
const store = createStore()
// The forms post here; the record is saved, then emailed via Formspree.
const api = createApiHandler({ store })
// The dashboard at /admin. Local connections only unless ADMIN_PASSWORD is
// set; see admin/handler.mjs.
// Uploaded images and video, from the store's media folder, with Range support.
const media = createMediaHandler({ dir: store.content.mediaDir })
// The home page, the stories index and each story, rendered at request time
// from the published content; see server/render.mjs.
const renderer = createRenderer({ dist: DIST, store })
renderer.ready.then((ok) => {
  if (!ok) console.error(`[server] live rendering is off: ${renderer.error}`)
})
const admin = createAdminHandler({ store, renderer })
const HOST = process.env.HOST || '0.0.0.0'

// Routes scripts/prerender.mjs wrote real HTML for. Anything outside this list
// is a genuine 404 — the distinction an SPA fallback cannot make on its own,
// and the reason soft 404s are so common on React sites.
const manifestPath = join(DIST, 'prerender-manifest.json')
const PRERENDERED = existsSync(manifestPath)
  ? new Set(JSON.parse(readFileSync(manifestPath, 'utf8')).routes)
  : new Set()

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webmanifest': 'application/manifest+json',
}

const COMPRESSIBLE = /^(text\/|application\/(json|xml|javascript|manifest)|image\/svg)/

function cacheControl(pathname, ext) {
  // Vite writes content-hashed filenames into /assets, so those can never go
  // stale behind a URL — cache for a year and never revalidate.
  if (pathname.startsWith('/assets/')) return 'public, max-age=31536000, immutable'
  // HTML is the deploy pointer. It must revalidate or a redeploy is invisible
  // to anyone holding a warm cache.
  if (ext === '.html' || ext === '') return 'public, max-age=0, must-revalidate'
  // robots and sitemap change with content, not with a hash.
  if (ext === '.xml' || ext === '.txt') return 'public, max-age=3600'
  // Fonts and images are unhashed but effectively immutable in practice.
  return 'public, max-age=2592000'
}

// The Content-Security-Policy baseline: exactly what this template loads.
//
// 'unsafe-inline' for styles is unavoidable and deliberate — the prerender
// inlines the theme tokens as a <style> block, and framer-motion sets inline
// styles on elements. It is also the least dangerous of the unsafe-* values:
// there is no 'unsafe-inline' for scripts here, which is the one that matters.
//
// A page that adds an embed names its origins in cspExtra
// (src/config/server.config.js) rather than editing this.
const CSP_BASE = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'script-src': ["'self'", 'https://www.googletagmanager.com'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'img-src': [
    "'self'",
    'data:',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
  ],
  'connect-src': [
    "'self'",
    'https://www.google-analytics.com',
    'https://region1.google-analytics.com',
  ],
}

const CSP = Object.entries(CSP_BASE)
  .map(([directive, sources]) => [directive, [...sources, ...(cspExtra[directive] ?? [])]])
  .concat(Object.entries(cspExtra).filter(([d]) => !(d in CSP_BASE)))
  .map(([directive, sources]) => `${directive} ${[...new Set(sources)].join(' ')}`)
  .join('; ')

// Mirrors the headers vite.config.js sets on `vite preview`.
function securityHeaders(res, { html = false } = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // Two years, subdomains included: the value Chrome's preload list requires.
  // Only meaningful over TLS, which Railway terminates in front of this.
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  // Only on documents. Sending it with every hashed asset costs bytes on every
  // request and protects nothing the document's own policy does not already.
  if (html) res.setHeader('Content-Security-Policy', CSP)
}

/** Guard against `..` escaping dist. */
function safeJoin(base, target) {
  const p = normalize(join(base, target))
  return p.startsWith(base + sep) || p === base ? p : null
}

function serveFile(req, res, filePath, status = 200, extraHeaders = {}) {
  const stat = statSync(filePath)
  const ext = extname(filePath)
  const type = MIME[ext] || 'application/octet-stream'
  const etag = `W/"${stat.size}-${stat.mtimeMs}"`
  const pathname = new URL(req.url, 'http://localhost').pathname

  securityHeaders(res, { html: type.startsWith('text/html') })
  res.setHeader('ETag', etag)

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304)
    return res.end()
  }

  res.setHeader('Content-Type', type)
  res.setHeader('Vary', 'Accept-Encoding')
  res.setHeader('Cache-Control', cacheControl(pathname, ext))
  res.setHeader('Last-Modified', stat.mtime.toUTCString())
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v)

  const accept = req.headers['accept-encoding'] || ''
  let encoder = null
  if (COMPRESSIBLE.test(type) && stat.size > 1024) {
    if (/\bbr\b/.test(accept)) {
      res.setHeader('Content-Encoding', 'br')
      encoder = createBrotliCompress({ params: { [zlib.BROTLI_PARAM_QUALITY]: 5 } })
    } else if (/\bgzip\b/.test(accept)) {
      res.setHeader('Content-Encoding', 'gzip')
      encoder = createGzip({ level: 6 })
    }
  }
  if (!encoder) res.setHeader('Content-Length', String(stat.size))

  res.statusCode = status
  if (req.method === 'HEAD') return res.end()

  const onError = (err) => {
    if (err) res.destroy()
  }
  const stream = createReadStream(filePath)
  if (encoder) pipeline(stream, encoder, res, onError)
  else pipeline(stream, res, onError)
}

/** An in-memory document (a live page, the sitemap): ETag from its bytes, gzip when asked. */
function sendDocument(req, res, body, { type, cacheControl, status = 200 }) {
  const buffer = Buffer.from(body)
  const etag = `W/"${createHash('sha1').update(buffer).digest('base64url').slice(0, 20)}"`
  securityHeaders(res, { html: type.startsWith('text/html') })
  res.setHeader('ETag', etag)
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304)
    return res.end()
  }
  res.setHeader('Content-Type', type)
  res.setHeader('Vary', 'Accept-Encoding')
  res.setHeader('Cache-Control', cacheControl)
  let out = buffer
  if (buffer.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    res.setHeader('Content-Encoding', 'gzip')
    out = gzipSync(buffer, { level: 6 })
  }
  res.setHeader('Content-Length', String(out.length))
  res.statusCode = status
  if (req.method === 'HEAD') return res.end()
  res.end(out)
}

/** One line in the traffic tally. The address never reaches the disk. */
function recordView(req, pathname) {
  const forwarded = req.headers['x-forwarded-for']
  store.recordView({
    path: pathname,
    referrer: req.headers.referer || '',
    host: req.headers.host || '',
    ip: (forwarded ? String(forwarded).split(',')[0].trim() : req.socket?.remoteAddress) || '',
    ua: req.headers['user-agent'] || '',
  })
}

/** The HTML document for a route, if the prerender wrote one. */
function documentFor(route) {
  const file = route === '/' ? join(DIST, 'index.html') : join(DIST, route.slice(1), 'index.html')
  return existsSync(file) ? file : null
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  // One hostname per site. Runs first and covers EVERY path — a host that
  // redirects "/" but 404s "/about" breaks every deep link into it, which is
  // the failure mode this is written against. Localhost and the Railway-
  // generated domain are left alone so previews keep working.
  const host = (req.headers.host || '').toLowerCase().split(':')[0]
  if (
    canonicalHost &&
    host &&
    !host.endsWith('.railway.app') &&
    !/^(localhost|127\.|\[?::1)/.test(host)
  ) {
    const isWww = host.startsWith('www.')
    const wantsWww = canonicalHost === 'www'
    if (isWww !== wantsWww) {
      const target = wantsWww ? `www.${host}` : host.replace(/^www\./, '')
      securityHeaders(res)
      res.writeHead(301, {
        Location: `https://${target}${pathname}${url.search}`,
        'Cache-Control': 'public, max-age=3600',
      })
      return res.end()
    }
  }

  // The two things that take a POST: the forms' endpoint and the dashboard
  // (its sign-in). Both before the method check, which refuses everything
  // else, and before the trailing-slash rule, which the dashboard needs the
  // other way round (relative URLs in its page resolve against /admin/).
  if (api(req, res)) return
  if (admin(req, res)) return

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    return res.end('Method Not Allowed')
  }

  // Uploaded media. Before the trailing-slash rule and the dist lookup: the
  // files are not in dist, and they take Range requests.
  if (media(req, res)) return

  // URLs the old site ranked for. Before the file lookup, so a legacy path that
  // happens to collide with a real asset name still redirects.
  const legacy = legacyRedirects[pathname.replace(/\/+$/, '') || '/']
  if (legacy) {
    securityHeaders(res)
    res.writeHead(301, { Location: legacy, 'Cache-Control': 'public, max-age=86400' })
    return res.end()
  }

  // One canonical URL per page. /about/ and /about are otherwise two live URLs
  // serving identical HTML, which is duplicate content Google has to resolve
  // for us. Canonicals are written without the trailing slash, so that wins.
  if (pathname.length > 1 && pathname.endsWith('/')) {
    securityHeaders(res)
    res.writeHead(301, {
      Location: pathname.replace(/\/+$/, '') + url.search,
      'Cache-Control': 'public, max-age=3600',
    })
    return res.end()
  }

  // The sitemap, with the published stories added. dist/sitemap.xml is a real
  // file, so this has to come before the file lookup.
  if (pathname === '/sitemap.xml') {
    const xml = await renderer.sitemap()
    if (xml) {
      return sendDocument(req, res, xml, {
        type: MIME['.xml'],
        cacheControl: 'public, max-age=3600',
      })
    }
  }

  // A real file on disk: hashed assets, fonts, images, robots.txt, sitemap.xml.
  const filePath = safeJoin(DIST, pathname)
  if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
    return serveFile(req, res, filePath)
  }

  // A live route: the home page and the stories, rendered with the published
  // content. Ahead of the prerendered lookup, which holds the build-time
  // versions of "/" and "/stories" (demo content) as the fallback.
  const live = await renderer.page(pathname)
  if (live) {
    if (req.method === 'GET') recordView(req, pathname)
    return sendDocument(req, res, live, {
      type: MIME['.html'],
      cacheControl: 'public, max-age=0, must-revalidate',
    })
  }

  // A prerendered page. A document, not an asset, so it counts as a view.
  if (PRERENDERED.has(pathname)) {
    const doc = documentFor(pathname)
    if (doc) {
      if (req.method === 'GET') recordView(req, pathname)
      return serveFile(req, res, doc)
    }
  }

  // Genuinely not here. The 404 document with an actual 404 status — a 200
  // shell would be a soft 404 and Google would index the miss.
  // app-shell.html, not index.html, as the last resort: dist/index.html is the
  // home page's own prerendered markup now, so falling back to it would answer
  // a junk URL with the home page's content. The shell is neutral.
  const shell = join(DIST, 'app-shell.html')
  const notFound = documentFor('/404') || (existsSync(shell) ? shell : join(DIST, 'index.html'))
  if (existsSync(notFound)) {
    return serveFile(req, res, notFound, 404, { 'Cache-Control': 'no-store' })
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('404 Not Found')
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error('[server]', error)
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Internal Server Error')
  })
})

// Railway stops a deploy with SIGTERM; write the last few seconds of views.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    store.flush()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 1000).unref()
  })
}

server.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://localhost:${PORT} (bound to ${HOST})`)
  console.log(`[server] ${PRERENDERED.size} prerendered routes`)
})
