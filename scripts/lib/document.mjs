// Turns one rendered route into a complete HTML document. Shared by
// scripts/prerender.mjs (every route, at build time) and server/render.mjs
// (the home page, the stories index and each story, at request time), so the
// two cannot drift apart: a page looks the same whichever one wrote it.
//
// The template is dist/index.html as Vite wrote it: the entry stylesheet and
// script, the fallback head block between the seo:fallback markers, and an
// empty <div id="root"></div>. build() swaps the fallback block for the
// route's own head tags, links the route's split CSS and chunk, inlines the
// theme tokens, and puts the rendered body in #root. The two assertions are
// the build's guards; see the comments on each.

const FALLBACK = /<!--\s*seo:fallback:start\s*-->[\s\S]*?<!--\s*seo:fallback:end\s*-->/
const PLACEHOLDER = '<div id="root"></div>'

export const RUNTIME_SCRIPT_ID = 'apc-runtime'

// The studio credit is the reason the footer has to be in the static HTML at
// all: it only counts as a backlink if a crawler that skips JS can see it.
// Plain https://onraistudio.com/ (no www) lands without a redirect; an ordinary
// link, never rel="nofollow". Checked on every document so a footer restyle
// that drops or rewrites it fails the build instead of shipping silently.
export const CREDIT_HREF = 'https://onraistudio.com/'
export const CREDIT_TEXT = 'Site by Onrai Studio'

export function assertStudioCredit(html) {
  const link = html.match(/<a\s[^>]*href="https:\/\/onraistudio\.com\/"[^>]*>[^<]*<\/a>/)?.[0]
  if (!link) throw new Error(`the studio credit <a href="${CREDIT_HREF}"> is not in the markup.`)
  if (!link.includes(`>${CREDIT_TEXT}<`)) {
    throw new Error(`the studio credit must read "${CREDIT_TEXT}", got: ${link}`)
  }
  if (/nofollow/i.test(link)) throw new Error('the studio credit must not carry rel="nofollow".')
}

// A prerendered document must be readable with JavaScript switched off, and
// `style="opacity:0"` is how that quietly stops being true. framer-motion
// renders a motion element's `initial` styles during renderToString, so one
// entrance written `initial={{ opacity: 0 }}` ships the section it wraps
// invisible — hidden text to a crawler, and a section that blanks and fades
// back in under the visitor's scroll once React hydrates over the static
// paint. src/lib/motion.js keeps entrances inert to prevent it; this is the
// guard that stops a new one being added without anyone noticing.
//
// aria-hidden elements are exempt: a decorative layer is meant to be invisible
// and carries no content a crawler should read.
export function assertNoHiddenContent(html) {
  const hidden = [...html.matchAll(/<[a-z][^>]*style="[^"]*opacity: ?0(?![.\d])[^"]*"[^>]*>/gi)]
    .map((m) => m[0])
    .filter((tag) => !/aria-hidden="true"/i.test(tag))
  if (hidden.length) {
    throw new Error(
      `${hidden.length} element(s) prerender at opacity 0, so this page ships ` +
        'partly invisible. An entrance animation is rendering its `initial` ' +
        'state into the static HTML — see src/lib/motion.js. First: ' +
        `${hidden[0].slice(0, 120)}`,
    )
  }
}

/**
 * @param {object} options
 * @param {string} options.template     dist/index.html (or dist/app-shell.html, the same bytes)
 * @param {object} options.manifest     dist/.vite/manifest.json, parsed
 * @param {string} options.themeStyles  the design tokens as CSS, from the SSR entry
 */
