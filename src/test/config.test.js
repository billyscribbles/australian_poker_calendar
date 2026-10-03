// Contract: the two config files carry every field the components and SEO
// layer read. A swap that forgets a field should fail here, not in the browser.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { site } from '../config/site.config.js'
import { theme } from '../config/theme.config.js'

describe('site.config — brand identity contract', () => {
  it('brand exposes a name and a logo (text or image)', () => {
    expect(site.brand.name).toBeTruthy()
    expect(site.brand.logoText || site.brand.logoSrc).toBeTruthy()
  })

  it('nav is a non-empty array of { label, to }', () => {
    expect(Array.isArray(site.nav)).toBe(true)
    expect(site.nav.length).toBeGreaterThan(0)
    for (const item of site.nav) {
      expect(item.label).toBeTruthy()
      expect(item.to).toBeTruthy()
    }
  })

  it('footer has columns and a copyright line', () => {
    expect(Array.isArray(site.footer.columns)).toBe(true)
    expect(site.footer.copyright).toBeTruthy()
  })

  it('seo carries every field the Helmet layer reads', () => {
    for (const key of ['defaultTitle', 'titleTemplate', 'description', 'siteUrl', 'ogImage']) {
      expect(site.seo[key], `seo.${key}`).toBeTruthy()
    }
  })

  it('contact exposes an email address', () => {
    expect(site.contact.email).toBeTruthy()
  })

  it('integrations keys exist (values may be empty until env is set)', () => {
    expect(site.integrations).toHaveProperty('gaId')
  })
})

describe('theme.config — design token contract', () => {
  it('exposes all six token groups, each non-empty', () => {
    for (const group of ['colors', 'fonts', 'radii', 'shadows', 'transitions', 'layout']) {
      expect(theme[group], group).toBeTruthy()
      expect(Object.keys(theme[group]).length, group).toBeGreaterThan(0)
    }
  })

  it('defines the accent color the UI is built around', () => {
    expect(theme.colors.accent).toBeTruthy()
  })
})

// The original bug this guards: theme.fonts asked for 'Fraunces' and
// 'Plus Jakarta Sans' while nothing ever fetched them, so every site built from
// this template silently rendered the fallback (Georgia / system-ui) instead.
// Nothing failed, and the type looked accidentally identical on every site.
describe('theme fonts — every family the CSS asks for is actually fetched', () => {
  // Families a browser already has. Anything else has to be downloaded.
  const SYSTEM = new Set([
    'system-ui',
    'ui-sans-serif',
    'ui-serif',
    'ui-monospace',
    'ui-rounded',
    'sans-serif',
    'serif',
    'monospace',
    'cursive',
    'fantasy',
    'georgia',
    'times new roman',
    'times',
    'arial',
    'helvetica',
    'helvetica neue',
    'courier new',
    'courier',
    'verdana',
    'tahoma',
    'trebuchet ms',
    'segoe ui',
    'roboto',
    'inherit',
    'initial',
    '-apple-system',
    'blinkmacsystemfont',
  ])

  // A family is loaded either from Google Fonts (vite.config.js injects the
  // stylesheet from `googleFonts`) or self-hosted through an @font-face rule
  // in src/index.css pointing at a file that exists in public/fonts. Paths are
  // read from the project root: under jsdom, import.meta.url is not a file: URL.
  const indexCss = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8')
  const selfHosted = [...indexCss.matchAll(/@font-face\s*{([^}]*)}/g)]
    .map(([, body]) => ({
      family: body
        .match(/font-family:\s*['"]?([^'";]+)/)?.[1]
        .trim()
        .toLowerCase(),
      file: body.match(/url\(['"]?([^'")]+)/)?.[1],
    }))
    .filter((f) => f.family && f.file)
  const sourced = new Set([
    ...(theme.googleFonts ?? []).map((spec) =>
      decodeURIComponent(spec.split(':')[0]).replaceAll('+', ' ').toLowerCase(),
    ),
    ...selfHosted.map((f) => f.family),
  ])

  it.each(selfHosted)('$family $file is shipped in public/', ({ file }) => {
    expect(existsSync(join(process.cwd(), 'public', file))).toBe(true)
  })

  it.each(Object.entries(theme.fonts))('%s: the first family is loaded', (_token, stack) => {
    // The first entry is the one that actually renders; the rest are fallbacks.
    const primary = stack
      .split(',')[0]
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .toLowerCase()
    if (SYSTEM.has(primary)) return
    expect(sourced, `"${primary}" is in theme.fonts but has no googleFonts entry`).toContain(
      primary,
    )
  })

  it.each(Object.entries(theme.fonts))('%s: names a fallback for the swap', (_token, stack) => {
    // font-display: swap paints the fallback first, so a stack with no fallback
    // shows the browser default and reflows into the brand font.
    expect(stack.split(',').length).toBeGreaterThan(1)
  })
})
