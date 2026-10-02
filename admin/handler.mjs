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
// With ADMIN_PASSWORD set, any username and that password (HTTP Basic). With
// it unset, only connections from the machine itself are answered; anything
// else gets the same 404 as a URL that does not exist. On Railway the
// connection comes from its proxy, so the password is required there.

import { execFile } from 'node:child_process'
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

  function allowed(req, res) {
    if (secret) {
      const header = req.headers.authorization || ''
      const given = header.startsWith('Basic ')
        ? Buffer.from(header.slice(6), 'base64').toString('utf8').split(':').slice(1).join(':')
        : ''
      if (given === secret) return true
      res.setHeader('WWW-Authenticate', 'Basic realm="Series dashboard", charset="UTF-8"')
      send(res, 401, 'Sign in to open the dashboard.')
      return false
    }
    if (LOOPBACK.test(req.socket?.remoteAddress || '')) return true
    send(res, 404, 'Not found')
    return false
  }

  return function handleAdmin(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const pathname = url.pathname
    if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return false
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed')
      return true
    }
    if (!allowed(req, res)) return true

    // Relative URLs in the page (app.js, api/status) need the trailing slash.
    if (pathname === prefix) {
      res.writeHead(302, { Location: `${prefix}/${url.search}`, 'Cache-Control': 'no-store' })
      res.end()
      return true
    }
    const rest = pathname.slice(prefix.length + 1)

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
            // The script does not know the site URL; the page reads it from here.
            json.replace(/^\{/, `{"site":${JSON.stringify(site)},`),
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
