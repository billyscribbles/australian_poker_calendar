// The /admin dashboard as one request handler, mounted three ways:
//
//   server/index.mjs   the production server (yarn preview, yarn start, Railway)
//   vite.config.js     the dev server (yarn dev)
//   admin/server.mjs   on its own (yarn admin)
//
// It answers /admin/ (the page), /admin/app.js, /admin/app.css and
// /admin/api/status, which runs scripts/series-status.mjs in a fresh process
// so content edits show up on refresh. Everything else falls through to the
// host server, which is what serves the images the page shows.
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
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ADMIN = dirname(fileURLToPath(import.meta.url))
const ROOT = join(ADMIN, '..')
const STATUS_SCRIPT = join(ROOT, 'scripts', 'series-status.mjs')

const FILES = {
  '': { file: 'index.html', type: 'text/html; charset=utf-8' },
  'app.js': { file: 'app.js', type: 'text/javascript; charset=utf-8' },
  'app.css': { file: 'app.css', type: 'text/css; charset=utf-8' },
}

const LOOPBACK = /^(::1|127\.\d+\.\d+\.\d+|::ffff:127\.\d+\.\d+\.\d+)$/

const COOKIE = 'apc_admin'
const SESSION_SECONDS = 30 * 24 * 60 * 60
const MAX_FORM_BYTES = 4096

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

function readForm(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_FORM_BYTES) {
        reject(new Error('too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8'))))
    req.on('error', reject)
  })
}

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
    <title>Sign in · Series Dashboard</title>
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
          <span class="brand__name">Series Dashboard</span>
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
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => boolean}
 *   true when the request was for the dashboard and has been answered
 */
export function createAdminHandler({ prefix = '/admin', site = '', password } = {}) {
  const secret = password ?? process.env.ADMIN_PASSWORD ?? ''

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
    readForm(req).then(
      (form) => {
        if (passwordMatches(form.get('password') || '')) {
          res.setHeader(
            'Set-Cookie',
            `${COOKIE}=${mintCookie()}; ${cookieAttributes(req, prefix, SESSION_SECONDS)}`,
          )
          redirect(res, `${prefix}/`)
        } else {
          send(res, 401, loginPage('That password is not right.'), 'text/html; charset=utf-8')
        }
      },
      () => send(res, 413, 'Form too large'),
    )
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
    if (rest === 'api/status') {
      send(res, 401, '{"error":"signed-out"}', 'application/json; charset=utf-8')
    } else if (rest === '') {
      send(res, 401, loginPage(''), 'text/html; charset=utf-8')
    } else {
      send(res, 401, 'Sign in to open the dashboard.')
    }
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
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed')
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
            json.replace(/^\{/, `{"site":${JSON.stringify(site)},"auth":${Boolean(secret)},`),
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
