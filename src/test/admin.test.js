// Contract: /admin answers only to the machine itself unless ADMIN_PASSWORD is
// set, in which case it wants that password; a wrong password or a stranger
// gets nothing that reveals the page exists. The API is checked once, end to
// end, so a content file that stops importing under plain Node fails here.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'node:http'
import { createAdminHandler } from '../../admin/handler.mjs'

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

describe('admin handler', () => {
  let open, locked

  beforeAll(async () => {
    open = await serve(createAdminHandler({ password: '' }))
    locked = await serve(createAdminHandler({ password: 'hunter2' }))
  })
  afterAll(() => {
    open.server.close()
    locked.server.close()
  })

  it('serves the page, its assets and the API to localhost when no password is set', async () => {
    const page = await fetch(`${open.base}/admin/`)
    expect(page.status).toBe(200)
    expect(page.headers.get('x-robots-tag')).toMatch(/noindex/)
    expect(await page.text()).toContain('Series Dashboard')

    for (const asset of ['app.js', 'app.css']) {
      expect((await fetch(`${open.base}/admin/${asset}`)).status, asset).toBe(200)
    }

    const api = await fetch(`${open.base}/admin/api/status?today=2026-10-03`)
    expect(api.status).toBe(200)
    const data = await api.json()
    expect(data.today).toBe('2026-10-03')
    expect(data.series.length).toBeGreaterThan(10)
    expect(data.site).toBe('')
  })

  it('redirects /admin to /admin/ so relative URLs resolve', async () => {
    const res = await fetch(`${open.base}/admin`, { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/admin/')
  })

  it('rejects a bad date and unknown admin paths without falling through', async () => {
    expect((await fetch(`${open.base}/admin/api/status?today=soon`)).status).toBe(400)
    const miss = await fetch(`${open.base}/admin/secrets`)
    expect(miss.status).toBe(404)
    expect(await miss.text()).not.toBe('fallthrough')
  })

  it('leaves every other path to the host server', async () => {
    const res = await fetch(`${open.base}/administrator`)
    expect(await res.text()).toBe('fallthrough')
  })

  it('asks for the password when one is set, and accepts it with any username', async () => {
    const anon = await fetch(`${locked.base}/admin/`)
    expect(anon.status).toBe(401)
    expect(anon.headers.get('www-authenticate')).toMatch(/^Basic/)

    const wrong = await fetch(`${locked.base}/admin/`, {
      headers: { Authorization: `Basic ${Buffer.from('billy:nope').toString('base64')}` },
    })
    expect(wrong.status).toBe(401)

    const right = await fetch(`${locked.base}/admin/app.css`, {
      headers: { Authorization: `Basic ${Buffer.from('anyone:hunter2').toString('base64')}` },
    })
    expect(right.status).toBe(200)
  })
})
