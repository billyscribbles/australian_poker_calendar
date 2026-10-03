// Contract: /admin answers only to the machine itself unless ADMIN_PASSWORD is
// set, in which case it shows its own sign-in page and wants that password; a
// wrong password gets the page back with an error, and the API answers 401 so
// the dashboard can send an expired session back to sign in. The API is
// checked once, end to end, so a content file that stops importing under plain
// Node fails here.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, request } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAdminHandler } from '../../admin/handler.mjs'
import { createStore } from '../../server/store.mjs'

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
  let open, locked, dir, store

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'apc-admin-'))
    store = createStore({ dir })
    open = await serve(createAdminHandler({ password: '', store }))
    locked = await serve(createAdminHandler({ password: 'hunter2', store }))
  })
  afterAll(() => {
    open.server.close()
    locked.server.close()
    rmSync(dir, { recursive: true, force: true })
  })

  it('serves the enquiries and the traffic tally, and ticks an enquiry off', async () => {
    const { id } = store.addEnquiry({ form: 'contact', fields: { email: 'a@b.c', message: 'hi' } })
    store.recordView({ path: '/', host: 'x', ip: '1.1.1.1', ua: 'Mozilla', today: '2026-10-03' })

    const list = await (await fetch(`${open.base}/admin/api/enquiries`)).json()
    expect(list.enquiries[0]).toMatchObject({ id, handled: false })

    const tick = await fetch(`${open.base}/admin/api/enquiries/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'handled=true',
    })
    expect(tick.status).toBe(200)
    expect((await tick.json()).handled).toBe(true)
    expect((await fetch(`${open.base}/admin/api/enquiries/nope`, { method: 'POST' })).status).toBe(
      404,
    )

    const traffic = await (await fetch(`${open.base}/admin/api/traffic?days=3`)).json()
    expect(traffic.days).toHaveLength(3)
    expect(traffic.totals.views).toBeGreaterThanOrEqual(1)
  })

  it('reads empty enquiries and no traffic without a store', async () => {
    const bare = await serve(createAdminHandler({ password: '' }))
    try {
      expect((await (await fetch(`${bare.base}/admin/api/enquiries`)).json()).enquiries).toEqual([])
      expect(await (await fetch(`${bare.base}/admin/api/traffic`)).json()).toBeNull()
    } finally {
      bare.server.close()
    }
  })

  it('serves the page, its assets and the API to localhost when no password is set', async () => {
    const page = await fetch(`${open.base}/admin/`)
    expect(page.status).toBe(200)
    expect(page.headers.get('x-robots-tag')).toMatch(/noindex/)
    expect(await page.text()).toContain('Dashboard')

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
      for (const path of ['api/status', 'api/enquiries', 'api/traffic']) {
        const res = await fetch(`${locked.base}/admin/${path}`)
        expect(res.status, path).toBe(401)
        expect(res.headers.get('content-type')).toMatch(/json/)
        expect((await res.json()).error).toBe('signed-out')
      }
      const tick = await fetch(`${locked.base}/admin/api/enquiries/abc`, { method: 'POST' })
      expect(tick.status).toBe(401)
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

  describe('publishing API', () => {
    const PNG = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(40, 1),
    ])
    const json = (method, path, body) =>
      fetch(`${open.base}/admin/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })

    it('is behind the sign-in like the rest of the API', async () => {
      expect((await fetch(`${locked.base}/admin/api/stories`)).status).toBe(401)
      expect(
        (await fetch(`${locked.base}/admin/api/media?kind=image`, { method: 'PUT', body: PNG }))
          .status,
      ).toBe(401)
    })

    it('creates, edits, publishes, unpublishes and deletes a story', async () => {
      const created = await json('POST', 'api/stories', { title: 'First story' })
      expect(created.status).toBe(201)
      const story = await created.json()
      expect(story).toMatchObject({ slug: 'first-story', status: 'draft' })

      const upload = await fetch(`${open.base}/admin/api/media?kind=image`, {
        method: 'PUT',
        body: PNG,
      })
      expect(upload.status).toBe(201)
      const { url } = await upload.json()

      const refused = await json('POST', `api/stories/${story.id}/publish`)
      expect(refused.status).toBe(422)
      expect((await refused.json()).missing).toEqual(['heroImage'])

      const edited = await json('PUT', `api/stories/${story.id}`, {
        heroImage: url,
        body: '<p>Hello</p><script>x</script>',
      })
      expect(edited.status).toBe(200)
      expect((await edited.json()).body).toBe('<p>Hello</p>')

      const published = await json('POST', `api/stories/${story.id}/publish`)
      expect(published.status).toBe(200)
      expect((await published.json()).status).toBe('published')
      expect((await (await fetch(`${open.base}/admin/api/stories`)).json()).items[0].id).toBe(
        story.id,
      )
      expect((await (await fetch(`${open.base}/admin/api/stories/${story.id}`)).json()).id).toBe(
        story.id,
      )

      const status = await (await fetch(`${open.base}/admin/api/status`)).json()
      expect(status.publishing.stories).toEqual({ total: 1, published: 1 })

      expect((await json('POST', `api/stories/${story.id}/unpublish`)).status).toBe(200)
      expect((await json('DELETE', `api/stories/${story.id}`)).status).toBe(204)
      expect((await json('DELETE', `api/stories/${story.id}`)).status).toBe(404)
      expect((await json('GET', `api/stories/${story.id}`)).status).toBe(404)
      expect((await json('POST', `api/stories/nope/publish`)).status).toBe(404)
    })

    it('does the same for shorts and refuses bad uploads and bodies', async () => {
      const short = await (await json('POST', 'api/shorts', { title: 'Clip', duration: 20 })).json()
      expect(short.slug).toBe('clip')
      expect((await json('POST', `api/shorts/${short.id}/publish`)).status).toBe(422)
      expect((await json('PATCH', `api/shorts/${short.id}`)).status).toBe(405)
      expect((await json('DELETE', `api/shorts/${short.id}`)).status).toBe(204)

      expect(
        (await fetch(`${open.base}/admin/api/media?kind=image`, { method: 'PUT', body: 'text' }))
          .status,
      ).toBe(415)
      expect(
        (await fetch(`${open.base}/admin/api/media?kind=zip`, { method: 'PUT', body: PNG })).status,
      ).toBe(400)
      expect((await fetch(`${open.base}/admin/api/media`, { method: 'GET' })).status).toBe(405)

      const notJson = await fetch(`${open.base}/admin/api/stories`, {
        method: 'POST',
        body: '{nope',
      })
      expect(notJson.status).toBe(400)
      const huge = await fetch(`${open.base}/admin/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x'.repeat(3 * 1024 * 1024) }),
      })
      expect(huge.status).toBe(413)
    })
  })

  describe('preview and the editor files', () => {
    it('serves TinyMCE from the package and nothing outside it', async () => {
      const js = await fetch(`${open.base}/admin/vendor/tinymce/tinymce.min.js`)
      expect(js.status).toBe(200)
      expect(js.headers.get('content-type')).toMatch(/javascript/)
      expect(js.headers.get('cache-control')).toContain('max-age')
      expect((await js.text()).length).toBeGreaterThan(10000)
      const css = await fetch(`${open.base}/admin/vendor/tinymce/skins/ui/oxide-dark/skin.min.css`)
      expect(css.status).toBe(200)
      expect(css.headers.get('content-type')).toMatch(/css/)
      expect((await fetch(`${open.base}/admin/vendor/tinymce/nope.js`)).status).toBe(404)
      // A raw path with ".." that fetch() would otherwise normalise away.
      const raw = await new Promise((resolve) => {
        request(`${open.base}/admin/vendor/tinymce/../../package.json`, (res) =>
          resolve(res.statusCode),
        ).end()
      })
      expect(raw).toBe(404)
      expect((await fetch(`${locked.base}/admin/vendor/tinymce/tinymce.min.js`)).status).toBe(401)
    })

    it('previews a story through the renderer, and says so when there is none', async () => {
      const draft = store.content.addStory({ title: 'Preview me' })
      const renderer = {
        error: '',
        preview: async (record) => `<html><body>${record.title}</body></html>`,
      }
      const withRenderer = await serve(createAdminHandler({ password: '', store, renderer }))
      try {
        const res = await fetch(`${withRenderer.base}/admin/preview/stories/${draft.id}`)
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toMatch(/text\/html/)
        expect(res.headers.get('x-robots-tag')).toMatch(/noindex/)
        expect(await res.text()).toContain('Preview me')
        expect((await fetch(`${withRenderer.base}/admin/preview/stories/nope`)).status).toBe(404)
        const status = await (await fetch(`${withRenderer.base}/admin/api/status`)).json()
        expect(status.publishing.renderer).toBe('ready')
      } finally {
        withRenderer.server.close()
      }
      const none = await fetch(`${open.base}/admin/preview/stories/${draft.id}`)
      expect(none.status).toBe(503)
      const status = await (await fetch(`${open.base}/admin/api/status`)).json()
      expect(status.publishing.renderer).toBe('none')
      store.content.deleteStory(draft.id)
    })
  })
})
