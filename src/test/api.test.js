// Contract: POST /api/enquiry saves the submission and its PDF or image
// uploads for the dashboard, keeps only the name of any other file, drops the
// honeypot, and leaves every other path alone. Nothing is sent anywhere else.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../../server/store.mjs'
import { createApiHandler } from '../../server/api.mjs'

function serve(handler) {
  const server = createServer((req, res) => {
    if (handler(req, res)) return
    res.writeHead(404)
    res.end('fallthrough')
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` })
    })
  })
}

// What the browser sends for a FormData with files in it.
const boundary = '----apcTestBoundary'
const part = (name, value, filename, type = 'application/pdf') =>
  Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"${filename ? `; filename="${filename}"\r\nContent-Type: ${type}` : ''}\r\n\r\n`,
    ),
    Buffer.isBuffer(value) ? value : Buffer.from(value),
    Buffer.from('\r\n'),
  ])

describe('enquiry API', () => {
  let dir, store, open
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'apc-api-'))
    store = createStore({ dir })
    open = await serve(createApiHandler({ store }))
  })
  afterEach(() => {
    open.server.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('saves a FormData submission and keeps its PDF and image byte for byte', async () => {
    // A PNG header plus bytes that are not valid UTF-8, to prove they survive.
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0xff, 0xfe, 0x80, 1, 2,
    ])
    const body = Buffer.concat([
      part('form', 'venue'),
      part('venue', 'Crown'),
      part('email', 'ada@example.com'),
      part('message', 'Hello there'),
      part('schedule', '%PDF-1.4 fake schedule', 'schedule.pdf'),
      part('poster', png, 'poster.png', 'image/png'),
      part('logos', 'MZ not an image', 'evil.png', 'image/png'),
      Buffer.from(`--${boundary}--\r\n`),
    ])
    const res = await fetch(`${open.base}/api/enquiry`, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Referer: 'https://example.com/contact',
      },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
    const [saved] = store.listEnquiries()
    expect(saved).toMatchObject({
      form: 'venue',
      name: 'Crown',
      email: 'ada@example.com',
      message: 'Hello there',
      page: 'https://example.com/contact',
      files: [
        { name: 'schedule.pdf', field: 'schedule', file: '1.pdf', type: 'application/pdf' },
        { name: 'poster.png', field: 'poster', file: '2.png', type: 'image/png', size: png.length },
        { name: 'evil.png', field: 'logos', refused: true },
      ],
    })
    expect(saved.files[2]).not.toHaveProperty('file')
    const pdf = store.attachment(saved.id, '1.pdf')
    expect(readFileSync(pdf.path, 'utf8')).toBe('%PDF-1.4 fake schedule')
    expect(readFileSync(store.attachment(saved.id, '2.png').path).equals(png)).toBe(true)
    expect(store.attachment(saved.id, '3.png')).toBeNull()
    expect(store.attachment(saved.id, '../enquiries.json')).toBeNull()
  })

  it('saves a urlencoded or JSON submission', async () => {
    await fetch(`${open.base}/api/enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'form=venue&venue=Crown&email=c@e.com&message=List+us&topic=venue-listing',
    })
    await fetch(`${open.base}/api/enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.c', message: 'hi' }),
    })
    const [json, form] = store.listEnquiries()
    expect(form).toMatchObject({ form: 'venue', name: 'Crown', files: [] })
    expect(json).toMatchObject({ form: 'contact', email: 'a@b.c', message: 'hi' })
  })

  it('swallows the honeypot and rejects an empty body', async () => {
    const bot = await fetch(`${open.base}/api/enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=x@y.z&message=buy&_gotcha=filled',
    })
    expect(bot.status).toBe(200)
    const empty = await fetch(`${open.base}/api/enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'name=Nobody',
    })
    expect(empty.status).toBe(400)
    expect(store.listEnquiries()).toEqual([])
  })

  it('answers GET with 405 and leaves other paths alone', async () => {
    expect((await fetch(`${open.base}/api/enquiry`)).status).toBe(405)
    expect(await (await fetch(`${open.base}/api/other`)).text()).toBe('fallthrough')
  })
})
