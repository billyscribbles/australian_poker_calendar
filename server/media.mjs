// Uploaded images and video: the dashboard streams a file here, the site
// serves it back from /media/<file>.
//
// Uploads are never buffered. The body is written to <id>.part as it
// arrives, the first bytes decide the type (names and headers lie, bytes do
// not), the running total enforces the cap, and only a file that passed both
// is renamed into place. A refused upload is removed before the error goes
// back. Names are server-generated so a client cannot choose a path.
//
// Serving honours Range requests. Safari asks for bytes=0-1 before it will
// play a <video> and refuses a server that answers with the whole file, so
// without this every short is a blank player on iPhone.

import { randomBytes } from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  unlink,
} from 'node:fs'
import { extname, join } from 'node:path'

export const LIMITS = { image: 10 * 1024 * 1024, video: 300 * 1024 * 1024 }

const TYPES = [
  {
    kind: 'image',
    ext: 'png',
    type: 'image/png',
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    kind: 'image',
    ext: 'jpg',
    type: 'image/jpeg',
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    kind: 'image',
    ext: 'gif',
    type: 'image/gif',
    test: (b) => b.toString('ascii', 0, 4) === 'GIF8',
  },
  {
    kind: 'image',
    ext: 'webp',
    type: 'image/webp',
    test: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
  {
    kind: 'video',
    ext: 'mp4',
    type: 'video/mp4',
    test: (b) => b.toString('ascii', 4, 8) === 'ftyp',
  },
  {
    kind: 'video',
    ext: 'webm',
    type: 'video/webm',
    test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3,
  },
]
const SNIFF_BYTES = 12

const MIME = Object.fromEntries(TYPES.map((t) => [`.${t.ext}`, t.type]))
const NAME = /^\/media\/([a-z0-9]+\.[a-z0-9]+)$/

/** The format of a file from its first bytes, or null. Needs 12 bytes. */
export function sniff(buffer) {
  if (!buffer || buffer.length < SNIFF_BYTES) return null
  const hit = TYPES.find((t) => t.test(buffer))
  return hit ? { kind: hit.kind, ext: hit.ext, type: hit.type } : null
}

export class UploadError extends Error {
  /** @param {number} status  @param {'kind'|'size'|'type'|'body'|'disk'} code */
  constructor(status, code) {
    super(code)
    this.status = status
    this.code = code
  }
}

const newId = () => `${Date.now().toString(36)}${randomBytes(4).toString('hex')}`

/**
 * Stream a request body to `dir`.
 * @param {import('node:http').IncomingMessage} req
 * @param {{ dir: string, kind: 'image'|'video' }} options
 * @returns {Promise<{ file: string, url: string, bytes: number, type: string }>}
 */
export function saveUpload(req, { dir, kind }) {
  return new Promise((resolve, reject) => {
    if (!LIMITS[kind]) {
      req.resume()
      reject(new UploadError(400, 'kind'))
      return
    }
    mkdirSync(dir, { recursive: true })
    const id = newId()
    const tmp = join(dir, `${id}.part`)
    const out = createWriteStream(tmp)
    let head = Buffer.alloc(0)
    let match = null
    let bytes = 0
    let done = false

    const fail = (error) => {
      if (done) return
      done = true
      req.removeAllListeners('data')
      req.resume()
      // The stream opens its file asynchronously; unlinking before `close`
      // can run ahead of that open and leave the part file behind.
      out.destroy()
      out.once('close', () => unlink(tmp, () => reject(error)))
    }

    const write = (chunk) => {
      if (!out.write(chunk)) {
        req.pause()
        out.once('drain', () => req.resume())
      }
    }

    req.on('data', (chunk) => {
      if (done) return
      bytes += chunk.length
      if (bytes > LIMITS[kind]) return fail(new UploadError(413, 'size'))
      if (match) return write(chunk)
      head = Buffer.concat([head, chunk])
      if (head.length < SNIFF_BYTES) return
      match = sniff(head)
      if (!match || match.kind !== kind) return fail(new UploadError(415, 'type'))
      write(head)
    })
    req.on('error', () => fail(new UploadError(400, 'body')))
    out.on('error', () => fail(new UploadError(500, 'disk')))
    req.on('end', () => {
      if (done) return
      if (!match) return fail(new UploadError(415, 'type'))
      out.end(() => {
        if (done) return
        done = true
        const file = `${id}.${match.ext}`
        try {
          renameSync(tmp, join(dir, file))
        } catch {
          return reject(new UploadError(500, 'disk'))
        }
        resolve({ file, url: `/media/${file}`, bytes, type: match.type })
      })
    })
  })
}

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '')
  if (!m || (m[1] === '' && m[2] === '')) return null
  let start, end
  if (m[1] === '') {
    const suffix = Number(m[2])
    if (suffix === 0) return null
    start = Math.max(size - suffix, 0)
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  }
  if (start >= size || start > end) return null
  return { start, end }
}

/**
 * @param {{ dir: string }} options  the media folder (store.content.mediaDir)
 * @returns {(req, res) => boolean}  true when the request was for /media and has been answered
 */
export function createMediaHandler({ dir }) {
  return function handleMedia(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname
    const m = NAME.exec(pathname)
    if (!m) return false
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      res.end('Method Not Allowed')
      return true
    }
    const file = join(dir, m[1])
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end('Not found')
      return true
    }
    const stat = statSync(file)
    const size = stat.size
    res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream')
    res.setHeader('Accept-Ranges', 'bytes')
    // Names are unique per upload, so a URL never changes behind itself.
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Last-Modified', stat.mtime.toUTCString())
    res.setHeader('ETag', `W/"${size}-${stat.mtimeMs}"`)

    let start = 0
    let end = size - 1
    if (req.headers.range !== undefined) {
      const range = parseRange(req.headers.range, size)
      if (!range) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` })
        res.end()
        return true
      }
      ;({ start, end } = range)
      res.statusCode = 206
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
    } else {
      res.statusCode = 200
    }
    res.setHeader('Content-Length', String(end - start + 1))
    if (req.method === 'HEAD') {
      res.end()
      return true
    }
    createReadStream(file, { start, end })
      .on('error', () => res.destroy())
      .pipe(res)
    return true
  }
}
