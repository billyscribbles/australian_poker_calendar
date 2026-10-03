// Contract: the document builder behind scripts/prerender.mjs and
// server/render.mjs assembles a route's HTML the same way for both: the
// page's head tags replace the fallback block, its split CSS and chunk are
// linked, the theme tokens are inlined, and the two guards (the studio
// credit, no hidden content) still fail a bad document.
import { describe, it, expect } from 'vitest'
import {
  createDocumentBuilder,
  withRuntimeContent,
  stripScripts,
  assertStudioCredit,
  assertNoHiddenContent,
} from '../../scripts/lib/document.mjs'

const TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" crossorigin href="/assets/index-abc.css" />
    <!-- seo:fallback:start -->
    <title>Fallback</title>
    <!-- seo:fallback:end -->
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/vendor-def.js" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`
const MANIFEST = {
  'src/pages/StoryPage.jsx': {
    file: 'assets/StoryPage-111.js',
    css: ['assets/StoryPage-111.css'],
    imports: ['_shared-222.js'],
  },
  '_shared-222.js': { file: 'assets/shared-222.js', css: ['assets/index-abc.css'] },
  'index.html': { file: 'assets/index-abc.js', isEntry: true, css: ['assets/index-abc.css'] },
}
const CREDIT =
  '<a href="https://onraistudio.com/" target="_blank" rel="noopener noreferrer">Site by Onrai Studio</a>'
const result = (html, head = '<title>Story</title>') => ({
  html: `${html}${CREDIT}`,
  head,
  complete: true,
})

describe('createDocumentBuilder', () => {
  const builder = createDocumentBuilder({
    template: TEMPLATE,
    manifest: MANIFEST,
    themeStyles: ':root{--x:1}',
  })

  it("walks the manifest for a route's CSS and chunks", () => {
    expect(builder.assetsFor('src/pages/StoryPage.jsx')).toEqual({
      css: ['assets/StoryPage-111.css', 'assets/index-abc.css'],
      js: ['assets/StoryPage-111.js', 'assets/shared-222.js'],
    })
    expect(builder.assetsFor(undefined)).toEqual({ css: [], js: [] })
  })

  it('assembles the document', () => {
    const doc = builder.build(result('<main>hi</main>'), 'src/pages/StoryPage.jsx')
    expect(doc).toContain('<title>Story</title>')
    expect(doc).not.toContain('Fallback')
    expect(doc).toContain('<link rel="stylesheet" crossorigin href="/assets/StoryPage-111.css" />')
    expect(doc.match(/index-abc\.css/g)).toHaveLength(1) // the entry sheet is not linked twice
    expect(doc).toContain(
      '<link rel="modulepreload" crossorigin href="/assets/StoryPage-111.js" />',
    )
    expect(doc).toContain('<style id="theme-tokens">:root{--x:1}</style>')
    expect(doc).toContain(`<div id="root" data-prerender="full"><main>hi</main>${CREDIT}</div>`)
    const partial = builder.build({ ...result('<main>x</main>'), complete: false }, undefined)
    expect(partial).toContain('data-prerender="partial"')
  })

  it('keeps the fallback head when a page renders no head tags', () => {
    expect(builder.build(result('<p>x</p>', ''), undefined)).toContain('<title>Fallback</title>')
  })

  it('refuses a document without the credit or with hidden content', () => {
    expect(() =>
      builder.build({ html: '<main>no credit</main>', head: '', complete: true }),
    ).toThrow(/studio credit/)
    expect(() => builder.build(result('<section style="opacity:0">x</section>'))).toThrow(
      /opacity 0/,
    )
    expect(() => assertStudioCredit(CREDIT.replace('>Site by', ' rel="nofollow">Site by'))).toThrow(
      /nofollow/,
    )
    expect(() =>
      assertNoHiddenContent('<i aria-hidden="true" style="opacity:0"></i>'),
    ).not.toThrow()
  })

  it('refuses a template without the markers or the exact root placeholder', () => {
    expect(() =>
      createDocumentBuilder({
        template: '<html><head></head><body><div id="root"></div></body></html>',
        manifest: {},
        themeStyles: '',
      }),
    ).toThrow(/seo:fallback/)
    expect(() =>
      createDocumentBuilder({
        template: TEMPLATE.replace('<div id="root"></div>', '<div id="root">x</div>'),
        manifest: {},
        themeStyles: '',
      }),
    ).toThrow(/root/)
  })
})

describe('withRuntimeContent and stripScripts', () => {
  it('writes the content as an inert JSON block that cannot close itself', () => {
    const doc = withRuntimeContent(TEMPLATE, { stories: [{ title: '</script><b>' }], shorts: [] })
    const block = doc.match(
      /<script id="apc-runtime" type="application\/json">(.*)<\/script>\n {2}<\/head>/,
    )
    expect(block).not.toBeNull()
    expect(block[1]).not.toContain('</script>')
    expect(JSON.parse(block[1]).stories[0].title).toBe('</script><b>')
  })

  it('removes the module script and preloads for a static preview', () => {
    const doc = stripScripts(TEMPLATE)
    expect(doc).not.toContain('<script type="module"')
    expect(doc).not.toContain('modulepreload')
    expect(doc).toContain('<link rel="stylesheet" crossorigin href="/assets/index-abc.css" />')
  })
})
