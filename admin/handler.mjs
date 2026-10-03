// The /admin dashboard as one request handler, mounted three ways:
//
//   server/index.mjs   the production server (yarn preview, yarn start, Railway)
//   vite.config.js     the dev server (yarn dev)
//   admin/server.mjs   on its own (yarn admin)
//
// It answers /admin/ (the page), /admin/app.js, /admin/app.css and the API:
//
//   api/status            runs scripts/series-status.mjs in a fresh process,
//                         so content edits show up on refresh
//   api/enquiries         every form submission in the store, newest first
//   api/enquiries/<id>    POST {handled: true|false} to tick one off
//   api/traffic?days=30   the daily page-view tally
//
// and the Publish section's endpoints (server/content.mjs, server/media.mjs):
//
//   GET    api/stories                 { items } newest first, every status
//   POST   api/stories   {json}        201 the new draft
//   GET    api/stories/<id>            the record | 404
//   PUT    api/stories/<id> {json}     update fields (body sanitised) | 404; 2 MB cap → 413
//   DELETE api/stories/<id>            204 | 404
//   POST   api/stories/<id>/publish    the record | 422 {missing:[...]} | 404
//   POST   api/stories/<id>/unpublish  the record | 404
//                                      the same six under api/shorts
//   PUT    api/media?kind=image|video  raw body → 201 { url, bytes, type } | 400 | 413 | 415
//   GET    preview/stories/<id>        the story as visitors will see it, static (server/render.mjs)
//   GET    vendor/tinymce/<path>       the editor, served from the tinymce package
//
// Everything else falls through to the host server, which is what serves the
// images the page shows.
//
// Access: the page lists organiser emails and phones, so it is never public.
// With ADMIN_PASSWORD set, /admin/ shows its own sign-in page; the right
// password sets a 30-day session cookie (an HMAC under the password, so there
// is no session store and a redeploy keeps you signed in, while changing the
// password signs everyone out). /admin/logout clears it. With no password set,
// only connections from the machine itself are answered; anything else gets
// the same 404 as a URL that does not exist. On Railway the connection comes
// from its proxy, so the password is required there.

import { execFile } from 'node:child_process'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { saveUpload } from '../server/media.mjs'

const ADMIN = dirname(fileURLToPath(import.meta.url))
const ROOT = join(ADMIN, '..')
const STATUS_SCRIPT = join(ROOT, 'scripts', 'series-status.mjs')

const FILES = {
  '': { file: 'index.html', type: 'text/html; charset=utf-8' },
  'app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
  'app.css': { file: 'app.css', type: 'text/css; charset=utf-8' },
}

// TinyMCE, served from the package so the editor needs no cloud key. Yarn PnP
// keeps packages zipped, so tinymce is marked `unplugged` in package.json and
// resolves to real files; without it installed the editor falls back to a
// plain textarea and this stays null.
let TINYMCE_DIR = null
try {
  TINYMCE_DIR = dirname(createRequire(import.meta.url).resolve('tinymce/tinymce.min.js'))
} catch {
  TINYMCE_DIR = null
}
const VENDOR_MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
}

const LOOPBACK = /^(::1|127\.\d+\.\d+\.\d+|::ffff:127\.\d+\.\d+\.\d+)$/

const COOKIE = 'apc_admin'
const SESSION_SECONDS = 30 * 24 * 60 * 60
const MAX_FORM_BYTES = 4096
const MAX_JSON_BYTES = 2 * 1024 * 1024

function status(today) {
  const args = [STATUS_SCRIPT, '--json']
  if (today) args.push(`--today=${today}`)
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      args,
      { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) =>
        error ? reject(new Error(stderr || error.message)) : resolve(stdout),
    )
  })
}

function headers(res, type) {
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  headers(res, type)
  res.statusCode = code
  res.end(body)
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' })
  res.end()
}

