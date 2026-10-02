// Contract: the route table is the single source of truth for the router, the
// prerender and the hydration preload. These assertions catch the two ways it
// can quietly rot — a `module` that no longer names the file `load` imports
// (the route's document then ships without its stylesheet), and a route with
// no static document (it goes back to being invisible to crawlers).
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROUTES, PRERENDER_ROUTES, matchRoute, routeModules } from '../routes.js'

// Read from the project root: under jsdom, import.meta.url is not a file: URL.
const source = readFileSync(join(process.cwd(), 'src/routes.js'), 'utf8')

describe('routes — prerender contract', () => {
  it('every route has a path and a module id', () => {
    expect(ROUTES.length).toBeGreaterThan(0)
    for (const route of ROUTES) {
      expect(route.path, 'route.path').toBeTruthy()
      expect(route.module, `${route.path}: module`).toMatch(/^src\/pages\/\w+\.jsx$/)
    }
  })

  it("each module id names the file that route's load() imports", () => {
    // Read off the source rather than calling load(): the assertion is about
    // the literal import path Rollup keys its manifest by.
    const imports = [...source.matchAll(/import\('\.\/(pages\/\w+\.jsx)'\)/g)].map((m) => m[1])
    const declared = ROUTES.filter((r) => r.load).map((r) => r.module.replace(/^src\//, ''))
    expect(imports).toEqual(declared)
  })

  it('exactly one catch-all, and it prerenders at a concrete path', () => {
    const catchAll = ROUTES.filter((r) => r.path === '*')
    expect(catchAll).toHaveLength(1)
    expect(catchAll[0].prerenderAs).toBe('/404')
    expect(catchAll[0].noindex).toBe(true)
  })

  it('every route gets a static document', () => {
    expect(PRERENDER_ROUTES).toHaveLength(ROUTES.length)
    for (const route of PRERENDER_ROUTES) {
      expect(route.out, `${route.path}: out`).toMatch(/^\//)
    }
  })

  it('matchRoute ignores a trailing slash and falls back to the catch-all', () => {
    expect(matchRoute('/about').path).toBe('/about')
    expect(matchRoute('/about/').path).toBe('/about')
    expect(matchRoute('/').path).toBe('/')
    expect(matchRoute('/nope').path).toBe('*')
  })

  it('routeModules skips the eager route, which has no chunk of its own', () => {
    expect(routeModules('/')).toEqual([])
    expect(routeModules('/about')).toEqual(['src/pages/AboutPage.jsx'])
  })
})

// The sitemap used to be a hand-written public/sitemap.xml listing six URLs, so
// adding a page left it describing the old site with nothing to catch it.
// scripts/prerender.mjs now derives it from the same route table it renders.
describe('sitemap — derived from the route table', () => {
  it('has no hand-written public/sitemap.xml to drift', () => {
    expect(existsSync(join(process.cwd(), 'public/sitemap.xml'))).toBe(false)
  })

  it('lists every indexable route, and nothing else', () => {
    const sitemapPath = join(process.cwd(), 'dist/sitemap.xml')
    if (!existsSync(sitemapPath)) {
      // Unbuilt tree (CI runs unit tests before the build) — prerender.mjs
      // writes this file, so there is nothing to check yet.
      return
    }

    const xml = readFileSync(sitemapPath, 'utf8')
    const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => new URL(m[1]).pathname)
      .map((path) => (path === '/' ? '/' : path.replace(/\/$/, '')))
      .sort()

    const expected = PRERENDER_ROUTES.filter((route) => !route.noindex)
      .map((route) => route.out)
      .sort()

    expect(listed).toEqual(expected)
  })

  it('excludes noindex routes — asking Google to crawl a page it must not index', () => {
    const noindexed = PRERENDER_ROUTES.filter((route) => route.noindex).map((route) => route.out)
    expect(noindexed).toContain('/404')

    const sitemapPath = join(process.cwd(), 'dist/sitemap.xml')
    if (!existsSync(sitemapPath)) return
    const xml = readFileSync(sitemapPath, 'utf8')
    for (const out of noindexed) expect(xml).not.toContain(`<loc>https://example.com${out}<`)
  })
})
