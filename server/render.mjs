// Request-time rendering for the routes whose content lives in the data
// store: the home page (Stories by Us, Shorts), the stories index and each
// published story. Everything else is a static document the build wrote.
//
// It renders with the same bundle the build's prerender used
// (.prerender/entry-prerender.js, written by `yarn build:ssr`) and assembles
// the document with the same builder (scripts/lib/document.mjs), so a page
// is what the prerender would have written had it known the content. The
// published content is set on lib/runtimeContent.js before each render and
// written into the document as an inline JSON block, which src/main.jsx
// reads before hydrating.
//
// Rendered documents are cached in memory and the cache is dropped whenever
// store.content.version changes, so a publish is live on the next request
// and a quiet site renders each page once.
//
// If the bundle is missing or fails to load, `ready` resolves false, `error`
// says why, every method answers null, and server/index.mjs falls back to the
// static documents: the home page shows the demo cards, story pages 404.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  createDocumentBuilder,
  stripScripts,
  withRuntimeContent,
} from '../scripts/lib/document.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// Static routes that re-render with the published content.
const LIVE = new Set(['/', '/stories'])
const STORY = /^\/stories\/([a-z0-9-]+)$/

// The theme tokens are inlined in every document, so the bar can use them.
const PREVIEW_BAR =
  '<div style="position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px 16px;' +
  'background:var(--color-accent);color:var(--color-on-accent);' +
  'font:600 14px/1.3 var(--font-body);text-align:center">' +
  'Preview. Close this tab to go back to the dashboard.</div>' +
  '<div style="height:34px"></div>'

/**
 * @param {object} options
 * @param {string} [options.dist]        the built site, default <repo>/dist
 * @param {string} [options.entry]       the SSR bundle, default <repo>/.prerender/entry-prerender.js
 * @param {ReturnType<typeof import('./store.mjs').createStore>} options.store
 * @param {(file: string) => Promise<object>} [options.importEntry]  for tests
 */
export function createRenderer({
  dist = join(ROOT, 'dist'),
  entry = join(ROOT, '.prerender', 'entry-prerender.js'),
  store,
  importEntry = (file) => import(pathToFileURL(file).href),
}) {
  let ssr = null
  const cache = new Map()
  let cachedVersion = -1
  const self = { error: '' }

  self.ready = (async () => {
    try {
      if (!existsSync(entry)) throw new Error(`${entry} is missing — run \`yarn build\` first.`)
      const mod = await importEntry(entry)
      await mod.prepare()
      const template = readFileSync(join(dist, 'app-shell.html'), 'utf8')
      const manifest = JSON.parse(readFileSync(join(dist, '.vite', 'manifest.json'), 'utf8'))
      ssr = {
        render: mod.render,
        setRuntimeContent: mod.setRuntimeContent,
        routeModules: mod.routeModules,
        builder: createDocumentBuilder({ template, manifest, themeStyles: mod.themeStyles }),
      }
      return true
    } catch (error) {
      self.error = error.message
      return false
    }
  })()

  function fresh() {
    const version = store.content.version
    if (version !== cachedVersion) {
      cache.clear()
      cachedVersion = version
    }
  }

  function renderDocument(path, runtime) {
    ssr.setRuntimeContent(runtime)
    const result = ssr.render(path)
    const doc = ssr.builder.build(result, ssr.routeModules(path)[0])
    return withRuntimeContent(doc, runtime)
  }

  /** The HTML for a live route, or null when the path is not one (or not ready). */
  self.page = async function page(pathname) {
    if (!(await self.ready)) return null
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
    const slug = STORY.exec(path)?.[1]
    if (!LIVE.has(path) && !slug) return null
    fresh()
    if (cache.has(path)) return cache.get(path)
    // Only the story being shown carries its body; the rest are card-shaped.
    const runtime = store.content.publicContent({ bodyFor: slug })
    if (slug && !runtime.stories.some((s) => s.slug === slug)) return null
    const doc = renderDocument(path, runtime)
    cache.set(path, doc)
    return doc
  }

  /**
   * A static document (any prerendered page, the 404) with the published
   * content added as the inline block, so a client-side navigation from it to
   * the home page shows the published stories and shorts rather than the
   * demo cards. Those pages do not render the content themselves, so the
   * block cannot change their first render. Null when live rendering is off:
   * then the home page is the static demo one too, and the two must agree.
   */
  self.decorate = async function decorate(path, html) {
    if (!(await self.ready)) return null
    fresh()
    const key = `static:${path}`
    if (!cache.has(key)) cache.set(key, withRuntimeContent(html, store.content.publicContent()))
    return cache.get(key)
  }

  /** dist/sitemap.xml with one <url> per published story. */
  self.sitemap = async function sitemap() {
    if (!(await self.ready)) return null
    const file = join(dist, 'sitemap.xml')
    if (!existsSync(file)) return null
    fresh()
    if (!cache.has('sitemap.xml')) {
      const xml = readFileSync(file, 'utf8')
      // The built sitemap already carries the real origin (gen-seo-files.mjs).
      const origin = xml.match(/<loc>(https?:\/\/[^/<]+)/)?.[1] || ''
      const urls = store.content
        .publicContent()
        .stories.map(
          (s) =>
            `  <url>\n    <loc>${origin}${s.href}</loc>\n` +
            `    <lastmod>${s.updatedAt.slice(0, 10)}</lastmod>\n    <priority>0.6</priority>\n  </url>\n`,
        )
        .join('')
      cache.set('sitemap.xml', xml.replace('</urlset>', `${urls}</urlset>`))
    }
    return cache.get('sitemap.xml')
  }

  /**
   * A story record (draft or published) as the page visitors will see, as
   * static HTML: no module script, so there is nothing to hydrate against a
   * URL the client router would not match. Never cached.
   */
  self.preview = async function preview(record) {
    if (!record || !(await self.ready)) return null
    const runtime = store.content.publicContent()
    const story = store.content.toPublicStory(record)
    const stories = [story, ...runtime.stories.filter((s) => s.slug !== story.slug)]
    const doc = renderDocument(story.href, { ...runtime, stories })
    return stripScripts(doc).replace(/<body([^>]*)>/, (_, attrs) => `<body${attrs}>${PREVIEW_BAR}`)
  }

  return self
}
