// Contract: an upload is streamed to DATA_DIR/media under a server-chosen
// name, accepted only when its bytes match the kind the dashboard said it
// was and it is under the cap, and served back with Range support (Safari
// will not play a video without it) and a long cache.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMediaHandler, saveUpload, sniff, LIMITS } from '../../server/media.mjs'

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(40, 1),
])
const MP4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from('ftypmp42'),
  Buffer.alloc(40, 2),
])
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(40, 3)])

let dir, server, base
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'apc-media-'))
  const media = createMediaHandler({ dir: join(dir, 'media') })
  server = createServer((req, res) => {
    if (req.method === 'PUT') {
      const kind = new URL(req.url, 'http://x').searchParams.get('kind')
      saveUpload(req, { dir: join(dir, 'media'), kind }).then(
        (r) => {
          res.writeHead(201, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(r))
        },
        (err) => {
          res.writeHead(err.status || 500)
          res.end(err.code || 'failed')
        },
      )
      return
    }
    if (media(req, res)) return
    res.writeHead(404)
    res.end('fallthrough')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => {
  server.close()
  rmSync(dir, { recursive: true, force: true })
})

const files = () => readdirSync(join(dir, 'media')).filter((f) => !f.endsWith('.part'))
const put = (body, kind) => fetch(`${base}/upload?kind=${kind}`, { method: 'PUT', body })

describe('sniff', () => {
  it('knows the five formats and nothing else', () => {
    expect(sniff(PNG)).toMatchObject({ kind: 'image', ext: 'png', type: 'image/png' })
    expect(sniff(MP4)).toMatchObject({ kind: 'video', ext: 'mp4' })
    expect(sniff(WEBM)).toMatchObject({ kind: 'video', ext: 'webm' })
    expect(sniff(Buffer.from('RIFF....WEBPVP8 '))).toMatchObject({ ext: 'webp' })
    expect(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toMatchObject({
      ext: 'jpg',
    })
    expect(sniff(Buffer.from('hello world!'))).toBeNull()
    expect(sniff(Buffer.from('ab'))).toBeNull()
  })
})

describe('saveUpload', () => {
  it('streams a file to disk under a generated name and answers its URL', async () => {
    const res = await put(PNG, 'image')
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.url).toMatch(/^\/media\/[a-z0-9]+\.png$/)
    expect(body.bytes).toBe(PNG.length)
    expect(body.type).toBe('image/png')
    expect(files()).toContain(body.url.slice('/media/'.length))
  })

  it('refuses a file whose bytes do not match its kind and leaves nothing behind', async () => {
    const before = files().length
    expect((await put(PNG, 'video')).status).toBe(415)
    expect((await put(WEBM, 'image')).status).toBe(415)
    expect((await put(Buffer.from('plain text, not an image'), 'image')).status).toBe(415)
    expect((await put(Buffer.from('tiny'), 'image')).status).toBe(415)
    expect((await put(PNG, 'pdf')).status).toBe(400)
    expect(files()).toHaveLength(before)
  })

  it('refuses an oversize upload while it streams', async () => {
    const before = files().length
    const big = Buffer.concat([PNG, Buffer.alloc(LIMITS.image)])
    expect((await put(big, 'image')).status).toBe(413)
    expect(files()).toHaveLength(before)
    expect(readdirSync(join(dir, 'media')).filter((f) => f.endsWith('.part'))).toHaveLength(0)
  })
})

describe('serving /media', () => {
  let name
  beforeAll(() => {
    mkdirSync(join(dir, 'media'), { recursive: true })
    name = 'abc123.mp4'
    writeFileSync(join(dir, 'media', name), Buffer.from('0123456789'))
  })

  it('serves the whole file with a long cache and Accept-Ranges', async () => {
    const res = await fetch(`${base}/media/${name}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(res.headers.get('cache-control')).toContain('max-age=2592000')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(await res.text()).toBe('0123456789')
    const head = await fetch(`${base}/media/${name}`, { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe('10')
  })

  it('answers a Range with 206 and the right slice, including a suffix range', async () => {
    const res = await fetch(`${base}/media/${name}`, { headers: { Range: 'bytes=2-5' } })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(res.headers.get('content-length')).toBe('4')
    expect(await res.text()).toBe('2345')
    const open = await fetch(`${base}/media/${name}`, { headers: { Range: 'bytes=7-' } })
    expect(open.headers.get('content-range')).toBe('bytes 7-9/10')
    expect(await open.text()).toBe('789')
    const suffix = await fetch(`${base}/media/${name}`, { headers: { Range: 'bytes=-3' } })
    expect(suffix.headers.get('content-range')).toBe('bytes 7-9/10')
    expect(await suffix.text()).toBe('789')
    const clamp = await fetch(`${base}/media/${name}`, { headers: { Range: 'bytes=8-99' } })
    expect(clamp.headers.get('content-range')).toBe('bytes 8-9/10')
  })

  it('answers 416 to a range it cannot satisfy', async () => {
    for (const range of ['bytes=10-', 'bytes=50-10', 'bytes=-0', 'bytes=', 'items=1-2']) {
      const res = await fetch(`${base}/media/${name}`, { headers: { Range: range } })
      expect(res.status, range).toBe(416)
      expect(res.headers.get('content-range'), range).toBe('bytes */10')
    }
  })

  it('404s a missing file and refuses anything but a bare media name', async () => {
    expect((await fetch(`${base}/media/nope.mp4`)).status).toBe(404)
    expect(await (await fetch(`${base}/media/../salt`)).text()).toBe('fallthrough')
    expect(await (await fetch(`${base}/media/sub/x.mp4`)).text()).toBe('fallthrough')
    expect((await fetch(`${base}/media/${name}`, { method: 'POST' })).status).toBe(405)
  })
})
