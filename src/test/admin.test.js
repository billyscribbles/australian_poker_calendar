// Contract: /admin answers only to the machine itself unless ADMIN_PASSWORD is
// set, in which case it shows its own sign-in page and wants that password; a
// wrong password gets the page back with an error, and the API answers 401 so
// the dashboard can send an expired session back to sign in. The API is
// checked once, end to end, so a content file that stops importing under plain
// Node fails here.
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
    expect(data.rooms.length).toBe(data.calendar.tours.length)
    expect(data.site).toBe('')
    expect(data.auth).toBe(false)
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

  function signIn(base, password) {
    return fetch(`${base}/admin/login`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `password=${encodeURIComponent(password)}`,
    })
  }

  function cookieOf(res) {
    return (res.headers.get('set-cookie') || '').split(';')[0]
  }

  describe('with a password set', () => {
    it('shows the sign-in page instead of the dashboard', async () => {
      const res = await fetch(`${locked.base}/admin/`)
      expect(res.status).toBe(401)
      expect(res.headers.get('x-robots-tag')).toMatch(/noindex/)
      const html = await res.text()
      expect(html).toContain('<form')
      expect(html).toContain('name="password"')
      expect(html).not.toContain('id="nav"')
    })

    it('serves the stylesheet to the sign-in page but nothing else', async () => {
      expect((await fetch(`${locked.base}/admin/app.css`)).status).toBe(200)
      expect((await fetch(`${locked.base}/admin/app.js`)).status).toBe(401)
    })

    it('answers the API with 401 JSON when signed out', async () => {
      const res = await fetch(`${locked.base}/admin/api/status`)
      expect(res.status).toBe(401)
      expect(res.headers.get('content-type')).toMatch(/json/)
      expect((await res.json()).error).toBe('signed-out')
    })

    it('rejects a wrong password with the page and no cookie', async () => {
      const res = await signIn(locked.base, 'nope')
      expect(res.status).toBe(401)
      expect(res.headers.get('set-cookie')).toBeNull()
      const html = await res.text()
      expect(html).toContain('name="password"')
      expect(html).toMatch(/not right/i)
    })

    it('signs in with the right password and opens the dashboard', async () => {
      const res = await signIn(locked.base, 'hunter2')
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/admin/')
      const setCookie = res.headers.get('set-cookie')
      expect(setCookie).toMatch(/HttpOnly/)
      expect(setCookie).toMatch(/SameSite=Strict/)
      expect(setCookie).toMatch(/Path=\/admin/)
      expect(setCookie).toMatch(/Max-Age=2592000/)
      expect(setCookie).not.toMatch(/Secure/)

      const headers = { Cookie: cookieOf(res) }
      const page = await fetch(`${locked.base}/admin/`, { headers })
      expect(page.status).toBe(200)
      expect(await page.text()).toContain('id="nav"')
      expect((await fetch(`${locked.base}/admin/app.js`, { headers })).status).toBe(200)
      const api = await fetch(`${locked.base}/admin/api/status?today=2026-10-03`, { headers })
      expect(api.status).toBe(200)
      const data = await api.json()
      expect(data.today).toBe('2026-10-03')
      expect(data.auth).toBe(true)
    })

    it('marks the cookie Secure behind an HTTPS proxy', async () => {
      const res = await fetch(`${locked.base}/admin/login`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-Proto': 'https',
        },
        body: 'password=hunter2',
      })
      expect(res.status).toBe(302)
      expect(res.headers.get('set-cookie')).toMatch(/Secure/)
    })

    it('ignores a forged cookie and one minted under another password', async () => {
      const forged = await fetch(`${locked.base}/admin/app.js`, {
        headers: { Cookie: 'apc_admin=0123456789abcdef.0123456789abcdef0123456789abcdef' },
      })
      expect(forged.status).toBe(401)

      const other = await serve(createAdminHandler({ password: 'different' }))
      try {
        const session = cookieOf(await signIn(other.base, 'different'))
        const res = await fetch(`${locked.base}/admin/app.js`, { headers: { Cookie: session } })
        expect(res.status).toBe(401)
      } finally {
        other.server.close()
      }
    })

    it('signs out by clearing the cookie', async () => {
      const session = cookieOf(await signIn(locked.base, 'hunter2'))
      const res = await fetch(`${locked.base}/admin/logout`, {
        method: 'POST',
        redirect: 'manual',
        headers: { Cookie: session },
      })
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/admin/')
      expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/)
    })

    it('still redirects the bare path and refuses other methods', async () => {
      const bare = await fetch(`${locked.base}/admin`, { redirect: 'manual' })
      expect(bare.status).toBe(302)
      const anon = await fetch(`${locked.base}/admin/api/status`, { method: 'PUT' })
      expect(anon.status).toBe(401)
      const session = cookieOf(await signIn(locked.base, 'hunter2'))
      const put = await fetch(`${locked.base}/admin/api/status`, {
        method: 'PUT',
        headers: { Cookie: session },
      })
      expect(put.status).toBe(405)
    })
  })

  it('has no sign-in page when no password is set', async () => {
    expect((await fetch(`${open.base}/admin/login`)).status).toBe(404)
    expect(await (await fetch(`${open.base}/admin/`)).text()).not.toContain('name="password"')
  })
})
