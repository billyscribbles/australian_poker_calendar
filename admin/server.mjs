// Admin dashboard server: `yarn admin`, then open http://localhost:4400.
//
// Local-only ops view of the series on the calendar: what each one has, what
// it still needs, and what is sitting in the home and calendar page slots.
// Never deployed. It serves the static dashboard in this folder, the site's
// images from public/ (key art, tour logos, promo banners), and one JSON
// endpoint, /api/status, that runs scripts/series-status.mjs in a fresh
// process on every call so edits to the content files show up on refresh
// without a restart.
//
// No dependencies, same as server/index.mjs.

import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ADMIN = dirname(fileURLToPath(import.meta.url))
const ROOT = join(ADMIN, '..')
const PUBLIC = join(ROOT, 'public')
const STATUS_SCRIPT = join(ROOT, 'scripts', 'series-status.mjs')
const PORT = Number(process.env.PORT) || 4400
// Where the dashboard's "open on site" links point. The local preview by default.
const SITE = process.env.SITE || 'http://localhost:4310'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(body)
}

/** Stream a file from `base` if `rel` resolves inside it, else 404. */
function sendFile(res, base, rel) {
  const file = normalize(join(base, rel))
  if (!file.startsWith(base + sep) && file !== base) return send(res, 404, 'Not found')
  if (!existsSync(file) || !statSync(file).isFile()) return send(res, 404, 'Not found')
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  createReadStream(file).pipe(res)
}

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

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname

  if (path === '/api/status') {
    const today = url.searchParams.get('today') || ''
    if (today && !/^\d{4}-\d{2}-\d{2}$/.test(today))
      return send(res, 400, 'today must be YYYY-MM-DD')
    try {
      const json = await status(today)
      // The script does not know the site URL; the dashboard reads it from here.
      return send(res, 200, json.replace(/^\{/, `{"site":${JSON.stringify(SITE)},`), MIME['.json'])
    } catch (error) {
      return send(res, 500, `series-status failed:\n${error.message}`)
    }
  }
  if (path === '/' || path === '/index.html') return sendFile(res, ADMIN, 'index.html')
  if (path === '/app.js' || path === '/app.css') return sendFile(res, ADMIN, path.slice(1))
  if (path.startsWith('/images/')) return sendFile(res, PUBLIC, decodeURIComponent(path))
  if (path.startsWith('/brand/')) return sendFile(res, PUBLIC, decodeURIComponent(path))
  return send(res, 404, 'Not found')
}).listen(PORT, () => {
  console.log(`Series dashboard: http://localhost:${PORT}  (site links → ${SITE})`)
})