export function createDocumentBuilder({ template, manifest, themeStyles }) {
  if (!FALLBACK.test(template)) {
    throw new Error(
      'the seo:fallback markers are missing from index.html — without them the ' +
        'fallback tags duplicate the per-page ones.',
    )
  }
  // An exact placeholder, and its absence is a hard failure rather than a
  // no-op. A String.replace that matches nothing returns the string unchanged,
  // so a document with anything inside #root — say a hand-written fallback
  // footer left over from before this pipeline existed — would quietly ship
  // with no page body at all, looking like a successful build. That happened.
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(
      `index.html has no exact ${PLACEHOLDER} for the rendered body to replace. ` +
        'Empty it — the prerender is what puts real content (and the studio ' +
        'credit) in the page now, and anything left inside #root is markup the ' +
        'visitor sees before React wipes it.',
    )
  }

  // Assets index.html already references: Vite writes the entry's stylesheet
  // and its modulepreloads into the template, so anything matched here is
  // emitted already and must not be repeated.
  const templateAssets = new Set(
    [...template.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map((m) => m[1]),
  )

  /** CSS and JS a route needs, walked transitively through the import graph. */
  function assetsFor(moduleId) {
    const css = new Set()
    const js = new Set()
    const seen = new Set()
    const walk = (id) => {
      if (!id || seen.has(id)) return
      seen.add(id)
      const entry = manifest[id]
      if (!entry) return
      for (const file of entry.css || []) css.add(file)
      // The entry chunk is already in the template's script tag; only the
      // route's own chunk and its shared dependencies need preloading.
      if (entry.file && !entry.isEntry) js.add(entry.file)
      for (const dep of entry.imports || []) walk(dep)
    }
    walk(moduleId)
    return { css: [...css], js: [...js] }
  }

  /**
   * @param {{ html: string, head: string, complete: boolean }} result  from render()
   * @param {string} [moduleId]  the route's manifest id (routeModules(path)[0]); none for an eager route
   */
  function build({ html, head, complete }, moduleId) {
    assertStudioCredit(html)
    assertNoHiddenContent(html)
    const assets = assetsFor(moduleId)
    let doc = template

    // Swap the fallback block for this route's own tags — but only if there
    // are any. A page that renders no head during renderToString keeps the
    // site-level title rather than shipping with no <title> at all.
    doc = head.trim() ? doc.replace(FALLBACK, () => head) : doc

    // This route's own stylesheets, render-blocking on purpose: the document
    // must not paint before the CSS that lays it out.
    const links = assets.css
      .filter((file) => !templateAssets.has(`/${file}`))
      .map((file) => `    <link rel="stylesheet" crossorigin href="/${file}" />`)
    // Its JS chunk, preloaded so main.jsx is not waiting on the entry bundle to
    // run before the browser discovers what to fetch next.
    const preloads = assets.js
      .filter((file) => !templateAssets.has(`/${file}`))
      .map((file) => `    <link rel="modulepreload" crossorigin href="/${file}" />`)
    // Design tokens as a real stylesheet. applyTheme() sets these from JS at
    // runtime; inlining them means the static document paints correctly before
    // the bundle has run, instead of flashing unstyled.
    const injected = [...links, ...preloads, `    <style id="theme-tokens">${themeStyles}</style>`]
    // Match the leading whitespace too, so the injected block controls its own
    // indentation rather than inheriting the closing tag's.
    doc = doc.replace(/[ \t]*<\/head>/, () => `${injected.join('\n')}\n  </head>`)

    // data-prerender tells src/main.jsx whether this markup is hydratable.
    // "full" — the whole tree rendered, so React adopts the DOM. Anything else
    // means a page module was missing, and React must not try to adopt a body
    // that does not match what it is about to render.
    doc = doc.replace(
      PLACEHOLDER,
      () => `<div id="root" data-prerender="${complete ? 'full' : 'partial'}">${html}</div>`,
    )
    return doc
  }

  return { assetsFor, build }
}

/**
 * Adds the published content to a document as an inert JSON block, read by
 * src/main.jsx before hydration. `<` is escaped so the block can never
 * contain `</script>`; the browser executes nothing with this type anyway.
 */
export function withRuntimeContent(doc, content) {
  const json = JSON.stringify(content).replace(/</g, '\\u003c')
  return doc.replace(
    /[ \t]*<\/head>/,
    () =>
      `    <script id="${RUNTIME_SCRIPT_ID}" type="application/json">${json}</script>\n  </head>`,
  )
}

/** The document as static HTML: no module script, no preloads. For the dashboard's preview. */
export function stripScripts(doc) {
  return doc
    .replace(/[ \t]*<script type="module"[^>]*><\/script>\n?/g, '')
    .replace(/[ \t]*<link rel="modulepreload"[^>]*>\n?/g, '')
}
