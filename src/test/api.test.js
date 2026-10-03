// Contract: POST /api/enquiry saves the submission before anything else,
// forwards it to Formspree when an id is set, drops the honeypot, and leaves
// every other path alone.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
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

describe('enquiry API', () => {
  let dir, store, fetchMock, open
  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'apc-api-'))
    store = createStore({ dir })
    fetchMock = vi.fn().mockResolvedValue({ ok: true })
    open = await serve(createApiHandler({ store, formspreeId: 'abc123', fetch: fetchMock }))
  })
  afterEach(() => {
    open.server.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('saves a FormData submission and forwards it to Formspree', async () => {
    // What the browser sends for a FormData with one file in it.
    const boundary = '----apcTestBoundary'
    const part = (name, value, filename) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"${filename ? `; filename="${filename}"\r\nContent-Type: application/pdf` : ''}\r\n\r\n${value}\r\n`
    const body =
      part('name', 'Ada') +
      part('email', 'ada@example.com') +
      part('message', 'Hello there') +
      part('schedule', '%PDF-1.4 fake', 'schedule.pdf') +
      `--${boundary}--\r\n`
    const res = await fetch(`${open.base}/api/enquiry`, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Referer: 'https://example.com/contact',
      },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, emailed: true })
    const [saved] = store.listEnquiries()
    expect(saved).toMatchObject({
      form: 'contact',
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello there',
      page: 'https://example.com/contact',
      files: ['schedule.pdf'],
      emailed: true,
    })
    // Forwarded as it arrived, so the upload reaches the inbox.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://formspree.io/f/abc123')
    expect(init.headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/)
    const raw = init.body.toString()
    expect(raw).toContain('Hello there')
    expect(raw).toContain('%PDF-1.4 fake')
  })

  it('reads the venue form by its form field and keeps the record when email fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const res = await fetch(`${open.base}/api/enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'form=venue&venue=Crown&email=c@e.com&message=List+us&topic=venue-listing',
    })
    expect(await res.json()).toMatchObject({ ok: true, emailed: false })
    expect(store.listEnquiries()[0]).toMatchObject({ form: 'venue', name: 'Crown', emailed: false })
  })

  it('still saves when no Formspree id is set', async () => {
    const quiet = await serve(createApiHandler({ store, formspreeId: '', fetch: fetchMock }))
    try {
      const res = await fetch(`${quiet.base}/api/enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.c', message: 'hi' }),
      })
      expect(await res.json()).toMatchObject({ ok: true, emailed: false })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(store.listEnquiries()).toHaveLength(1)
    } finally {
      quiet.server.close()
    }
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
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('answers GET with 405 and leaves other paths alone', async () => {
    expect((await fetch(`${open.base}/api/enquiry`)).status).toBe(405)
    expect(await (await fetch(`${open.base}/api/other`)).text()).toBe('fallthrough')
  })
})