function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let failed = false
    req.on('data', (chunk) => {
      if (failed) return
      size += chunk.length
      if (size > limit) {
        // Drain the rest rather than destroy the socket, or the 413 never
        // reaches the client.
        failed = true
        chunks.length = 0
        reject(Object.assign(new Error('too large'), { status: 413 }))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!failed) resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

function readForm(req) {
  return readRaw(req, MAX_FORM_BYTES).then((raw) => new URLSearchParams(raw.toString('utf8')))
}

/** A JSON object body, or a rejection carrying the status to answer with. */
async function readJson(req) {
  const raw = await readRaw(req, MAX_JSON_BYTES)
  try {
    const value = JSON.parse(raw.toString('utf8') || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('not an object')
    return value
  } catch {
    throw Object.assign(new Error('bad json'), { status: 400 })
  }
}

const formError = (res) => (error) =>
  send(res, error.status || 500, error.status === 413 ? 'Form too large' : 'Bad request')

function secure(req) {
  return Boolean(req.socket?.encrypted) || req.headers['x-forwarded-proto'] === 'https'
}

function cookieAttributes(req, prefix, maxAge) {
  const parts = [`Path=${prefix}`, 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAge}`]
  if (secure(req)) parts.push('Secure')
  return parts.join('; ')
}

function loginPage(error) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Sign in · Dashboard</title>
    <link rel="icon" href="../brand/favicon.ico" />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700&display=swap"
    />
    <link rel="stylesheet" href="app.css" />
  </head>
  <body class="login-body">
    <main class="login">
      <form class="login__card" method="post" action="login">
        <div class="brand">
          <span class="brand__mark">APC</span>
          <span class="brand__name">Dashboard</span>
        </div>
        <h1 class="login__title">Sign in</h1>
        <p class="login__lede">Organiser contacts live here, so it stays behind a password.</p>
        <label class="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autocomplete="current-password"
            autofocus
            required
            ${error ? 'aria-invalid="true" aria-describedby="login-error"' : ''}
          />
        </label>
        ${error ? `<p class="login__error" id="login-error" role="alert">${error}</p>` : ''}
        <button type="submit" class="btn login__submit">Sign in</button>
      </form>
    </main>
  </body>
</html>
`
}

/**
 * @param {object} [options]
 * @param {string} [options.prefix]   URL prefix, default '/admin'
 * @param {string} [options.site]     where "open on site" links point; '' = same origin
 * @param {string} [options.password] overrides process.env.ADMIN_PASSWORD
 * @param {ReturnType<typeof import('../server/render.mjs').createRenderer>} [options.renderer]
 *   the live renderer; without one the preview answers 503
 * @param {ReturnType<typeof import('../server/store.mjs').createStore>} [options.store]
 *   enquiries and traffic; without one those sections read as empty
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => boolean}
 *   true when the request was for the dashboard and has been answered
 */
export function createAdminHandler({
  prefix = '/admin',
  site = '',
  password,
  store,
  renderer,
} = {}) {
  const secret = password ?? process.env.ADMIN_PASSWORD ?? ''
  const json = (res, code, value) =>
    send(res, code, JSON.stringify(value), 'application/json; charset=utf-8')

  // Session cookie: "<issued-at hex>.<hmac(issued-at)>" keyed on the password.
  function sign(issued) {
    return createHmac('sha256', secret).update(issued).digest('hex')
  }

  function mintCookie() {
    const issued = Date.now().toString(16)
    return `${issued}.${sign(issued)}`
  }

  function hasSession(req) {
    const match = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`))
    if (!match) return false
    const [issued, mac] = match[1].split('.')
    if (!issued || !mac || !/^[0-9a-f]+$/.test(issued)) return false
    const expected = Buffer.from(sign(issued))
    const given = Buffer.from(mac)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false
    const age = (Date.now() - parseInt(issued, 16)) / 1000
    return age >= 0 && age <= SESSION_SECONDS
  }

  function passwordMatches(given) {
    const a = Buffer.from(given)
    const b = Buffer.from(secret)
    return a.length === b.length && timingSafeEqual(a, b)
  }

  function login(req, res) {
    if (req.method === 'GET' || req.method === 'HEAD') {
      send(res, 401, loginPage(''), 'text/html; charset=utf-8')
      return
    }
    if (req.method !== 'POST') {
      send(res, 405, 'Method Not Allowed')
      return
    }
    readForm(req).then((form) => {
      if (passwordMatches(form.get('password') || '')) {
        res.setHeader(
          'Set-Cookie',
          `${COOKIE}=${mintCookie()}; ${cookieAttributes(req, prefix, SESSION_SECONDS)}`,
        )
        redirect(res, `${prefix}/`)
      } else {
        send(res, 401, loginPage('That password is not right.'), 'text/html; charset=utf-8')
      }
    }, formError(res))
  }

  function logout(req, res) {
    if (req.method !== 'POST') {
      send(res, 405, 'Method Not Allowed')
      return
    }
    res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieAttributes(req, prefix, 0)}`)
    redirect(res, `${prefix}/`)
  }

  /** Answers the request when it may not go further; returns true if it did. */
  function gate(req, res, rest) {
    if (!secret) {
      if (LOOPBACK.test(req.socket?.remoteAddress || '')) return false
      send(res, 404, 'Not found')
      return true
    }
    if (rest === 'login') {
      login(req, res)
      return true
    }
    if (rest === 'logout') {
      logout(req, res)
      return true
    }
    // The sign-in page is styled by the same sheet; it holds no data.
    if (rest === 'app.css' || hasSession(req)) return false
    if (rest.startsWith('api/')) {
      send(res, 401, '{"error":"signed-out"}', 'application/json; charset=utf-8')
    } else if (rest === '') {
      send(res, 401, loginPage(''), 'text/html; charset=utf-8')
    } else {
      send(res, 401, 'Sign in to open the dashboard.')
    }
    return true
  }

  // ------------------------------------------------------------ publishing

  const COLLECTION = /^api\/(stories|shorts)(?:\/([a-z0-9]+)(?:\/(publish|unpublish))?)?$/

  function collectionApi(name) {
    const c = store.content
    return name === 'stories'
      ? {
          list: c.listStories,
          get: c.getStory,
          add: c.addStory,
          update: c.updateStory,
          publish: c.publishStory,
          unpublish: c.unpublishStory,
          remove: c.deleteStory,
        }
      : {
          list: c.listShorts,
          get: c.getShort,
          add: c.addShort,
          update: c.updateShort,
          publish: c.publishShort,
          unpublish: c.unpublishShort,
          remove: c.deleteShort,
        }
  }

  const onBodyError = (res) => (error) =>
    json(res, error.status || 500, { error: error.status === 413 ? 'too-large' : 'bad-body' })

  /** The stories, shorts and media endpoints. True when answered. */
  function publishing(req, res, rest, url) {
    if (rest === 'api/media') {
      if (req.method !== 'PUT') {
        send(res, 405, 'Method Not Allowed')
        return true
      }
      if (!store?.content) {
        json(res, 503, { error: 'no-store' })
        return true
      }
      saveUpload(req, { dir: store.content.mediaDir, kind: url.searchParams.get('kind') }).then(
        (saved) => json(res, 201, { url: saved.url, bytes: saved.bytes, type: saved.type }),
        (error) => json(res, error.status || 500, { error: error.code || 'upload-failed' }),
      )
      return true
    }
    const match = COLLECTION.exec(rest)
    if (!match) return false
    if (!store?.content) {
      json(res, 503, { error: 'no-store' })
      return true
    }
    const [, name, id, action] = match
    const api = collectionApi(name)

    if (action) {
      if (req.method !== 'POST') {
        send(res, 405, 'Method Not Allowed')
        return true
      }
      const result = api[action](id)
      if (!result) json(res, 404, { error: 'not-found' })
      else if (result.missing) json(res, 422, { error: 'missing', missing: result.missing })
      else json(res, 200, result.record ?? result)
      return true
    }
    if (!id) {
      if (req.method === 'GET' || req.method === 'HEAD') json(res, 200, { items: api.list() })
      else if (req.method === 'POST') {
        readJson(req).then((fields) => json(res, 201, api.add(fields)), onBodyError(res))
      } else send(res, 405, 'Method Not Allowed')
      return true
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const record = api.get(id)
      if (record) json(res, 200, record)
      else json(res, 404, { error: 'not-found' })
    } else if (req.method === 'PUT') {
      readJson(req).then((fields) => {
        const record = api.update(id, fields)
        if (record) json(res, 200, record)
        else json(res, 404, { error: 'not-found' })
      }, onBodyError(res))
    } else if (req.method === 'DELETE') {
      if (api.remove(id)) {
        res.writeHead(204, { 'Cache-Control': 'no-store' })
        res.end()
      } else json(res, 404, { error: 'not-found' })
    } else send(res, 405, 'Method Not Allowed')
    return true
  }

  /** Counts for the Overview and the nav badges. */
  function publishingStatus() {
    const c = store?.content
    const count = (list) => ({
      total: list.length,
      published: list.filter((r) => r.status === 'published').length,
    })
    return {
      stories: count(c ? c.listStories() : []),
      shorts: count(c ? c.listShorts() : []),
      // 'none' on the dev server and `yarn admin`, which render nothing live.
      renderer: renderer ? (renderer.error ? 'error' : 'ready') : 'none',
      rendererError: renderer?.error || '',
    }
  }

  /** The editor's files from the tinymce package. True when answered. */
  function vendor(req, res, rest) {
    if (!rest.startsWith('vendor/tinymce/')) return false
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed')
      return true
    }
    const file = TINYMCE_DIR && normalize(join(TINYMCE_DIR, rest.slice('vendor/tinymce/'.length)))
    if (
      !file ||
      !file.startsWith(TINYMCE_DIR + sep) ||
      !existsSync(file) ||
      !statSync(file).isFile()
    ) {
      send(res, 404, 'Not found')
      return true
    }
    res.setHeader('Content-Type', VENDOR_MIME[extname(file)] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=86400')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Length', String(statSync(file).size))
    res.statusCode = 200
    if (req.method === 'HEAD') res.end()
    else createReadStream(file).pipe(res)
    return true
  }

  /** A story as visitors will see it, from the live renderer. True when answered. */
  function preview(req, res, rest) {
    const match = /^preview\/stories\/([a-z0-9]+)$/.exec(rest)
    if (!match) return false
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed')
      return true
    }
    const record = store?.content?.getStory(match[1])
    if (!record) {
      send(res, 404, 'No such story')
      return true
    }
    if (!renderer) {
      json(res, 503, { error: 'no-renderer' })
      return true
    }
    renderer.preview(record).then(
      (html) => {
        if (html) send(res, 200, html, 'text/html; charset=utf-8')
        else json(res, 503, { error: 'renderer', message: renderer.error })
      },
      (error) => send(res, 500, `preview failed:\n${error.message}`),
    )
    return true
  }

  return function handleAdmin(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const pathname = url.pathname
    if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return false

    // Relative URLs in the page (app.js, api/status) need the trailing slash.
    if (pathname === prefix) {
      redirect(res, `${prefix}/${url.search}`)
      return true
    }
    const rest = pathname.slice(prefix.length + 1)

    if (gate(req, res, rest)) return true
    if (publishing(req, res, rest, url)) return true
    if (vendor(req, res, rest)) return true
    if (preview(req, res, rest)) return true

    const tick = rest.match(/^api\/enquiries\/([a-z0-9]+)$/)
    if (tick) {
      if (req.method !== 'POST') {
        send(res, 405, 'Method Not Allowed')
        return true
      }
      readForm(req).then((form) => {
        const record = store?.updateEnquiry(tick[1], { handled: form.get('handled') === 'true' })
        if (record) json(res, 200, record)
        else send(res, 404, 'No such enquiry')
      }, formError(res))
      return true
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed')
      return true
    }

    if (rest === 'api/enquiries') {
      json(res, 200, { enquiries: store ? store.listEnquiries() : [] })
      return true
    }
    if (rest === 'api/traffic') {
      const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 365)
      json(res, 200, store ? store.traffic({ days }) : null)
      return true
    }

    if (rest === 'api/status') {
      const today = url.searchParams.get('today') || ''
      if (today && !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
        send(res, 400, 'today must be YYYY-MM-DD')
        return true
      }
      status(today).then(
        (json) =>
          send(
            res,
            200,
            // The script does not know the site URL or whether a password is
            // set; the page reads both from here (auth shows the Sign out button).
            json.replace(
              /^\{/,
              `{"site":${JSON.stringify(site)},"auth":${Boolean(secret)},"publishing":${JSON.stringify(publishingStatus())},`,
            ),
            'application/json; charset=utf-8',
          ),
        (error) => send(res, 500, `series-status failed:\n${error.message}`),
      )
      return true
    }

    const entry = FILES[rest]
    if (!entry) {
      send(res, 404, 'Not found')
      return true
    }
    const file = join(ADMIN, entry.file)
    if (!existsSync(file)) {
      send(res, 404, 'Not found')
      return true
    }
    headers(res, entry.type)
    res.setHeader('Content-Length', String(statSync(file).size))
    res.statusCode = 200
    if (req.method === 'HEAD') res.end()
    else createReadStream(file).pipe(res)
    return true
  }
}
