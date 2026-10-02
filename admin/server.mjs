// The dashboard on its own: `yarn admin`, then open http://localhost:4400/admin/.
//
// The same handler the site server and the dev server mount (admin/handler.mjs),
// plus the images under public/ that the page shows, so it works without a
// built site. "Open on site" links point at the local preview unless SITE says
// otherwise.

import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAdminHandler } from './handler.mjs'

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const PORT = Number(process.env.PORT) || 4400
const SITE = process.env.SITE || 'http://localhost:4310'

const MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

const admin = createAdminHandler({ site: SITE })

createServer((req, res) => {
  if (admin(req, res)) return
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (pathname === '/') {
    res.writeHead(302, { Location: '/admin/' })
    return res.end()
  }
  const file = normalize(join(PUBLIC, pathname))
  if (file.startsWith(PUBLIC + sep) && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    return createReadStream(file).pipe(res)
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not found')
}).listen(PORT, () => {
  console.log(`Series dashboard: http://localhost:${PORT}/admin/  (site links → ${SITE})`)
})
