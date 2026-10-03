// Contract: the production server renders the home page, the stories index
// and each published story at request time from the data store, with the
// published content in the markup and in the inline JSON block, caches the
// result until the content changes, and refuses everything else.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../../server/store.mjs'
import { createRenderer } from '../../server/render.mjs'

const TEMPLATE = `<!doctype html><html><head>
    <!-- seo:fallback:start --><title>Fallback</title><!-- seo:fallback:end -->
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body></html>`
const CREDIT =
  '<a href="https://onraistudio.com/" target="_blank" rel="noopener noreferrer">Site by Onrai Studio</a>'
const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://australianpokercalendar.com/</loc>
  </url>
</urlset>
`

let dir, store, entry
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'apc-render-'))
  mkdirSync(join(dir, 'dist', '.vite'), { recursive: true })
  writeFileSync(join(dir, 'dist', 'app-shell.html'), TEMPLATE)
  writeFileSync(join(dir, 'dist', '.vite', 'manifest.json'), '{}')
  writeFileSync(join(dir, 'dist', 'sitemap.xml'), SITEMAP)
  writeFileSync(join(dir, 'entry.js'), '')
  store = createStore({ dir: join(dir, 'data') })
  let runtime = null
  entry = {
    prepare: vi.fn(async () => {}),
    setRuntimeContent: vi.fn((next) => (runtime = next)),
    render: vi.fn((url) => ({
      html: `<main data-url="${url}">${runtime.stories.map((s) => s.title).join('|')}</main>${CREDIT}`,
      head: `<title>${url}</title>`,
      complete: true,
    })),
    routeModules: () => [],
    themeStyles: ':root{}',
  }
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const renderer = () =>
  createRenderer({
    dist: join(dir, 'dist'),
    entry: join(dir, 'entry.js'),
    store,
    importEntry: async () => entry,
  })

const publish = (title) => {
  const s = store.content.addStory({ title, heroImage: '/media/a1.webp' })
  store.content.publishStory(s.id)
  return store.content.getStory(s.id)
}

describe('createRenderer', () => {
  it('renders the live routes with the published content, and nothing else', async () => {
    const r = renderer()
    expect(await r.ready).toBe(true)
    expect(entry.prepare).toHaveBeenCalledOnce()
    expect(await r.page('/about')).toBeNull()
    expect(await r.page('/stories/nope')).toBeNull()

    const home = await r.page('/')
    expect(home).toContain('<main data-url="/"></main>')
    expect(home).toContain(
      '<script id="apc-runtime" type="application/json">{"stories":[],"shorts":[]}</script>',
    )
    expect(home).toContain('<title>/</title>')

    const story = publish('Big <Night>')
    const page = await r.page(`/stories/${story.slug}`)
    expect(page).toContain('<main data-url="/stories/big-night">Big <Night></main>')
    expect(page).toContain('"title":"Big \\u003cNight>"')
    expect(await r.page('/stories/big-night/')).toBe(page)
    expect(await r.page('/stories')).toContain('Big <Night>')
    expect(await r.page('/')).toContain('Big <Night>')
  })

  it('caches until the content changes, then drops an unpublished story everywhere', async () => {
    const r = renderer()
    const story = publish('Cached')
    await r.page('/')
    await r.page('/')
    expect(entry.render).toHaveBeenCalledTimes(1)
    await r.page(`/stories/${story.slug}`)
    expect(entry.render).toHaveBeenCalledTimes(2)

    store.content.unpublishStory(story.id)
    expect(await r.page(`/stories/${story.slug}`)).toBeNull()
    const home = await r.page('/')
    expect(home).not.toContain('Cached')
    expect(entry.render).toHaveBeenCalledTimes(3)
  })

  it("carries only the shown story's body in the inline block", async () => {
    const r = renderer()
    const a = publish('Alpha')
    store.content.updateStory(a.id, { body: '<p>Alpha body</p>' })
    const b = publish('Beta')
    store.content.updateStory(b.id, { body: '<p>Beta body</p>' })
    const block = (html) =>
      JSON.parse(html.match(/<script id="apc-runtime" type="application\/json">(.*)<\/script>/)[1])
    expect(block(await r.page('/')).stories.some((s) => 'body' in s)).toBe(false)
    const page = block(await r.page('/stories/alpha')).stories
    expect(page.find((s) => s.slug === 'alpha').body).toBe('<p>Alpha body</p>')
    expect(page.find((s) => s.slug === 'beta')).not.toHaveProperty('body')
  })

  it('adds the published content to a static page, so client navigation home shows it', async () => {
    const r = renderer()
    publish('Visible everywhere')
    const doc = await r.decorate('/about', TEMPLATE)
    expect(doc).toContain('"title":"Visible everywhere"')
    expect(doc).not.toContain('"body"')
    expect(await r.decorate('/about', TEMPLATE)).toBe(doc)
    const off = createRenderer({ dist: join(dir, 'dist'), entry: join(dir, 'missing.js'), store })
    expect(await off.decorate('/about', TEMPLATE)).toBeNull()
  })

  it('adds published stories to the sitemap', async () => {
    const r = renderer()
    expect(await r.sitemap()).toBe(SITEMAP)
    const story = publish('Mapped')
    const xml = await r.sitemap()
    expect(xml).toContain(`<loc>https://australianpokercalendar.com/stories/${story.slug}</loc>`)
    expect(xml).toContain(`<lastmod>${story.updatedAt.slice(0, 10)}</lastmod>`)
    expect(xml.trim().endsWith('</urlset>')).toBe(true)
  })

  it('previews a draft as static HTML with a preview bar, without caching it', async () => {
    const r = renderer()
    const draft = store.content.addStory({ title: 'Draft only' })
    const html = await r.preview(draft)
    expect(html).toContain('Draft only')
    expect(html).toContain('Preview.')
    expect(html).not.toContain('<script type="module"')
    expect(await r.page(`/stories/${draft.slug}`)).toBeNull()
    expect(await r.preview(null)).toBeNull()
  })

  it('reports a missing or broken bundle and answers null everywhere', async () => {
    const r = createRenderer({ dist: join(dir, 'dist'), entry: join(dir, 'missing.js'), store })
    expect(await r.ready).toBe(false)
    expect(r.error).toMatch(/missing\.js/)
    expect(await r.page('/')).toBeNull()
    expect(await r.sitemap()).toBeNull()
    const broken = createRenderer({
      dist: join(dir, 'dist'),
      entry: join(dir, 'entry.js'),
      store,
      importEntry: async () => {
        throw new Error('boom')
      },
    })
    expect(await broken.ready).toBe(false)
    expect(broken.error).toBe('boom')
  })
})
