# Stories and Shorts Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Publish section in the `/admin` dashboard where an editor writes an article in TinyMCE with a hero image, previews it, and publishes it to "Stories by Us" and its own page, plus a video uploader that publishes to "Shorts", with every page still shipped as real HTML.

**Architecture:** Content and media live in the data store (`DATA_DIR`), owned by a new `server/content.mjs`. The production server renders the home page, the stories index and each story page at request time with the build's own SSR bundle, feeding it the published content through a shared `src/lib/runtimeContent.js` module and an inline JSON block the browser reads before hydrating. The dashboard gains two editors in `admin/publish.js`, served TinyMCE 6.8 from the package, and an upload endpoint that streams files to disk.

**Tech Stack:** React 18 + Vite 5 (JSX, no TypeScript), React Router 7, plain CSS with tokens, Node 20 dependency-free server, Yarn 4 PnP, Vitest + Testing Library + jest-axe, TinyMCE 6.8.6 (MIT).

**Spec:** `docs/superpowers/specs/2026-10-03-stories-shorts-publishing-design.md`

## Global Constraints

- No TypeScript, no Tailwind, no CSS-in-JS. Components hold no site strings, colours or links: strings go in `src/content/stories.js` and `src/content/shorts.js`; colours come from `theme.config.js` tokens via `var(--color-*)`.
- Routes are declared only in `src/routes.js`.
- The server stays dependency-free; the only new runtime dependency is `tinymce@6.8.6` (MIT). Never TinyMCE 7 or later.
- Yarn 4 PnP: `node_modules` does not exist. TinyMCE is marked `unplugged` and resolved with `createRequire(import.meta.url).resolve(...)`.
- Node 20 (`.nvmrc`). Use nothing newer than Node 20 APIs.
- The studio credit, the prerender step, `yarn start` running `server/index.mjs`, and the `<!-- seo:fallback -->` markers are untouchable.
- Upload caps: images 10 MB, video 300 MB. Image dimensions: hero 1600×900 WebP, thumb 800×450 WebP, body image 1200px wide WebP, poster 540×960 WebP, quality 0.85.
- Dates in records are `YYYY-MM-DD`. Timestamps are ISO strings.
- Media URLs are `/media/<id>.<ext>`, `id` lower-case base36 plus hex, server-generated.
- Commits are atomic, one concern each, and end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Run every command through Yarn (`yarn test`, `yarn node …`) so PnP resolution applies.

## Review Focus

1. **A slug that is only punctuation or an emoji title** ("???", "🃏") must still produce a usable slug (`story`, with a numeric suffix on clash), never an empty path segment. Pinned in Task 2.
2. **A Range request past the end of the file or with a reversed range** (`bytes=999999-`, `bytes=50-10`) must answer 416 with `Content-Range: bytes */<size>`, never 500 or a hung response. Pinned in Task 3.
3. **A body with an unclosed tag or a stray closing tag** (`<p>hello <strong>there`, `</div><p>x</p>`) must sanitise to balanced HTML that does not break the page below it. Pinned in Task 1.
4. **An upload that lies about its kind** (a PNG sent with `kind=video`, or a WebM sent with `kind=image`) must be refused with 415 and leave no file on disk. Pinned in Task 3.
5. **Unpublishing a story that the home page cache already rendered** must drop it from the home page and make its URL 404 on the very next request. Pinned in Task 9.

---

## File structure

**New**

| file | responsibility |
| --- | --- |
| `server/sanitize.mjs` | `sanitizeHtml(html)`: allowlist rebuild of TinyMCE output |
| `server/content.mjs` | `createContentStore({ dir })`: stories, shorts, media paths, version, `publicContent()` |
| `server/media.mjs` | `sniff()`, `saveUpload()` (streamed), `createMediaHandler()` (Range) |
| `server/render.mjs` | `createRenderer()`: live pages, sitemap, preview, version cache |
| `scripts/lib/document.mjs` | `createDocumentBuilder()`, `withRuntimeContent()`, `stripScripts()`, the two assertions |
| `src/lib/runtimeContent.js` | module-state holder plus the inline JSON reader |
| `src/lib/dates.js` | `formatShortDate`, `formatLongDate`, locale-free |
| `src/components/ShortPlayer.jsx` + `.css` | the `<dialog>` overlay |
| `src/pages/StoryPage.jsx` + `.css` | one story |
| `src/pages/StoriesPage.jsx` + `.css` | the index |
| `admin/publish.js`, `admin/publish.css` | the Publish section's views, editors, uploads |
| tests: `sanitize.test.js`, `contentStore.test.js`, `media.test.js`, `document.test.js`, `render.test.js`, `storyPage.test.jsx` | |

**Modified**

| file | change |
| --- | --- |
| `server/store.mjs` | `content: createContentStore({ dir })` on the returned object |
| `server/index.mjs` | media, live sitemap, live pages, renderer passed to admin |
| `scripts/prerender.mjs` | use the extracted builder |
| `admin/handler.mjs` | publishing API, media upload, preview, TinyMCE files, `publishing` in status |
| `admin/index.html`, `admin/app.js` | load `publish.js`/`publish.css`; Publish nav group; view dispatch; editor-safe refresh |
| `src/routes.js` | `/stories`, `/stories/:slug` (`dynamic`), param matching |
| `src/entry-prerender.jsx`, `src/main.jsx` | export / read runtime content |
| `src/lib/seo.jsx` | `type` prop for `og:type` |
| `src/lib/structuredData.js` | `articleLd()` |
| `src/content/stories.js`, `src/content/shorts.js` | strings; `items` → `demo` |
| `src/components/Stories.jsx`, `Stories.css`, `Shorts.jsx`, `Shorts.css` | published cards |
| `vite.config.js` | dev: inject runtime JSON, serve `/media` |
| `src/test/home.test.jsx`, `routes.test.js`, `admin.test.js` | updated contracts |
| `CLAUDE.md`, `docs/ENVIRONMENTS.md`, `package.json` | docs; dependency |

---

### Task 1: HTML sanitiser

**Files:**
- Create: `server/sanitize.mjs`
- Test: `src/test/sanitize.test.js`

**Interfaces:**
- Produces: `sanitizeHtml(html: string): string`. Pure, synchronous, never throws on any string input.

- [ ] **Step 1: Write the failing tests**

```js
// src/test/sanitize.test.js
// Contract: body HTML from the dashboard is rebuilt from an allowlist before
// it is stored, so nothing but article markup ever reaches a page.
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '../../server/sanitize.mjs'

describe('sanitizeHtml', () => {
  it('keeps article markup as it is', () => {
    const html =
      '<h2>Heading</h2><p>Text with <strong>bold</strong>, <em>em</em> and <a href="/poker-calendar/2026">a link</a>.</p>' +
      '<ul><li>one</li><li>two</li></ul><blockquote><p>quote</p></blockquote>' +
      '<figure><img src="/media/abc123.webp" alt="A table" width="1200" height="675" /><figcaption>Cap</figcaption></figure>' +
      '<table><thead><tr><th colspan="2">h</th></tr></thead><tbody><tr><td>a</td><td>b</td></tr></tbody></table>' +
      '<pre><code>x &lt; y</code></pre><p>H<sub>2</sub>O and x<sup>2</sup><br />line</p><hr />'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('drops scripts, styles, event handlers and javascript: links', () => {
    expect(sanitizeHtml('<p>a</p><script>alert(1)</script><p>b</p>')).toBe('<p>a</p><p>b</p>')
    expect(sanitizeHtml('<style>p{display:none}</style><p>x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<p onclick="x()">x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
    expect(sanitizeHtml('<iframe src="https://evil.example"></iframe><p>x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<!-- note --><p>x</p>')).toBe('<p>x</p>')
  })

  it('unwraps unknown wrappers but keeps their text', () => {
    expect(sanitizeHtml('<div><span style="color:red">x</span></div>')).toBe('x')
    expect(sanitizeHtml('<p><font color="red">x</font></p>')).toBe('<p>x</p>')
  })

  it('opens external links in a new tab with rel, and leaves internal ones alone', () => {
    expect(sanitizeHtml('<a href="https://pokernews.com/x">x</a>')).toBe(
      '<a href="https://pokernews.com/x" target="_blank" rel="noopener noreferrer">x</a>',
    )
    expect(sanitizeHtml('<a href="/about">x</a>')).toBe('<a href="/about">x</a>')
    expect(sanitizeHtml('<a href="mailto:a@b.c">x</a>')).toBe('<a href="mailto:a@b.c">x</a>')
    expect(sanitizeHtml('<a href="//evil.example/x">x</a>')).toBe('<a>x</a>')
  })

  it('allows images from the media folder or https only, never data: URLs', () => {
    expect(sanitizeHtml('<img src="data:image/png;base64,AAAA" alt="x" />')).toBe('<img alt="x" />')
    expect(sanitizeHtml('<img src="https://cdn.example/a.jpg" alt="" />')).toBe(
      '<img src="https://cdn.example/a.jpg" alt="" />',
    )
    expect(sanitizeHtml('<img src="/media/../secret" alt="" />')).toBe('<img alt="" />')
  })

  it('keeps style only when it is a text-align rule, and numbers only in size attributes', () => {
    expect(sanitizeHtml('<p style="text-align: center;">x</p>')).toBe('<p style="text-align: center;">x</p>')
    expect(sanitizeHtml('<p style="text-align:center;color:red">x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<img src="/media/a1.webp" alt="" width="12px" height="7" />')).toBe(
      '<img src="/media/a1.webp" alt="" height="7" />',
    )
  })

  it('balances malformed markup and escapes text', () => {
    expect(sanitizeHtml('<p>hello <strong>there')).toBe('<p>hello <strong>there</strong></p>')
    expect(sanitizeHtml('</div><p>x</p></p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('a < b > c & d')).toBe('a &lt; b &gt; c &amp; d')
    expect(sanitizeHtml('<p>&amp; &nbsp; &#169;</p>')).toBe('<p>&amp; &nbsp; &#169;</p>')
    expect(sanitizeHtml('<img alt="a &quot;b&quot; <c>" src="/media/a1.webp">')).toBe(
      '<img alt="a &quot;b&quot; &lt;c&gt;" src="/media/a1.webp" />',
    )
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
  })
})
```

- [ ] **Step 2: Run the test to see it fail**

Run: `yarn vitest run src/test/sanitize.test.js`
Expected: FAIL, "Failed to load url ../../server/sanitize.mjs".

- [ ] **Step 3: Write the sanitiser**

```js
// server/sanitize.mjs
// Rebuilds body HTML from an allowlist. The dashboard's editor (TinyMCE)
// writes the body; this runs on every save so nothing but article markup is
// ever stored, whatever the editor, a paste, or a hand-edited request sent.
// No dependencies: a small tokenizer over tags, comments and text.
//
// Policy, in one place:
//   - allowed tags are kept (with allowed attributes only); block-level
//     containers that are not allowed (div, span, font...) are unwrapped;
//     script, style, iframe and the like are removed with their contents
//   - href: http(s), mailto, same-site path or fragment; external links open
//     in a new tab with rel="noopener noreferrer"
//   - src: a /media/ file or https
//   - style: exactly one text-align rule, nothing else
//   - width/height/colspan/rowspan: digits only
//   - output is balanced: open tags are closed at the end, stray closers go

const ALLOWED = new Set([
  'p', 'h2', 'h3', 'h4', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote',
  'img', 'figure', 'figcaption', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'pre', 'code', 'sub', 'sup',
])
const VOID = new Set(['br', 'hr', 'img'])
// Their contents are not text to keep.
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'title', 'head',
])

const ATTRS = {
  a: ['href'],
  img: ['src', 'alt', 'width', 'height'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
}
const STYLE_OK = ['p', 'h2', 'h3', 'h4', 'figure', 'th', 'td', 'li', 'blockquote']

const MEDIA_SRC = /^\/media\/[a-z0-9]+\.[a-z0-9]+$/
const HTTPS = /^https:\/\/[^\s"'<>]+$/
const HREF_OK = /^(https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|\/(?!\/)[^\s"'<>]*|#[^\s"'<>]*)$/
const TEXT_ALIGN = /^\s*text-align\s*:\s*(left|right|center|justify)\s*;?\s*$/i
const DIGITS = /^\d+$/

const TOKEN = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[a-zA-Z][^>]*>|<[^a-zA-Z/!][^<]*|[^<]+|</g
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

function escapeText(text) {
  // Keep entities TinyMCE wrote (&amp; &nbsp; &#169;) and escape everything else.
  return text
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, '&quot;')
}

function parseTag(raw) {
  const m = raw.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9]*)([\s\S]*?)\/?>$/)
  if (!m) return null
  const attrs = {}
  for (const a of m[3].matchAll(ATTR)) {
    attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? ''
  }
  return { closing: m[1] === '/', name: m[2].toLowerCase(), attrs }
}

function cleanAttrs(name, attrs) {
  const out = []
  for (const key of ATTRS[name] || []) {
    if (!(key in attrs)) continue
    const value = attrs[key].trim()
    if (key === 'href') {
      if (!HREF_OK.test(value)) continue
      out.push(`href="${escapeAttr(value)}"`)
      if (/^https?:\/\//.test(value)) out.push('target="_blank"', 'rel="noopener noreferrer"')
    } else if (key === 'src') {
      if (MEDIA_SRC.test(value) || HTTPS.test(value)) out.push(`src="${escapeAttr(value)}"`)
    } else if (key === 'alt') {
      out.push(`alt="${escapeAttr(attrs[key])}"`)
    } else if (DIGITS.test(value)) {
      out.push(`${key}="${value}"`)
    }
  }
  if (STYLE_OK.includes(name) && 'style' in attrs) {
    const m = attrs.style.match(TEXT_ALIGN)
    if (m) out.push(`style="text-align: ${m[1].toLowerCase()};"`)
  }
  return out.length ? ` ${out.join(' ')}` : ''
}

/**
 * @param {unknown} html  anything; non-strings read as empty
 * @returns {string} balanced HTML containing only allowed markup
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string' || !html) return ''
  const out = []
  const open = [] // allowed tags currently open, innermost last
  let dropping = null // tag name whose contents are being skipped

  for (const token of html.match(TOKEN) || []) {
    if (dropping) {
      const tag = token[0] === '<' ? parseTag(token) : null
      if (tag && tag.closing && tag.name === dropping) dropping = null
      continue
    }
    if (token[0] !== '<') {
      out.push(escapeText(token))
      continue
    }
    if (token.startsWith('<!')) continue // comments, doctypes, CDATA
    const tag = parseTag(token)
    if (!tag) {
      out.push(escapeText(token)) // a lone "<" or "<3"
      continue
    }
    if (DROP_WITH_CONTENT.has(tag.name)) {
      if (!tag.closing) dropping = tag.name
      continue
    }
    if (!ALLOWED.has(tag.name)) continue // unwrap: drop the tag, keep its contents
    if (VOID.has(tag.name)) {
      if (!tag.closing) out.push(`<${tag.name}${cleanAttrs(tag.name, tag.attrs)} />`)
      continue
    }
    if (tag.closing) {
      const at = open.lastIndexOf(tag.name)
      if (at === -1) continue // a closer with no opener
      while (open.length > at) out.push(`</${open.pop()}>`)
      continue
    }
    out.push(`<${tag.name}${cleanAttrs(tag.name, tag.attrs)}>`)
    open.push(tag.name)
  }
  while (open.length) out.push(`</${open.pop()}>`)
  return out.join('')
}
```

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/test/sanitize.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Lint, format, commit**

```bash
yarn eslint server/sanitize.mjs src/test/sanitize.test.js && yarn prettier --write server/sanitize.mjs src/test/sanitize.test.js
git add server/sanitize.mjs src/test/sanitize.test.js
git commit -m "Add an allowlist sanitiser for article body HTML

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Content store

**Files:**
- Create: `server/content.mjs`
- Modify: `server/store.mjs` (the header comment and the returned object)
- Test: `src/test/contentStore.test.js`

**Interfaces:**
- Consumes: `sanitizeHtml` from Task 1.
- Produces: `createContentStore({ dir })` returning:
  - `dir`, `mediaDir` (strings), `version` (getter, number, starts at 1 and increments on every write)
  - `listStories()`, `getStory(id)`, `getStoryBySlug(slug)`, `addStory(fields)`, `updateStory(id, fields)`, `publishStory(id)`, `unpublishStory(id)`, `deleteStory(id)`
  - the same eight for shorts: `listShorts`, `getShort`, `getShortBySlug`, `addShort`, `updateShort`, `publishShort`, `unpublishShort`, `deleteShort`
  - `publicContent()` → `{ stories: PublicStory[], shorts: PublicShort[] }`
  - `toPublicStory(record)` → PublicStory for any record, draft included (the preview uses it)
  - `publishStory`/`publishShort` return `{ record }` on success or `{ missing: string[] }`; `null` for an unknown id. `update*` returns the record or `null`. `delete*` returns `true`/`false`.
  - `slugify(text)` exported for the dashboard-side tests.
- `store.content` on the object `createStore()` returns.

PublicStory: `{ slug, href, title, date, standfirst, heroImage, heroThumb, heroAlt, body, publishedAt, updatedAt }`. PublicShort: `{ slug, title, video, poster, duration, publishedAt }`.

- [ ] **Step 1: Write the failing tests**

```js
// src/test/contentStore.test.js
// Contract: stories and shorts live under DATA_DIR beside the enquiries,
// drafts never reach the site, slugs are URL-safe and locked once published,
// and a delete takes the record's own media with it.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../../server/store.mjs'
import { createContentStore, slugify } from '../../server/content.mjs'

let dir, content
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'apc-content-'))
  content = createContentStore({ dir })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const media = (name) => {
  mkdirSync(content.mediaDir, { recursive: true })
  writeFileSync(join(content.mediaDir, name), 'x')
  return `/media/${name}`
}

describe('slugify', () => {
  it('makes URL-safe slugs and never an empty one', () => {
    expect(slugify('The River Card That Changed Everything!')).toBe(
      'the-river-card-that-changed-everything',
    )
    expect(slugify("  Aussie Millions: what's next?  ")).toBe('aussie-millions-whats-next')
    expect(slugify('???')).toBe('')
    expect(slugify('🃏')).toBe('')
    expect(slugify('a'.repeat(120))).toHaveLength(80)
  })
})

describe('stories', () => {
  it('creates a draft with a slug from the title, and suffixes a clash', () => {
    const a = content.addStory({ title: 'Big Night at Crown' })
    expect(a).toMatchObject({ slug: 'big-night-at-crown', status: 'draft', title: 'Big Night at Crown' })
    expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(a.id).toMatch(/^[a-z0-9]+$/)
    const b = content.addStory({ title: 'Big Night at Crown' })
    expect(b.slug).toBe('big-night-at-crown-2')
    const c = content.addStory({ title: '???' })
    expect(c.slug).toBe('story')
    expect(content.addStory({}).slug).toBe('story-2')
    // Newest first for the dashboard: the last one added leads the list.
    expect(content.listStories()[0].slug).toBe('story-2')
    expect(createContentStore({ dir }).listStories()).toHaveLength(4)
  })

  it('updates text fields, clips them, sanitises the body and ignores junk', () => {
    const { id } = content.addStory({ title: 'Draft' })
    const hero = media('h1.webp')
    const updated = content.updateStory(id, {
      title: 'New title',
      standfirst: 'One line.',
      body: '<p>Hi</p><script>x()</script>',
      heroImage: hero,
      heroThumb: '/media/../etc',
      heroAlt: 'Alt',
      date: '2026-10-05',
      status: 'published',
      id: 'hacked',
      slug: 'Custom Slug!',
    })
    expect(updated).toMatchObject({
      id,
      title: 'New title',
      standfirst: 'One line.',
      body: '<p>Hi</p>',
      heroImage: hero,
      heroAlt: 'Alt',
      date: '2026-10-05',
      status: 'draft',
      slug: 'custom-slug',
    })
    expect(updated.heroThumb).toBe('')
    expect(content.updateStory(id, { date: 'yesterday' }).date).toBe('2026-10-05')
    expect(content.updateStory(id, { title: 'x'.repeat(300) }).title).toHaveLength(200)
    expect(content.updateStory('nope', { title: 'x' })).toBeNull()
    expect(content.getStory(id).updatedAt >= content.getStory(id).createdAt).toBe(true)
  })

  it('refuses to publish without a title and hero, then publishes and locks the slug', () => {
    const { id } = content.addStory({})
    expect(content.publishStory(id)).toEqual({ missing: ['title', 'heroImage'] })
    content.updateStory(id, { title: 'Ready', heroImage: media('a.webp'), heroThumb: media('b.webp') })
    const { record } = content.publishStory(id)
    expect(record.status).toBe('published')
    expect(record.publishedAt).toBeTruthy()
    expect(content.updateStory(id, { slug: 'changed' }).slug).toBe('ready')
    expect(content.getStoryBySlug('ready').id).toBe(id)
    expect(content.unpublishStory(id).status).toBe('draft')
    expect(content.publishStory('nope')).toBeNull()
  })

  it('bumps the version on every write and not on reads', () => {
    const v0 = content.version
    const { id } = content.addStory({ title: 'A' })
    expect(content.version).toBe(v0 + 1)
    content.listStories()
    content.getStory(id)
    content.publicContent()
    expect(content.version).toBe(v0 + 1)
    content.updateStory(id, { title: 'B' })
    expect(content.version).toBe(v0 + 2)
  })

  it('deletes a story and its own media only', () => {
    const hero = media('hero.webp')
    const thumb = media('thumb.webp')
    const shared = media('inline.webp')
    const { id } = content.addStory({ title: 'Gone', heroImage: hero, heroThumb: thumb })
    content.updateStory(id, { body: `<p><img src="${shared}" alt="" /></p>` })
    expect(content.deleteStory(id)).toBe(true)
    expect(content.deleteStory(id)).toBe(false)
    expect(content.getStory(id)).toBeNull()
    expect(existsSync(join(content.mediaDir, 'hero.webp'))).toBe(false)
    expect(existsSync(join(content.mediaDir, 'thumb.webp'))).toBe(false)
    expect(existsSync(join(content.mediaDir, 'inline.webp'))).toBe(true)
  })
})

describe('shorts', () => {
  it('needs a title, video and poster to publish, keeps duration as a number', () => {
    const { id } = content.addShort({ title: 'Clip', duration: '34.6' })
    expect(content.getShort(id).duration).toBe(35)
    expect(content.publishShort(id)).toEqual({ missing: ['video', 'poster'] })
    content.updateShort(id, { video: media('v.mp4'), poster: media('p.webp'), duration: -3 })
    expect(content.getShort(id).duration).toBe(0)
    expect(content.publishShort(id).record.status).toBe('published')
    expect(content.getShortBySlug('clip').id).toBe(id)
    expect(content.deleteShort(id)).toBe(true)
    expect(existsSync(join(content.mediaDir, 'v.mp4'))).toBe(false)
  })
})

describe('publicContent', () => {
  it('returns published records only, in the site shape, newest first', () => {
    const s1 = content.addStory({ title: 'Older', date: '2026-09-01', heroImage: media('1.webp') })
    const s2 = content.addStory({ title: 'Newer', date: '2026-10-01', heroImage: media('2.webp') })
    content.addStory({ title: 'Draft', date: '2026-12-01', heroImage: media('3.webp') })
    content.publishStory(s1.id)
    content.publishStory(s2.id)
    const sh = content.addShort({ title: 'Clip', video: media('v.webm'), poster: media('p.webp'), duration: 12 })
    content.publishShort(sh.id)
    const pub = content.publicContent()
    expect(pub.stories.map((s) => s.title)).toEqual(['Newer', 'Older'])
    expect(pub.stories[0]).toEqual({
      slug: 'newer',
      href: '/stories/newer',
      title: 'Newer',
      date: '2026-10-01',
      standfirst: '',
      heroImage: '/media/2.webp',
      heroThumb: '',
      heroAlt: 'Newer',
      body: '',
      publishedAt: expect.any(String),
      updatedAt: expect.any(String),
    })
    expect(pub.shorts).toEqual([
      {
        slug: 'clip',
        title: 'Clip',
        video: '/media/v.webm',
        poster: '/media/p.webp',
        duration: 12,
        publishedAt: expect.any(String),
      },
    ])
  })
})

describe('store wiring', () => {
  it('exposes the content store on createStore()', () => {
    const store = createStore({ dir })
    expect(store.content.mediaDir).toBe(join(dir, 'media'))
    expect(store.content.listStories()).toEqual([])
    const draft = store.content.addStory({ title: 'Draft' })
    expect(store.content.toPublicStory(draft)).toMatchObject({ slug: 'draft', href: '/stories/draft' })
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `yarn vitest run src/test/contentStore.test.js`
Expected: FAIL, cannot load `server/content.mjs`.

- [ ] **Step 3: Write the content store**

```js
// server/content.mjs
// The publishing half of the data store: stories (articles written in the
// dashboard), shorts (vertical videos) and the media folder their files live
// in. Everything under DATA_DIR beside the enquiries (server/store.mjs):
//
//   .data/
//   ├── stories.json   every story, drafts included, oldest first
//   ├── shorts.json    every short, likewise
//   └── media/         <id>.<ext>, written by server/media.mjs
//
// Drafts never leave this module: publicContent() is the only shape the site
// sees and it carries published records only. `version` increments on every
// write so server/render.mjs can cache rendered pages until something changes.

import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { sanitizeHtml } from './sanitize.mjs'

const MEDIA_URL = /^\/media\/[a-z0-9]+\.[a-z0-9]+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

const KINDS = {
  story: {
    file: 'stories.json',
    fallbackSlug: 'story',
    text: { title: 200, standfirst: 600, heroAlt: 200 },
    media: ['heroImage', 'heroThumb'],
    required: ['title', 'heroImage'],
    blank: { title: '', standfirst: '', heroImage: '', heroThumb: '', heroAlt: '', body: '' },
  },
  short: {
    file: 'shorts.json',
    fallbackSlug: 'short',
    text: { title: 200 },
    media: ['video', 'poster'],
    required: ['title', 'video', 'poster'],
    blank: { title: '', video: '', poster: '', duration: 0 },
  },
}

/** Lower-case ASCII and hyphens, at most 80 characters; '' when nothing survives. */
export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(value))
  renameSync(tmp, file)
}

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
const now = () => new Date().toISOString()
const newId = () => `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`

/**
 * @param {object} [options]
 * @param {string} [options.dir]  DATA_DIR; defaults like server/store.mjs
 */
export function createContentStore({ dir = process.env.DATA_DIR || join(process.cwd(), '.data') } = {}) {
  const mediaDir = join(dir, 'media')
  let version = 1

  function removeMedia(url) {
    if (!MEDIA_URL.test(url || '')) return
    const file = join(mediaDir, basename(url))
    try {
      if (existsSync(file)) unlinkSync(file)
    } catch {
      // A file that cannot be removed is an orphan, not a failure.
    }
  }

  function collection(kind) {
    const spec = KINDS[kind]
    const file = join(dir, spec.file)
    const read = () => {
      const list = readJson(file, [])
      return Array.isArray(list) ? list : []
    }
    const write = (list) => {
      writeJson(file, list)
      version += 1
    }

    function uniqueSlug(list, wanted, exceptId) {
      const base = slugify(wanted) || spec.fallbackSlug
      const taken = new Set(list.filter((r) => r.id !== exceptId).map((r) => r.slug))
      if (!taken.has(base)) return base
      for (let n = 2; ; n += 1) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
    }

    /** Copies the fields a caller may set onto `record`, cleaned. */
    function apply(record, fields, list) {
      for (const [key, max] of Object.entries(spec.text)) {
        if (typeof fields[key] === 'string') record[key] = fields[key].trim().slice(0, max)
      }
      for (const key of spec.media) {
        if (typeof fields[key] === 'string') record[key] = MEDIA_URL.test(fields[key]) ? fields[key] : ''
      }
      if (kind === 'story') {
        if (typeof fields.body === 'string') record.body = sanitizeHtml(fields.body)
        if (typeof fields.date === 'string' && DATE.test(fields.date)) record.date = fields.date
      }
      if (kind === 'short' && fields.duration !== undefined) {
        const seconds = Math.round(Number(fields.duration))
        record.duration = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
      }
      if (typeof fields.slug === 'string' && record.status !== 'published') {
        record.slug = uniqueSlug(list, fields.slug, record.id)
      }
      record.updatedAt = now()
    }

    function add(fields = {}) {
      const list = read()
      const record = {
        id: newId(),
        slug: '',
        ...spec.blank,
        ...(kind === 'story' && { date: today() }),
        status: 'draft',
        createdAt: now(),
        updatedAt: now(),
        publishedAt: '',
      }
      apply(record, { ...fields, slug: undefined }, list)
      record.slug = uniqueSlug(list, fields.slug ?? record.title, record.id)
      list.push(record)
      write(list)
      return record
    }

    function get(id) {
      return read().find((r) => r.id === id) ?? null
    }

    function bySlug(slug) {
      return read().find((r) => r.slug === slug) ?? null
    }

    function update(id, fields = {}) {
      const list = read()
      const record = list.find((r) => r.id === id)
      if (!record) return null
      apply(record, fields, list)
      write(list)
      return record
    }

    function publish(id) {
      const list = read()
      const record = list.find((r) => r.id === id)
      if (!record) return null
      const missing = spec.required.filter((key) => !record[key])
      if (missing.length) return { missing }
      record.status = 'published'
      record.publishedAt = record.publishedAt || now()
      record.updatedAt = now()
      write(list)
      return { record }
    }

    function unpublish(id) {
      const list = read()
      const record = list.find((r) => r.id === id)
      if (!record) return null
      record.status = 'draft'
      record.updatedAt = now()
      write(list)
      return record
    }

    function remove(id) {
      const list = read()
      const record = list.find((r) => r.id === id)
      if (!record) return false
      for (const key of spec.media) removeMedia(record[key])
      write(list.filter((r) => r.id !== id))
      return true
    }

    return { list: read, get, bySlug, add, update, publish, unpublish, remove }
  }

  const stories = collection('story')
  const shorts = collection('short')

  const publicStory = (s) => ({
    slug: s.slug,
    href: `/stories/${s.slug}`,
    title: s.title,
    date: s.date,
    standfirst: s.standfirst,
    heroImage: s.heroImage,
    heroThumb: s.heroThumb,
    heroAlt: s.heroAlt || s.title,
    body: s.body,
    publishedAt: s.publishedAt,
    updatedAt: s.updatedAt,
  })
  const publicShort = (s) => ({
    slug: s.slug,
    title: s.title,
    video: s.video,
    poster: s.poster,
    duration: s.duration,
    publishedAt: s.publishedAt,
  })

  /** What the site renders: published records only, newest first. */
  function publicContent() {
    return {
      stories: stories
        .list()
        .filter((s) => s.status === 'published')
        .sort((a, b) => b.date.localeCompare(a.date) || b.publishedAt.localeCompare(a.publishedAt))
        .map(publicStory),
      shorts: shorts
        .list()
        .filter((s) => s.status === 'published')
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .map(publicShort),
    }
  }

  return {
    dir,
    mediaDir,
    get version() {
      return version
    },
    listStories: () => stories.list().reverse(),
    getStory: stories.get,
    getStoryBySlug: stories.bySlug,
    addStory: stories.add,
    updateStory: stories.update,
    publishStory: stories.publish,
    unpublishStory: stories.unpublish,
    deleteStory: stories.remove,
    listShorts: () => shorts.list().reverse(),
    getShort: shorts.get,
    getShortBySlug: shorts.bySlug,
    addShort: shorts.add,
    updateShort: shorts.update,
    publishShort: shorts.publish,
    unpublishShort: shorts.unpublish,
    deleteShort: shorts.remove,
    publicContent,
    toPublicStory: publicStory,
  }
}
```

Note `listStories()` returns newest first (reverse of the file order) for the dashboard; `publicContent()` sorts by date for the site.

- [ ] **Step 4: Wire it into the store**

In `server/store.mjs`, add the import and the field. Also extend the header comment's tree.

```js
// after the other imports
import { createContentStore } from './content.mjs'
```

Header comment tree becomes:

```
//   .data/
//   ├── salt                  random, generated once, keys the visitor hashes
//   ├── enquiries.json        every submission, newest last
//   ├── traffic/2026-10-03.json   one tally per Melbourne day
//   ├── stories.json, shorts.json   the dashboard's published content (server/content.mjs)
//   └── media/                uploaded images and video
```

And the return line at the bottom:

```js
  const content = createContentStore({ dir })
  return { dir, content, addEnquiry, listEnquiries, updateEnquiry, recordView, traffic, flush }
```

- [ ] **Step 5: Run the tests**

Run: `yarn vitest run src/test/contentStore.test.js src/test/store.test.js`
Expected: PASS.

- [ ] **Step 6: Lint, format, commit**

```bash
yarn eslint server/content.mjs server/store.mjs src/test/contentStore.test.js && yarn prettier --write server/content.mjs server/store.mjs src/test/contentStore.test.js
git add server/content.mjs server/store.mjs src/test/contentStore.test.js
git commit -m "Keep stories, shorts and their media in the data store

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Media: streamed uploads and Range serving

**Files:**
- Create: `server/media.mjs`
- Test: `src/test/media.test.js`

**Interfaces:**
- Produces:
  - `LIMITS = { image: 10485760, video: 314572800 }`
  - `sniff(buffer): { kind: 'image'|'video', ext: string, type: string } | null` (needs 12 bytes)
  - `class UploadError extends Error { status: number; code: 'kind'|'size'|'type'|'body'|'disk' }`
  - `saveUpload(req, { dir, kind }): Promise<{ file, url, bytes, type }>` where `url` is `/media/<file>`
  - `createMediaHandler({ dir }): (req, res) => boolean` answering `GET`/`HEAD /media/<file>`

- [ ] **Step 1: Write the failing tests**

```js
// src/test/media.test.js
// Contract: an upload is streamed to DATA_DIR/media under a server-chosen
// name, accepted only when its bytes match the kind the dashboard said it
// was and it is under the cap, and served back with Range support (Safari
// will not play a video without it) and a long cache.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createMediaHandler, saveUpload, sniff, LIMITS } from '../../server/media.mjs'

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 1)])
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(40, 2)])
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(40, 3)])

let dir, server, base
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'apc-media-'))
  const media = createMediaHandler({ dir: join(dir, 'media') })
  server = createServer((req, res) => {
    if (req.method === 'PUT') {
      const kind = new URL(req.url, 'http://x').searchParams.get('kind')
      saveUpload(req, { dir: join(dir, 'media'), kind }).then(
        (r) => {
          res.writeHead(201, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(r))
        },
        (err) => {
          res.writeHead(err.status || 500)
          res.end(err.code || 'failed')
        },
      )
      return
    }
    if (media(req, res)) return
    res.writeHead(404)
    res.end('fallthrough')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => {
  server.close()
  rmSync(dir, { recursive: true, force: true })
})

const files = () => readdirSync(join(dir, 'media')).filter((f) => !f.endsWith('.part'))
const put = (body, kind) => fetch(`${base}/upload?kind=${kind}`, { method: 'PUT', body })

describe('sniff', () => {
  it('knows the five formats and nothing else', () => {
    expect(sniff(PNG)).toMatchObject({ kind: 'image', ext: 'png', type: 'image/png' })
    expect(sniff(MP4)).toMatchObject({ kind: 'video', ext: 'mp4' })
    expect(sniff(WEBM)).toMatchObject({ kind: 'video', ext: 'webm' })
    expect(sniff(Buffer.from('RIFF....WEBPVP8 '))).toMatchObject({ ext: 'webp' })
    expect(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toMatchObject({ ext: 'jpg' })
    expect(sniff(Buffer.from('hello world!'))).toBeNull()
    expect(sniff(Buffer.from('ab'))).toBeNull()
  })
})

describe('saveUpload', () => {
  it('streams a file to disk under a generated name and answers its URL', async () => {
    const res = await put(PNG, 'image')
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.url).toMatch(/^\/media\/[a-z0-9]+\.png$/)
    expect(body.bytes).toBe(PNG.length)
    expect(body.type).toBe('image/png')
    expect(files()).toContain(body.url.slice('/media/'.length))
  })

  it('refuses a file whose bytes do not match its kind and leaves nothing behind', async () => {
    const before = files().length
    expect((await put(PNG, 'video')).status).toBe(415)
    expect((await put(WEBM, 'image')).status).toBe(415)
    expect((await put(Buffer.from('plain text, not an image'), 'image')).status).toBe(415)
    expect((await put(Buffer.from('tiny'), 'image')).status).toBe(415)
    expect((await put(PNG, 'pdf')).status).toBe(400)
    expect(files()).toHaveLength(before)
  })

  it('refuses an oversize upload while it streams', async () => {
    const before = files().length
    const big = Buffer.concat([PNG, Buffer.alloc(LIMITS.image)])
    expect((await put(big, 'image')).status).toBe(413)
    expect(files()).toHaveLength(before)
    expect(readdirSync(join(dir, 'media')).filter((f) => f.endsWith('.part'))).toHaveLength(0)
  })
})

describe('serving /media', () => {
  let name
  beforeAll(() => {
    mkdirSync(join(dir, 'media'), { recursive: true })
    name = 'abc123.mp4'
    writeFileSync(join(dir, 'media', name), Buffer.from('0123456789'))
  })

  it('serves the whole file with a long cache and Accept-Ranges', async () => {
    const res = await fetch(`${base}/media/${name}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(res.headers.get('cache-control')).toContain('max-age=2592000')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(await res.text()).toBe('0123456789')
    const head = await fetch(`${base}/media/${name}`, { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe('10')
  })

  it('answers a Range with 206 and the right slice, including a suffix range', async () => {
    const res = await fetch(`${base}/media/${name}`, { headers: { Range: 'bytes=2-5' } })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(res.headers.get('content-length')).toBe('4')
    expect(await res.text()).toBe('2345')
    const open = await fetch(`${base}/media/${name}`, { headers: { Range: 'bytes=7-' } })
    expect(open.headers.get('content-range')).toBe('bytes 7-9/10')
    expect(await open.text()).toBe('789')
    const suffix = await fetch(`${base}/media/${name}`, { headers: { Range: 'bytes=-3' } })
    expect(suffix.headers.get('content-range')).toBe('bytes 7-9/10')
    expect(await suffix.text()).toBe('789')
    const clamp = await fetch(`${base}/media/${name}`, { headers: { Range: 'bytes=8-99' } })
    expect(clamp.headers.get('content-range')).toBe('bytes 8-9/10')
  })

  it('answers 416 to a range it cannot satisfy', async () => {
    for (const range of ['bytes=10-', 'bytes=50-10', 'bytes=-0', 'bytes=', 'items=1-2']) {
      const res = await fetch(`${base}/media/${name}`, { headers: { Range: range } })
      expect(res.status, range).toBe(416)
      expect(res.headers.get('content-range'), range).toBe('bytes */10')
    }
  })

  it('404s a missing file and refuses anything but a bare media name', async () => {
    expect((await fetch(`${base}/media/nope.mp4`)).status).toBe(404)
    expect(await (await fetch(`${base}/media/../salt`)).text()).toBe('fallthrough')
    expect(await (await fetch(`${base}/media/sub/x.mp4`)).text()).toBe('fallthrough')
    expect((await fetch(`${base}/media/${name}`, { method: 'POST' })).status).toBe(405)
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `yarn vitest run src/test/media.test.js`
Expected: FAIL, cannot load `server/media.mjs`.

- [ ] **Step 3: Write the media module**

```js
// server/media.mjs
// Uploaded images and video: the dashboard streams a file here, the site
// serves it back from /media/<file>.
//
// Uploads are never buffered. The body is written to <id>.part as it
// arrives, the first bytes decide the type (names and headers lie, bytes do
// not), the running total enforces the cap, and only a file that passed both
// is renamed into place. A refused upload is removed before the error goes
// back. Names are server-generated so a client cannot choose a path.
//
// Serving honours Range requests. Safari asks for bytes=0-1 before it will
// play a <video> and refuses a server that answers with the whole file, so
// without this every short is a blank player on iPhone.

import { randomBytes } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { extname, join } from 'node:path'

export const LIMITS = { image: 10 * 1024 * 1024, video: 300 * 1024 * 1024 }

const TYPES = [
  { kind: 'image', ext: 'png', type: 'image/png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { kind: 'image', ext: 'jpg', type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { kind: 'image', ext: 'gif', type: 'image/gif', test: (b) => b.toString('ascii', 0, 4) === 'GIF8' },
  {
    kind: 'image',
    ext: 'webp',
    type: 'image/webp',
    test: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
  { kind: 'video', ext: 'mp4', type: 'video/mp4', test: (b) => b.toString('ascii', 4, 8) === 'ftyp' },
  { kind: 'video', ext: 'webm', type: 'video/webm', test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
]
const SNIFF_BYTES = 12

const MIME = Object.fromEntries(TYPES.map((t) => [`.${t.ext}`, t.type]))
const NAME = /^\/media\/([a-z0-9]+\.[a-z0-9]+)$/

/** The format of a file from its first bytes, or null. Needs 12 bytes. */
export function sniff(buffer) {
  if (!buffer || buffer.length < SNIFF_BYTES) return null
  const hit = TYPES.find((t) => t.test(buffer))
  return hit ? { kind: hit.kind, ext: hit.ext, type: hit.type } : null
}

export class UploadError extends Error {
  /** @param {number} status  @param {'kind'|'size'|'type'|'body'|'disk'} code */
  constructor(status, code) {
    super(code)
    this.status = status
    this.code = code
  }
}

const newId = () => `${Date.now().toString(36)}${randomBytes(4).toString('hex')}`

/**
 * Stream a request body to `dir`.
 * @param {import('node:http').IncomingMessage} req
 * @param {{ dir: string, kind: 'image'|'video' }} options
 * @returns {Promise<{ file: string, url: string, bytes: number, type: string }>}
 */
export function saveUpload(req, { dir, kind }) {
  return new Promise((resolve, reject) => {
    if (!LIMITS[kind]) {
      req.resume()
      reject(new UploadError(400, 'kind'))
      return
    }
    mkdirSync(dir, { recursive: true })
    const id = newId()
    const tmp = join(dir, `${id}.part`)
    const out = createWriteStream(tmp)
    let head = Buffer.alloc(0)
    let match = null
    let bytes = 0
    let done = false

    const fail = (error) => {
      if (done) return
      done = true
      req.removeAllListeners('data')
      req.resume()
      out.destroy()
      try {
        if (existsSync(tmp)) unlinkSync(tmp)
      } catch {
        // nothing to do: the part file is an orphan at worst
      }
      reject(error)
    }

    const write = (chunk) => {
      if (!out.write(chunk)) {
        req.pause()
        out.once('drain', () => req.resume())
      }
    }

    req.on('data', (chunk) => {
      if (done) return
      bytes += chunk.length
      if (bytes > LIMITS[kind]) return fail(new UploadError(413, 'size'))
      if (match) return write(chunk)
      head = Buffer.concat([head, chunk])
      if (head.length < SNIFF_BYTES) return
      match = sniff(head)
      if (!match || match.kind !== kind) return fail(new UploadError(415, 'type'))
      write(head)
    })
    req.on('error', () => fail(new UploadError(400, 'body')))
    out.on('error', () => fail(new UploadError(500, 'disk')))
    req.on('end', () => {
      if (done) return
      if (!match) return fail(new UploadError(415, 'type'))
      out.end(() => {
        if (done) return
        done = true
        const file = `${id}.${match.ext}`
        try {
          renameSync(tmp, join(dir, file))
        } catch {
          return reject(new UploadError(500, 'disk'))
        }
        resolve({ file, url: `/media/${file}`, bytes, type: match.type })
      })
    })
  })
}

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '')
  if (!m || (m[1] === '' && m[2] === '')) return null
  let start, end
  if (m[1] === '') {
    const suffix = Number(m[2])
    if (suffix === 0) return null
    start = Math.max(size - suffix, 0)
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  }
  if (start >= size || start > end) return null
  return { start, end }
}

/**
 * @param {{ dir: string }} options  the media folder (store.content.mediaDir)
 * @returns {(req, res) => boolean}  true when the request was for /media and has been answered
 */
export function createMediaHandler({ dir }) {
  return function handleMedia(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname
    const m = NAME.exec(pathname)
    if (!m) return false
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      res.end('Method Not Allowed')
      return true
    }
    const file = join(dir, m[1])
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end('Not found')
      return true
    }
    const stat = statSync(file)
    const size = stat.size
    res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream')
    res.setHeader('Accept-Ranges', 'bytes')
    // Names are unique per upload, so a URL never changes behind itself.
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Last-Modified', stat.mtime.toUTCString())
    res.setHeader('ETag', `W/"${size}-${stat.mtimeMs}"`)

    let start = 0
    let end = size - 1
    if (req.headers.range !== undefined) {
      const range = parseRange(req.headers.range, size)
      if (!range) {
        res.writeHead(416, { 'Content-Range': `bytes */${size}` })
        res.end()
        return true
      }
      ;({ start, end } = range)
      res.statusCode = 206
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
    } else {
      res.statusCode = 200
    }
    res.setHeader('Content-Length', String(end - start + 1))
    if (req.method === 'HEAD') {
      res.end()
      return true
    }
    createReadStream(file, { start, end })
      .on('error', () => res.destroy())
      .pipe(res)
    return true
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/test/media.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Lint, format, commit**

```bash
yarn eslint server/media.mjs src/test/media.test.js && yarn prettier --write server/media.mjs src/test/media.test.js
git add server/media.mjs src/test/media.test.js
git commit -m "Stream dashboard uploads to the media folder and serve them with Range support

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Publishing API in the dashboard handler

**Files:**
- Modify: `admin/handler.mjs`
- Test: `src/test/admin.test.js` (append a describe block)

**Interfaces:**
- Consumes: `store.content` (Task 2), `saveUpload` (Task 3).
- Produces, all under `<prefix>/` and behind the existing gate:

```
GET    api/stories                 { items: Story[] }        newest first, every status
POST   api/stories   {json}        201 Story
GET    api/stories/<id>            Story | 404
PUT    api/stories/<id> {json}     Story | 404                 2 MB cap → 413
DELETE api/stories/<id>            204 | 404
POST   api/stories/<id>/publish    Story | 422 {error:'missing', missing:[...]} | 404
POST   api/stories/<id>/unpublish  Story | 404
                                   the same for api/shorts
PUT    api/media?kind=image|video  201 { url, bytes, type } | 400 | 413 | 415
```
  and `api/status` gains `"publishing": { stories: { total, published }, shorts: { total, published } }`.

- [ ] **Step 1: Write the failing tests**

Append to `src/test/admin.test.js`, inside the top-level `describe('admin handler')` after the existing tests (it uses `open`, `locked`, `store`):

```js
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
      expect((await fetch(`${locked.base}/admin/api/media?kind=image`, { method: 'PUT', body: PNG })).status).toBe(401)
    })

    it('creates, edits, publishes, unpublishes and deletes a story', async () => {
      const created = await json('POST', 'api/stories', { title: 'First story' })
      expect(created.status).toBe(201)
      const story = await created.json()
      expect(story).toMatchObject({ slug: 'first-story', status: 'draft' })

      const upload = await fetch(`${open.base}/admin/api/media?kind=image`, { method: 'PUT', body: PNG })
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
      expect((await (await fetch(`${open.base}/admin/api/stories`)).json()).items[0].id).toBe(story.id)
      expect((await (await fetch(`${open.base}/admin/api/stories/${story.id}`)).json()).id).toBe(story.id)

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

      expect((await fetch(`${open.base}/admin/api/media?kind=image`, { method: 'PUT', body: 'text' })).status).toBe(415)
      expect((await fetch(`${open.base}/admin/api/media?kind=zip`, { method: 'PUT', body: PNG })).status).toBe(400)
      expect((await fetch(`${open.base}/admin/api/media`, { method: 'GET' })).status).toBe(405)

      const notJson = await fetch(`${open.base}/admin/api/stories`, { method: 'POST', body: '{nope' })
      expect(notJson.status).toBe(400)
      const huge = await fetch(`${open.base}/admin/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x'.repeat(3 * 1024 * 1024) }),
      })
      expect(huge.status).toBe(413)
    })
  })
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `yarn vitest run src/test/admin.test.js`
Expected: the three new tests FAIL (404 from the fallthrough or 405).

- [ ] **Step 3: Add the routes to the handler**

In `admin/handler.mjs`:

1. Add the import at the top: `import { saveUpload } from '../server/media.mjs'`.
2. Add the constant `const MAX_JSON_BYTES = 2 * 1024 * 1024` under `MAX_FORM_BYTES`.
3. Add a body reader next to `readForm`:

```js
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let failed = false
    req.on('data', (chunk) => {
      if (failed) return
      size += chunk.length
      if (size > limit) {
        // Drain the rest rather than destroy the socket, or the 413 never
        // reaches the client.
        failed = true
        chunks.length = 0
        reject(Object.assign(new Error('too large'), { status: 413 }))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!failed) resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

/** A JSON object body, or a rejection carrying the status to answer with. */
async function readJson(req) {
  const raw = await readRaw(req, MAX_JSON_BYTES)
  try {
    const value = JSON.parse(raw.toString('utf8') || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object')
    return value
  } catch {
    throw Object.assign(new Error('bad json'), { status: 400 })
  }
}
```

4. Rewrite `readForm` to use `readRaw`:

```js
function readForm(req) {
  return readRaw(req, MAX_FORM_BYTES).then((raw) => new URLSearchParams(raw.toString('utf8')))
}
```

   and change the two `() => send(res, 413, 'Form too large')` rejections to `(error) => send(res, error.status || 500, error.status === 413 ? 'Form too large' : 'Bad request')`.

5. Inside `createAdminHandler`, after `hasSession`/`passwordMatches` and before `return function handleAdmin`, add the publishing routes:

```js
  const COLLECTION = /^api\/(stories|shorts)(?:\/([a-z0-9]+)(?:\/(publish|unpublish))?)?$/

  function collectionApi(name) {
    const c = store.content
    return name === 'stories'
      ? {
          list: c.listStories,
          get: c.getStory,
          add: c.addStory,
          update: c.updateStory,
          publish: c.publishStory,
          unpublish: c.unpublishStory,
          remove: c.deleteStory,
        }
      : {
          list: c.listShorts,
          get: c.getShort,
          add: c.addShort,
          update: c.updateShort,
          publish: c.publishShort,
          unpublish: c.unpublishShort,
          remove: c.deleteShort,
        }
  }

  const onBodyError = (res) => (error) =>
    json(res, error.status || 500, { error: error.status === 413 ? 'too-large' : 'bad-body' })

  /** The stories, shorts and media endpoints. True when answered. */
  function publishing(req, res, rest, url) {
    if (rest === 'api/media') {
      if (req.method !== 'PUT') {
        send(res, 405, 'Method Not Allowed')
        return true
      }
      if (!store?.content) {
        json(res, 503, { error: 'no-store' })
        return true
      }
      saveUpload(req, { dir: store.content.mediaDir, kind: url.searchParams.get('kind') }).then(
        (saved) => json(res, 201, { url: saved.url, bytes: saved.bytes, type: saved.type }),
        (error) => json(res, error.status || 500, { error: error.code || 'upload-failed' }),
      )
      return true
    }
    const match = COLLECTION.exec(rest)
    if (!match) return false
    if (!store?.content) {
      json(res, 503, { error: 'no-store' })
      return true
    }
    const [, name, id, action] = match
    const api = collectionApi(name)

    if (action) {
      if (req.method !== 'POST') {
        send(res, 405, 'Method Not Allowed')
        return true
      }
      const result = api[action](id)
      if (!result) json(res, 404, { error: 'not-found' })
      else if (result.missing) json(res, 422, { error: 'missing', missing: result.missing })
      else json(res, 200, result.record ?? result)
      return true
    }
    if (!id) {
      if (req.method === 'GET' || req.method === 'HEAD') json(res, 200, { items: api.list() })
      else if (req.method === 'POST') {
        readJson(req).then((fields) => json(res, 201, api.add(fields)), onBodyError(res))
      } else send(res, 405, 'Method Not Allowed')
      return true
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      const record = api.get(id)
      if (record) json(res, 200, record)
      else json(res, 404, { error: 'not-found' })
    } else if (req.method === 'PUT') {
      readJson(req).then((fields) => {
        const record = api.update(id, fields)
        if (record) json(res, 200, record)
        else json(res, 404, { error: 'not-found' })
      }, onBodyError(res))
    } else if (req.method === 'DELETE') {
      if (api.remove(id)) {
        res.writeHead(204, { 'Cache-Control': 'no-store' })
        res.end()
      } else json(res, 404, { error: 'not-found' })
    } else send(res, 405, 'Method Not Allowed')
    return true
  }

  function publishingStatus() {
    const c = store?.content
    const count = (list) => ({
      total: list.length,
      published: list.filter((r) => r.status === 'published').length,
    })
    return c
      ? { stories: count(c.listStories()), shorts: count(c.listShorts()) }
      : { stories: { total: 0, published: 0 }, shorts: { total: 0, published: 0 } }
  }
```

6. In `handleAdmin`, right after `if (gate(req, res, rest)) return true`, add:

```js
    if (publishing(req, res, rest, url)) return true
```

7. In the `api/status` branch, extend the injected prefix:

```js
            json.replace(
              /^\{/,
              `{"site":${JSON.stringify(site)},"auth":${Boolean(secret)},"publishing":${JSON.stringify(publishingStatus())},`,
            ),
```

8. Update the header comment's API list with the new endpoints (copy the table from this task's Interfaces).

- [ ] **Step 4: Run the tests**

Run: `yarn vitest run src/test/admin.test.js`
Expected: PASS, all tests including the three new ones.

- [ ] **Step 5: Lint, format, commit**

```bash
yarn eslint admin/handler.mjs src/test/admin.test.js && yarn prettier --write admin/handler.mjs src/test/admin.test.js
git add admin/handler.mjs src/test/admin.test.js
git commit -m "Answer the stories, shorts and media endpoints from the dashboard handler

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Runtime content, dates, and the two routes

**Files:**
- Create: `src/lib/runtimeContent.js`, `src/lib/dates.js`
- Modify: `src/routes.js`, `src/entry-prerender.jsx`, `src/main.jsx`
- Test: `src/test/runtimeContent.test.js`, `src/test/routes.test.js`

**Interfaces:**
- Produces:
  - `src/lib/runtimeContent.js`: `setRuntimeContent(next)`, `getRuntimeContent(): { stories, shorts }`, `RUNTIME_SCRIPT_ID = 'apc-runtime'`, `readRuntimeContent(doc = document): object | null`
  - `src/lib/dates.js`: `formatShortDate('2026-10-02') → '2 Oct'`, `formatLongDate('2026-10-02') → '2 October 2026'`, `formatDuration(95) → '1:35'`; invalid input → `''`
  - `src/routes.js`: entries for `/stories` (`StoriesPage`) and `/stories/:slug` (`StoryPage`, `dynamic: true`); `matchRoute()` matches `:param` segments; `PRERENDER_ROUTES` excludes `dynamic` routes
  - `src/entry-prerender.jsx` re-exports `setRuntimeContent`
- The pages `src/pages/StoriesPage.jsx` and `src/pages/StoryPage.jsx` are created in Task 7. Until then `yarn build` fails on the missing modules, so Tasks 5, 6 and 7 are committed one after another without a build in between; `yarn test` is the gate for each.

- [ ] **Step 1: Write the failing tests**

```js
// src/test/runtimeContent.test.js
// Contract: the published content the server feeds the page is held in one
// module both sides read, and the browser recovers it from the inline JSON
// block so the first client render matches the server's. Dates print the
// same on every machine, with no locale involved.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getRuntimeContent,
  readRuntimeContent,
  setRuntimeContent,
  RUNTIME_SCRIPT_ID,
} from '../lib/runtimeContent.js'
import { formatDuration, formatLongDate, formatShortDate } from '../lib/dates.js'

beforeEach(() => setRuntimeContent(null))

describe('runtimeContent', () => {
  it('starts empty and holds what it is given', () => {
    expect(getRuntimeContent()).toEqual({ stories: [], shorts: [] })
    setRuntimeContent({ stories: [{ slug: 'a' }] })
    expect(getRuntimeContent()).toEqual({ stories: [{ slug: 'a' }], shorts: [] })
    setRuntimeContent(undefined)
    expect(getRuntimeContent()).toEqual({ stories: [], shorts: [] })
  })

  it('reads the inline JSON block and shrugs at a missing or broken one', () => {
    expect(readRuntimeContent(document)).toBeNull()
    const script = document.createElement('script')
    script.id = RUNTIME_SCRIPT_ID
    script.type = 'application/json'
    script.textContent = '{"stories":[{"slug":"x","title":"\\u003cb\\u003e"}],"shorts":[]}'
    document.head.append(script)
    expect(readRuntimeContent(document).stories[0].title).toBe('<b>')
    script.textContent = '{nope'
    expect(readRuntimeContent(document)).toBeNull()
    script.remove()
  })
})

describe('dates', () => {
  it('formats without a locale', () => {
    expect(formatShortDate('2026-10-02')).toBe('2 Oct')
    expect(formatLongDate('2026-10-02')).toBe('2 October 2026')
    expect(formatShortDate('2026-01-31')).toBe('31 Jan')
    expect(formatShortDate('')).toBe('')
    expect(formatLongDate('yesterday')).toBe('')
    expect(formatDuration(95)).toBe('1:35')
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(3725)).toBe('62:05')
    expect(formatDuration('x')).toBe('')
  })
})
```

Then in `src/test/routes.test.js`, replace the `'every route gets a static document'` test and add one:

```js
  it('every route but a dynamic one gets a static document', () => {
    const prerendered = ROUTES.filter((r) => !r.dynamic)
    expect(PRERENDER_ROUTES).toHaveLength(prerendered.length)
    expect(PRERENDER_ROUTES.length).toBeLessThan(ROUTES.length)
    for (const route of PRERENDER_ROUTES) {
      expect(route.out, `${route.path}: out`).toMatch(/^\//)
      expect(route.dynamic).toBeFalsy()
    }
  })

  it('the story page is dynamic: matched by pattern, never prerendered', () => {
    const story = ROUTES.find((r) => r.path === '/stories/:slug')
    expect(story.dynamic).toBe(true)
    expect(story.module).toBe('src/pages/StoryPage.jsx')
    expect(matchRoute('/stories/big-night').path).toBe('/stories/:slug')
    expect(matchRoute('/stories/big-night/').path).toBe('/stories/:slug')
    expect(matchRoute('/stories').path).toBe('/stories')
    expect(matchRoute('/stories/').path).toBe('/stories')
    expect(matchRoute('/stories/a/b').path).toBe('*')
    expect(routeModules('/stories/big-night')).toEqual(['src/pages/StoryPage.jsx'])
  })
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `yarn vitest run src/test/runtimeContent.test.js src/test/routes.test.js`
Expected: FAIL on the missing modules and the missing route.

- [ ] **Step 3: Write the two libraries**

```js
// src/lib/runtimeContent.js
// The content the dashboard publishes (stories, shorts), as the site reads it.
//
// It is not in the bundle: server/render.mjs sets it before rendering a page
// and writes the same JSON into the document as an inline block; main.jsx
// reads that block and sets it again before hydrating, so React's first
// client render matches the server's markup. At build time (the prerender)
// and under `yarn dev` without the block it stays empty, and the home page
// sections show their demo items from the content files instead.

export const RUNTIME_SCRIPT_ID = 'apc-runtime'

const EMPTY = Object.freeze({ stories: Object.freeze([]), shorts: Object.freeze([]) })
let content = EMPTY

/** @param {{ stories?: object[], shorts?: object[] } | null | undefined} next */
export function setRuntimeContent(next) {
  content = next ? { stories: next.stories ?? [], shorts: next.shorts ?? [] } : EMPTY
}

/** @returns {{ stories: object[], shorts: object[] }} */
export function getRuntimeContent() {
  return content
}

/** The inline JSON block the server wrote, parsed, or null when absent or broken. */
export function readRuntimeContent(doc = typeof document === 'undefined' ? null : document) {
  const el = doc?.getElementById(RUNTIME_SCRIPT_ID)
  if (!el) return null
  try {
    return JSON.parse(el.textContent)
  } catch {
    return null
  }
}
```

```js
// src/lib/dates.js
// Date and duration labels for published content. Hand-rolled on purpose:
// the server renders these and the browser re-renders them during hydration,
// and toLocaleDateString can disagree between the two ("Oct" vs "Oct."),
// which React treats as a mismatch and answers by throwing the markup away.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return null
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return { year: m[1], month: MONTHS[month - 1], day: Number(m[3]) }
}

/** '2026-10-02' → '2 Oct' */
export function formatShortDate(iso) {
  const p = parts(iso)
  return p ? `${p.day} ${p.month.slice(0, 3)}` : ''
}

/** '2026-10-02' → '2 October 2026' */
export function formatLongDate(iso) {
  const p = parts(iso)
  return p ? `${p.day} ${p.month} ${p.year}` : ''
}

/** 95 → '1:35' */
export function formatDuration(seconds) {
  const total = Math.round(Number(seconds))
  if (!Number.isFinite(total) || total < 0) return ''
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
```

- [ ] **Step 4: Add the routes and pattern matching**

In `src/routes.js`, after the `tourPages.map(...)` spread and before the `/players` entry:

```js
  // Stories by Us: the articles the dashboard publishes. The index has a
  // static document (with the demo cards at build time); each story is
  // `dynamic`: never prerendered, matched by pattern, and rendered at request
  // time by server/render.mjs from the data store. See lib/runtimeContent.js.
  {
    path: '/stories',
    load: () => import('./pages/StoriesPage.jsx'),
    module: 'src/pages/StoriesPage.jsx',
  },
  {
    path: '/stories/:slug',
    load: () => import('./pages/StoryPage.jsx'),
    module: 'src/pages/StoryPage.jsx',
    dynamic: true,
  },
```

Replace `PRERENDER_ROUTES` and `matchRoute`:

```js
/** Concrete paths that get a static HTML document at build time. */
export const PRERENDER_ROUTES = ROUTES.filter((route) => !route.dynamic).map((route) => ({
  ...route,
  out: route.prerenderAs || route.path,
}))

/** True when `pattern` ("/stories/:slug" or a literal path) matches `path`. */
function matches(pattern, path) {
  if (pattern === path) return true
  if (!pattern.includes(':')) return false
  const want = pattern.split('/')
  const have = path.split('/')
  return (
    want.length === have.length &&
    want.every((segment, i) => (segment.startsWith(':') ? have[i].length > 0 : segment === have[i]))
  )
}

/** The ROUTES entry that owns `pathname`, falling back to the catch-all. */
export function matchRoute(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
  return (
    ROUTES.find((route) => route.path !== '*' && matches(route.path, path)) ??
    ROUTES.find((route) => route.path === '*')
  )
}
```

- [ ] **Step 5: Export from the prerender entry and read in the browser**

In `src/entry-prerender.jsx`, after the `PRERENDER_ROUTES, routeModules` re-export:

```jsx
// server/render.mjs sets the published content before each render.
export { setRuntimeContent } from './lib/runtimeContent.js'
```

In `src/main.jsx`, add the import and the read before `const container`:

```jsx
import { readRuntimeContent, setRuntimeContent } from './lib/runtimeContent.js'
```

```jsx
// Published stories and shorts, written into the document by server/render.mjs.
// Set before the first render so hydration sees what the server saw.
const runtime = readRuntimeContent()
if (runtime) setRuntimeContent(runtime)
```

- [ ] **Step 6: Run the tests**

Run: `yarn vitest run src/test/runtimeContent.test.js src/test/routes.test.js`
Expected: PASS. (`routes.test.js` imports `routes.js`, whose `load` functions are not called, so the missing pages do not fail it.)

- [ ] **Step 7: Lint, format, commit**

```bash
yarn eslint src/lib/runtimeContent.js src/lib/dates.js src/routes.js src/entry-prerender.jsx src/main.jsx src/test/runtimeContent.test.js src/test/routes.test.js && yarn prettier --write src/lib/runtimeContent.js src/lib/dates.js src/routes.js src/entry-prerender.jsx src/main.jsx src/test/runtimeContent.test.js src/test/routes.test.js
git add src/lib/runtimeContent.js src/lib/dates.js src/routes.js src/entry-prerender.jsx src/main.jsx src/test/runtimeContent.test.js src/test/routes.test.js
git commit -m "Hold published content in a runtime module and route the story pages

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Stories and Shorts on the home page

**Files:**
- Modify: `src/content/stories.js`, `src/content/shorts.js`, `src/components/Stories.jsx`, `src/components/Stories.css`, `src/components/Shorts.jsx`, `src/components/Shorts.css`
- Create: `src/components/ShortPlayer.jsx`, `src/components/ShortPlayer.css`
- Test: `src/test/home.test.jsx`

**Interfaces:**
- Consumes: `getRuntimeContent`, `formatShortDate`, `formatDuration` (Task 5); PublicStory and PublicShort shapes (Task 2).
- Produces:
  - `stories` content: `{ heading, allLink, homeLimit, path, index: { title, description, intro, empty }, page: { eyebrow, more, back }, demo: Story[] }`
  - `shorts` content: `{ heading, homeLimit, play, close, demo: Short[] }`
  - `export function StoryCard({ story })` from `Stories.jsx` (renders an `<li>`); a story with `href` is a link card, one without is the demo card
  - `ShortPlayer({ short, onClose })`

- [ ] **Step 1: Update the home test contract**

In `src/test/home.test.jsx`, replace the stories part of `'news lists carry a title, a date and a link'` and the whole `'shorts have a duration, title and poster, and no link'` test with:

```jsx
    // Demo stories are teasers with no page behind them: title, date and artwork, no link.
    expect(stories.demo.length).toBeGreaterThan(0)
    for (const item of stories.demo) {
      expect(item.title && item.date && item.imageSrc, item.title).toBeTruthy()
      expect(item.href, item.title).toBeUndefined()
      expect(existsSync(join('public', item.imageSrc)), item.imageSrc).toBe(true)
    }
  })

  it('demo shorts have a duration, title and poster, and no video', () => {
    expect(shorts.demo.length).toBeGreaterThan(0)
    for (const item of shorts.demo) {
      expect(item.duration && item.title && item.posterSrc, item.title).toBeTruthy()
      expect(item.video, item.title).toBeUndefined()
      expect(existsSync(join('public', item.posterSrc)), item.posterSrc).toBe(true)
    }
  })
```

Add imports at the top of the file:

```jsx
import { fireEvent } from '@testing-library/react'
import Stories from '../components/Stories.jsx'
import Shorts from '../components/Shorts.jsx'
import { setRuntimeContent } from '../lib/runtimeContent.js'
```

And a new describe block at the end:

```jsx
describe('Stories and Shorts — published content replaces the demo cards', () => {
  afterEach(() => setRuntimeContent(null))

  const story = (n) => ({
    slug: `story-${n}`,
    href: `/stories/story-${n}`,
    title: `Story ${n}`,
    date: '2026-10-02',
    standfirst: '',
    heroImage: `/media/h${n}.webp`,
    heroThumb: `/media/t${n}.webp`,
    heroAlt: `Story ${n}`,
    body: '<p>x</p>',
    publishedAt: '2026-10-02T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  })
  const short = (n) => ({
    slug: `clip-${n}`,
    title: `Clip ${n}`,
    video: `/media/v${n}.mp4`,
    poster: `/media/p${n}.webp`,
    duration: 65,
    publishedAt: '2026-10-02T00:00:00.000Z',
  })

  it('shows the demo cards while nothing is published', () => {
    withRouter(<Stories />)
    expect(screen.getByText(stories.demo[0].title)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
    withRouter(<Shorts />)
    expect(screen.getByText(shorts.demo[0].title)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders published stories as links, newest eight, with a link to them all', () => {
    setRuntimeContent({ stories: Array.from({ length: 10 }, (_, i) => story(i + 1)) })
    withRouter(<Stories />)
    const links = screen.getAllByRole('link')
    const cards = links.filter((a) => a.getAttribute('href').startsWith('/stories/'))
    expect(cards).toHaveLength(stories.homeLimit)
    expect(cards[0]).toHaveAttribute('href', '/stories/story-1')
    expect(within(cards[0]).getByText('2 Oct')).toBeInTheDocument()
    // alt="" gives the picture no img role, so query the element itself.
    expect(cards[0].querySelector('img')).toHaveAttribute('src', '/media/t1.webp')
    expect(screen.getByRole('link', { name: stories.allLink })).toHaveAttribute('href', stories.path)
    expect(screen.queryByText(stories.demo[0].title)).toBeNull()
  })

  it('renders published shorts as buttons that open and close the player', () => {
    setRuntimeContent({ shorts: [short(1), short(2)] })
    withRouter(<Shorts />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(within(buttons[0]).getByText('1:05')).toBeInTheDocument()
    expect(screen.queryByLabelText(shorts.close)).toBeNull()

    fireEvent.click(buttons[0])
    const video = document.querySelector('video')
    expect(video).toHaveAttribute('src', '/media/v1.mp4')
    expect(video).toHaveAttribute('poster', '/media/p1.webp')
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(screen.getByLabelText(shorts.close))
    expect(document.querySelector('video')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(buttons[0])

    // Escape closes the dialog natively, which fires `close` on it.
    fireEvent.click(buttons[1])
    fireEvent(document.querySelector('dialog'), new Event('close'))
    expect(document.querySelector('video')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the home tests to see them fail**

Run: `yarn vitest run src/test/home.test.jsx`
Expected: FAIL (`stories.demo` undefined, Stories has no links, Shorts has no buttons).

- [ ] **Step 3: Rewrite the content files**

`src/content/stories.js`:

```js
// Stories by Us: in-house articles. The real ones are written in the
// dashboard (/admin → Publish → Stories) and reach the site through
// lib/runtimeContent.js; this file holds the section's strings and the demo
// cards shown while nothing has been published yet.
//
// Demo images are generated artwork under public/images/stories/, 540x300 WebP,
// named after the story's slug.

/**
 * @typedef {object} Story  a demo card
 * @property {string} date
 * @property {string} title
 * @property {string} [imageSrc]
 */

export const stories = {
  heading: 'Stories by Us',
  allLink: 'All stories',
  /** How many published stories the home page shows. */
  homeLimit: 8,
  path: '/stories',
  index: {
    title: 'Stories by Us',
    description:
      'Features, hands and reads from the Australian poker scene, written by the Australian Poker Calendar team.',
    intro: 'Features, hands and reads from the Australian poker scene, written by us.',
    empty: 'The first story is on its way.',
  },
  page: {
    eyebrow: 'Stories by Us',
    more: 'More stories',
    back: 'All stories',
  },
  /** @type {Story[]} */
  demo: [
    // ... the eight existing items, unchanged ...
  ],
}
```

Keep the eight existing items exactly as they are, under `demo` instead of `items`.

`src/content/shorts.js`:

```js
// Shorts: vertical video cards in a horizontal scroll row. The real ones are
// uploaded in the dashboard (/admin → Publish → Shorts) and reach the site
// through lib/runtimeContent.js; a published short plays in an overlay. This
// file holds the section's strings and the demo cards shown until then.
//
// Demo posters are generated artwork under public/images/shorts/, 360x640 WebP
// (2x the 180x320 card), named after the short's slug.

/**
 * @typedef {object} Short  a demo card
 * @property {string} duration  "m:ss"
 * @property {string} title
 * @property {string} [posterSrc]
 */

export const shorts = {
  heading: 'Shorts',
  homeLimit: 8,
  play: 'Play',
  close: 'Close video',
  /** @type {Short[]} */
  demo: [
    // ... the eight existing items, unchanged ...
  ],
}
```

- [ ] **Step 4: Rewrite the two section components and add the player**

`src/components/Stories.jsx`:

```jsx
import { Link } from 'react-router-dom'
import { stories } from '../content/stories.js'
import { getRuntimeContent } from '../lib/runtimeContent.js'
import { formatShortDate } from '../lib/dates.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import './Stories.css'

/**
 * One card. A published story (it has an `href`) links to its page; a demo
 * card from the content file has no page and stays an article.
 *
 * @param {{ story: object }} props
 */
export function StoryCard({ story }) {
  if (!story.href) {
    return (
      <li>
        <article className="story-card">
          <ImagePlaceholder
            label="story image"
            className="story-card__image"
            src={story.imageSrc}
            width={540}
            height={300}
          />
          <div className="story-card__body">
            <div className="story-card__date">{story.date}</div>
            <h3 className="story-card__title">{story.title}</h3>
          </div>
        </article>
      </li>
    )
  }
  return (
    <li>
      <Link to={story.href} className="story-card story-card--link">
        {/* The title beside it names the story; the picture is decoration here. */}
        <ImagePlaceholder
          className="story-card__image"
          src={story.heroThumb || story.heroImage}
          alt=""
          width={800}
          height={450}
        />
        <div className="story-card__body">
          <div className="story-card__date">{formatShortDate(story.date)}</div>
          <h3 className="story-card__title">{story.title}</h3>
        </div>
      </Link>
    </li>
  )
}

/** Stories: published articles when there are any, the demo cards until then. */
export default function Stories() {
  const published = getRuntimeContent().stories
  const live = published.length > 0
  const items = live ? published.slice(0, stories.homeLimit) : stories.demo
  return (
    <section aria-labelledby="stories-heading">
      <div className="stories__head">
        <SectionHeading id="stories-heading">{stories.heading}</SectionHeading>
        {live && (
          <Link to={stories.path} className="stories__all">
            {stories.allLink}
          </Link>
        )}
      </div>
      <ul className="stories__grid">
        {items.map((story) => (
          <StoryCard key={story.slug || story.title} story={story} />
        ))}
      </ul>
    </section>
  )
}
```

Append to `src/components/Stories.css`:

```css
.stories__head {
  display: flex;
  align-items: baseline;
  gap: 20px;
}

.stories__head .section-heading {
  flex: 1;
}

.stories__all {
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
  text-decoration: none;
  white-space: nowrap;
}

.stories__all:hover {
  color: var(--color-champagne);
  text-decoration: underline;
}

.story-card--link {
  text-decoration: none;
  transition: border-color var(--transition-fast);
}

.story-card--link:hover,
.story-card--link:focus-visible {
  border-color: var(--color-control-border);
}

.story-card__image {
  display: block;
  width: 100%;
}
```

(`.story-card__image { height: 150px }` already exists; keep it.)

`src/components/Shorts.jsx`:

```jsx
import { useState } from 'react'
import { Play } from 'lucide-react'
import { shorts } from '../content/shorts.js'
import { getRuntimeContent } from '../lib/runtimeContent.js'
import { formatDuration } from '../lib/dates.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import ShortPlayer from './ShortPlayer.jsx'
import './Shorts.css'

/** The face of a card: poster, duration badge, play ring and caption. */
function ShortFace({ poster, duration, title }) {
  return (
    <>
      <ImagePlaceholder className="short-card__poster" src={poster} width={180} height={320} />
      <span className="short-card__duration">{duration}</span>
      <span className="short-card__play" aria-hidden="true">
        <Play size={14} strokeWidth={1.5} fill="currentColor" />
      </span>
      <span className="short-card__caption">{title}</span>
    </>
  )
}

/** Shorts: published videos as buttons that open the player; demo cards until then. */
export default function Shorts() {
  const published = getRuntimeContent().shorts
  const items = published.length > 0 ? published.slice(0, shorts.homeLimit) : shorts.demo
  const [open, setOpen] = useState(null) // { short, opener: HTMLElement }

  function close() {
    const opener = open?.opener
    setOpen(null)
    opener?.focus()
  }

  return (
    <section aria-labelledby="shorts-heading">
      <SectionHeading id="shorts-heading">{shorts.heading}</SectionHeading>
      <div className="shorts__row scroll-row">
        {items.map((short) =>
          short.video ? (
            <button
              key={short.slug}
              type="button"
              className="short-card short-card--button"
              onClick={(e) => setOpen({ short, opener: e.currentTarget })}
            >
              <ShortFace
                poster={short.poster}
                duration={formatDuration(short.duration)}
                title={short.title}
              />
            </button>
          ) : (
            // No video behind a demo card, so it is an article, not a control.
            <article key={short.title} className="short-card">
              <ShortFace poster={short.posterSrc} duration={short.duration} title={short.title} />
            </article>
          ),
        )}
      </div>
      {open && <ShortPlayer short={open.short} onClose={close} />}
    </section>
  )
}
```

Append to `src/components/Shorts.css`:

```css
.short-card--button {
  padding: 0;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.short-card--button:hover .short-card__play,
.short-card--button:focus-visible .short-card__play {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

`src/components/ShortPlayer.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { shorts } from '../content/shorts.js'
import './ShortPlayer.css'

/**
 * The overlay a published short plays in: a modal <dialog> with the video,
 * its title and a close button. Escape and a click on the backdrop close it
 * (the browser fires `close` on the dialog for both); the body does not
 * scroll while it is open. Mounted only while open, so nothing of it is in
 * the static HTML.
 *
 * @param {{ short: { video: string, poster: string, title: string }, onClose: () => void }} props
 */
export default function ShortPlayer({ short, onClose }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    // jsdom has no showModal; the attribute keeps the markup honest there.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    const onDialogClose = () => closeRef.current()
    // The backdrop is part of the dialog element; a click on the frame is not.
    const onClick = (e) => {
      if (e.target !== dialog) return
      if (typeof dialog.close === 'function') dialog.close() // fires `close`
      else closeRef.current()
    }
    dialog.addEventListener('close', onDialogClose)
    dialog.addEventListener('click', onClick)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.removeEventListener('close', onDialogClose)
      dialog.removeEventListener('click', onClick)
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <dialog ref={ref} className="short-player" aria-label={short.title}>
      <div className="short-player__frame">
        {/* Captions are not part of the upload; the title below stands in. */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          className="short-player__video"
          src={short.video}
          poster={short.poster}
          controls
          autoPlay
          playsInline
        />
        <p className="short-player__title">{short.title}</p>
        <button type="button" className="short-player__close" onClick={onClose} aria-label={shorts.close}>
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </dialog>
  )
}
```

`src/components/ShortPlayer.css`:

```css
.short-player {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text);
  max-width: 100vw;
  max-height: 100vh;
}

.short-player::backdrop {
  background: var(--color-overlay);
}

.short-player__frame {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(100vw, calc(90vh * 9 / 16));
  padding: 16px;
}

.short-player__video {
  display: block;
  width: 100%;
  aspect-ratio: 9 / 16;
  border-radius: var(--radius-xl);
  background: var(--color-bg-footer);
  object-fit: contain;
}

.short-player__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
}

.short-player__close {
  position: absolute;
  top: -4px;
  right: -4px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg-card);
  color: var(--color-text);
  cursor: pointer;
}

.short-player__close:hover,
.short-player__close:focus-visible {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

- [ ] **Step 5: Run the tests**

Run: `yarn vitest run src/test/home.test.jsx src/test/a11y.test.jsx src/test/components.test.jsx`
Expected: PASS. If `a11y.test.jsx` flags the demo cards, nothing in them changed; investigate before touching markup.

- [ ] **Step 6: Lint, format, commit**

```bash
yarn eslint src/content/stories.js src/content/shorts.js src/components/Stories.jsx src/components/Shorts.jsx src/components/ShortPlayer.jsx src/test/home.test.jsx && yarn prettier --write src/content/stories.js src/content/shorts.js src/components/Stories.jsx src/components/Stories.css src/components/Shorts.jsx src/components/Shorts.css src/components/ShortPlayer.jsx src/components/ShortPlayer.css src/test/home.test.jsx
git add src/content/stories.js src/content/shorts.js src/components/Stories.jsx src/components/Stories.css src/components/Shorts.jsx src/components/Shorts.css src/components/ShortPlayer.jsx src/components/ShortPlayer.css src/test/home.test.jsx
git commit -m "Show published stories and shorts on the home page, with a player overlay

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: The story page and the stories index

**Files:**
- Create: `src/pages/StoryPage.jsx`, `src/pages/StoryPage.css`, `src/pages/StoriesPage.jsx`, `src/pages/StoriesPage.css`
- Modify: `src/lib/seo.jsx` (a `type` prop), `src/lib/structuredData.js` (`articleLd`)
- Test: `src/test/storyPage.test.jsx`

**Interfaces:**
- Consumes: `StoryCard` (Task 6), `stories` content (Task 6), `getRuntimeContent`, `formatLongDate` (Task 5).
- Produces: `articleLd(story)` (schema.org `NewsArticle`); `SEO` accepts `type` (default `'website'`) for `og:type`; `StoryPage` renders `NotFoundPage` for an unknown slug.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/test/storyPage.test.jsx
// Contract: a published story renders as a full article page (hero, date,
// title, standfirst, sanitised body, more stories) with NewsArticle data;
// an unknown slug is the 404 page; the index lists every published story.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import StoryPage from '../pages/StoryPage.jsx'
import StoriesPage from '../pages/StoriesPage.jsx'
import { setRuntimeContent } from '../lib/runtimeContent.js'
import { articleLd } from '../lib/structuredData.js'
import { stories } from '../content/stories.js'
import { site } from '../config/site.config.js'

expect.extend(toHaveNoViolations)
afterEach(() => setRuntimeContent(null))

const story = (n, extra = {}) => ({
  slug: `story-${n}`,
  href: `/stories/story-${n}`,
  title: `Story ${n}`,
  date: '2026-10-02',
  standfirst: `Standfirst ${n}.`,
  heroImage: `/media/h${n}.webp`,
  heroThumb: `/media/t${n}.webp`,
  heroAlt: `Hero ${n}`,
  body: `<h2>Section</h2><p>Body ${n}</p>`,
  publishedAt: '2026-10-02T01:00:00.000Z',
  updatedAt: '2026-10-03T01:00:00.000Z',
  ...extra,
})

const renderAt = (path) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/stories/:slug" element={<StoryPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('StoryPage', () => {
  it('renders the article and three more stories', async () => {
    setRuntimeContent({ stories: [1, 2, 3, 4, 5].map(story) })
    const { container } = renderAt('/stories/story-2')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Story 2')
    expect(screen.getByText('2 October 2026')).toBeInTheDocument()
    expect(screen.getByText('Standfirst 2.')).toBeInTheDocument()
    expect(screen.getByAltText('Hero 2')).toHaveAttribute('src', '/media/h2.webp')
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeInTheDocument()
    expect(screen.getByText('Body 2')).toBeInTheDocument()
    const more = screen.getByRole('region', { name: stories.page.more })
    const links = within(more).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/stories/story-1',
      '/stories/story-3',
      '/stories/story-4',
    ])
    expect(screen.getByRole('link', { name: new RegExp(stories.page.back) })).toHaveAttribute(
      'href',
      stories.path,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the 404 page for an unknown or unpublished slug', () => {
    setRuntimeContent({ stories: [story(1)] })
    renderAt('/stories/nope')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found')
    expect(document.querySelector('.story')).toBeNull()
  })

  it('describes the article as NewsArticle', () => {
    const ld = articleLd(story(7))
    expect(ld).toMatchObject({
      '@type': 'NewsArticle',
      headline: 'Story 7',
      description: 'Standfirst 7.',
      datePublished: '2026-10-02',
      dateModified: '2026-10-03',
      image: [`${site.seo.siteUrl}/media/h7.webp`],
      mainEntityOfPage: `${site.seo.siteUrl}/stories/story-7`,
      publisher: { '@type': 'Organization', name: site.brand.name },
    })
    expect(articleLd(story(8, { standfirst: '', heroImage: '' }))).not.toHaveProperty('image')
  })
})

describe('StoriesPage', () => {
  it('lists every published story, or says the first is on its way', async () => {
    setRuntimeContent({ stories: [1, 2, 3].map(story) })
    const { container, unmount } = renderAt('/stories')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(stories.index.title)
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href').startsWith('/stories/'))).toHaveLength(3)
    expect(await axe(container)).toHaveNoViolations()
    unmount()
    setRuntimeContent(null)
    renderAt('/stories')
    expect(screen.getByText(stories.index.empty)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `yarn vitest run src/test/storyPage.test.jsx`
Expected: FAIL on the missing page modules.

- [ ] **Step 3: Extend SEO and structured data**

In `src/lib/seo.jsx`, add `type = 'website'` to the destructured props and change the og:type line to:

```jsx
      <meta property="og:type" content={type} />
```

Document it in the comment above the component: "`type` is the og:type: 'website' by default, 'article' for a story."

Append to `src/lib/structuredData.js`:

```js
/**
 * A published story as a schema.org NewsArticle: the fields Google's article
 * rich result reads. Takes the public story shape from server/content.mjs.
 *
 * @param {{ title: string, href: string, date: string, standfirst?: string, heroImage?: string, updatedAt?: string }} story
 */
export function articleLd(story) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.title,
    datePublished: story.date,
    dateModified: (story.updatedAt || '').slice(0, 10) || story.date,
    mainEntityOfPage: absolute(story.href),
    url: absolute(story.href),
    inLanguage: 'en-AU',
    author: { '@type': 'Organization', name: site.brand.name, url: site.seo.siteUrl },
    publisher: {
      '@type': 'Organization',
      name: site.brand.name,
      ...(site.brand.logoSrc && {
        logo: { '@type': 'ImageObject', url: absolute(site.brand.logoSrc) },
      }),
    },
  }
  if (story.standfirst) schema.description = story.standfirst
  if (story.heroImage) schema.image = [absolute(story.heroImage)]
  return schema
}
```

- [ ] **Step 4: Write the two pages**

`src/pages/StoryPage.jsx`:

```jsx
import { Link, useParams } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import { articleLd, breadcrumbLd } from '../lib/structuredData.js'
import { getRuntimeContent } from '../lib/runtimeContent.js'
import { formatLongDate } from '../lib/dates.js'
import { stories } from '../content/stories.js'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import Img from '../components/Img.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { StoryCard } from '../components/Stories.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import './StoryPage.css'

/**
 * /stories/<slug>: one published story. Rendered at request time by
 * server/render.mjs from lib/runtimeContent.js, never at build time; an
 * unknown slug is the 404 page (the server never renders one, so this branch
 * is for client-side navigation).
 */
export default function StoryPage() {
  const { slug } = useParams()
  const published = getRuntimeContent().stories
  const story = published.find((s) => s.slug === slug)
  if (!story) return <NotFoundPage />

  const more = published.filter((s) => s.slug !== slug).slice(0, 3)
  const trail = [
    { name: 'Home', path: '/' },
    { name: stories.heading, path: stories.path },
    { name: story.title, path: story.href },
  ]

  return (
    <main className="story-page">
      <SEO
        title={story.title}
        description={story.standfirst || undefined}
        image={story.heroImage}
        path={story.href}
        type="article"
        jsonLd={[breadcrumbLd(trail), articleLd(story)]}
      />
      <article className="story container">
        <Breadcrumbs items={trail} />
        <header className="story__head">
          <span className="section-eyebrow">{stories.page.eyebrow}</span>
          <h1 className="story__title">{story.title}</h1>
          <time className="story__date" dateTime={story.date}>
            {formatLongDate(story.date)}
          </time>
          {story.standfirst && <p className="story__standfirst">{story.standfirst}</p>}
        </header>
        <Img
          src={story.heroImage}
          alt={story.heroAlt}
          width={1600}
          height={900}
          priority
          className="story__hero"
        />
        {/* The body is TinyMCE output, rebuilt from an allowlist by server/sanitize.mjs on every save. */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: story.body }} />
        <p className="story__back">
          <Link to={stories.path}>← {stories.page.back}</Link>
        </p>
      </article>
      {more.length > 0 && (
        <section className="container story-more" aria-labelledby="story-more">
          <SectionHeading id="story-more">{stories.page.more}</SectionHeading>
          <ul className="stories__grid">
            {more.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
```

`src/pages/StoryPage.css`:

```css
/* One story: a reading column with the hero above the body, then the
 * "More stories" cards in the home page's grid. .prose styles everything
 * server/sanitize.mjs lets through. */

.story-page {
  display: flex;
  flex-direction: column;
  gap: 56px;
  padding: 40px 0 64px;
}

.story {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 820px;
}

.story__head {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.story__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 60px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.08;
  color: var(--color-text);
  text-wrap: balance;
}

.story__date {
  font-size: 14px;
  color: var(--color-muted);
}

.story__standfirst {
  margin: 0;
  font-size: 20px;
  line-height: 1.6;
  color: var(--color-muted);
  text-wrap: pretty;
}

.story__hero {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
}

.story__back {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.story__back a {
  color: var(--color-accent);
  text-decoration: none;
}

.story__back a:hover {
  color: var(--color-champagne);
  text-decoration: underline;
}

.prose {
  font-size: 18px;
  line-height: 1.75;
  color: var(--color-text);
}

.prose > * + * {
  margin-top: 1.2em;
}

.prose h2,
.prose h3,
.prose h4 {
  margin: 1.8em 0 0.6em;
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.prose h2 {
  font-size: 30px;
}

.prose h3 {
  font-size: 24px;
}

.prose h4 {
  font-size: 20px;
}

.prose p,
.prose li {
  text-wrap: pretty;
}

.prose a {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.prose a:hover {
  color: var(--color-champagne);
}

.prose ul,
.prose ol {
  padding-left: 1.4em;
}

.prose li + li {
  margin-top: 0.4em;
}

.prose blockquote {
  margin: 1.6em 0;
  padding: 4px 0 4px 20px;
  border-left: 3px solid var(--color-accent);
  color: var(--color-muted);
  font-size: 20px;
}

.prose img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.prose figure {
  margin: 1.6em 0;
}

.prose figcaption {
  margin-top: 8px;
  font-size: 14px;
  color: var(--color-muted);
}

.prose hr {
  border: 0;
  border-top: 1px solid var(--color-border);
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  font-size: 16px;
}

.prose th,
.prose td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: top;
}

.prose th {
  color: var(--color-accent);
  font-weight: 600;
}

.prose pre {
  overflow-x: auto;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  font-size: 15px;
}

.prose code {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.prose p code {
  padding: 1px 5px;
  border-radius: var(--radius-xs);
  background: var(--color-bg-raised);
}

.story-more .stories__grid {
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
}

@media (max-width: 767px) {
  .story-page {
    padding-top: 24px;
    gap: 40px;
  }

  .prose {
    font-size: 17px;
  }

  .story__standfirst {
    font-size: 18px;
  }
}
```

`src/pages/StoriesPage.jsx`:

```jsx
import SEO from '../lib/seo.jsx'
import { breadcrumbLd } from '../lib/structuredData.js'
import { getRuntimeContent } from '../lib/runtimeContent.js'
import { stories } from '../content/stories.js'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { StoryCard } from '../components/Stories.jsx'
import './StoriesPage.css'

/** /stories: every published story, newest first. */
export default function StoriesPage() {
  const published = getRuntimeContent().stories
  const trail = [
    { name: 'Home', path: '/' },
    { name: stories.heading, path: stories.path },
  ]
  return (
    <main className="stories-page">
      <SEO
        title={stories.index.title}
        description={stories.index.description}
        path={stories.path}
        jsonLd={breadcrumbLd(trail)}
      />
      <header className="stories-page__head container">
        <Breadcrumbs items={trail} />
        <h1 className="stories-page__title">{stories.index.title}</h1>
        <p className="stories-page__intro">{stories.index.intro}</p>
      </header>
      <div className="container">
        {published.length > 0 ? (
          <ul className="stories__grid">
            {published.map((story) => (
              <StoryCard key={story.slug} story={story} />
            ))}
          </ul>
        ) : (
          <p className="stories-page__empty">{stories.index.empty}</p>
        )}
      </div>
    </main>
  )
}
```

`src/pages/StoriesPage.css`:

```css
.stories-page {
  display: flex;
  flex-direction: column;
  gap: 40px;
  padding: 40px 0 64px;
}

.stories-page__head {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stories-page__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(40px, 5.5vw, 72px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.08;
  color: var(--color-text);
}

.stories-page__intro {
  margin: 0;
  max-width: 720px;
  font-size: 18px;
  line-height: 1.7;
  color: var(--color-muted);
}

.stories-page__empty {
  margin: 0;
  padding: 32px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-xl);
  color: var(--color-muted);
  text-align: center;
}
```

- [ ] **Step 5: Run the tests, then the whole suite**

Run: `yarn vitest run src/test/storyPage.test.jsx` then `yarn test`
Expected: PASS. (`seo.test.jsx`, `structuredData.test.js` and `routes.test.js` all still pass.)

- [ ] **Step 6: Build**

Run: `yarn build`
Expected: the prerender lists `/stories` among its documents and does not list `/stories/:slug`; no warnings about missing modules. The `/stories` document renders the empty-state text.

- [ ] **Step 7: Lint, format, commit**

```bash
yarn lint && yarn prettier --write src/pages/StoryPage.jsx src/pages/StoryPage.css src/pages/StoriesPage.jsx src/pages/StoriesPage.css src/lib/seo.jsx src/lib/structuredData.js src/test/storyPage.test.jsx
git add src/pages/StoryPage.jsx src/pages/StoryPage.css src/pages/StoriesPage.jsx src/pages/StoriesPage.css src/lib/seo.jsx src/lib/structuredData.js src/test/storyPage.test.jsx
git commit -m "Add the story page and the stories index

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Shared document builder

**Files:**
- Create: `scripts/lib/document.mjs`
- Modify: `scripts/prerender.mjs`
- Test: `src/test/document.test.js`

**Interfaces:**
- Produces, from `scripts/lib/document.mjs`:
  - `createDocumentBuilder({ template, manifest, themeStyles })` → `{ assetsFor(moduleId), build(result, moduleId) }` where `result` is `{ html, head, complete }` from `render()`. The constructor throws if the template lacks the `seo:fallback` markers or the exact `<div id="root"></div>`.
  - `assertStudioCredit(html)`, `assertNoHiddenContent(html)` (throw on failure)
  - `withRuntimeContent(doc, content)` → the document with `<script id="apc-runtime" type="application/json">` before `</head>`, `<` escaped as `<`
  - `stripScripts(doc)` → the document without `<script type="module">` tags and `<link rel="modulepreload">` tags
- `scripts/prerender.mjs` keeps its behaviour exactly; `yarn build` output is byte-identical.

- [ ] **Step 1: Write the failing tests**

```js
// src/test/document.test.js
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
const CREDIT = '<a href="https://onraistudio.com/" target="_blank" rel="noopener noreferrer">Site by Onrai Studio</a>'
const result = (html, head = '<title>Story</title>') => ({ html: `${html}${CREDIT}`, head, complete: true })

describe('createDocumentBuilder', () => {
  const builder = createDocumentBuilder({ template: TEMPLATE, manifest: MANIFEST, themeStyles: ':root{--x:1}' })

  it('walks the manifest for a route\'s CSS and chunks, skipping what the template has', () => {
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
    expect(doc).toContain('<link rel="modulepreload" crossorigin href="/assets/StoryPage-111.js" />')
    expect(doc).toContain('<style id="theme-tokens">:root{--x:1}</style>')
    expect(doc).toContain(`<div id="root" data-prerender="full"><main>hi</main>${CREDIT}</div>`)
    const partial = builder.build({ ...result('<main>x</main>'), complete: false }, undefined)
    expect(partial).toContain('data-prerender="partial"')
  })

  it('keeps the fallback head when a page renders no head tags', () => {
    expect(builder.build(result('<p>x</p>', ''), undefined)).toContain('<title>Fallback</title>')
  })

  it('refuses a document without the credit or with hidden content', () => {
    expect(() => builder.build({ html: '<main>no credit</main>', head: '', complete: true })).toThrow(/studio credit/)
    expect(() => builder.build(result('<section style="opacity:0">x</section>'))).toThrow(/opacity 0/)
    expect(() => assertStudioCredit(`${CREDIT.replace('>Site by', ' rel="nofollow">Site by')}`)).toThrow(/nofollow/)
    expect(() => assertNoHiddenContent('<i aria-hidden="true" style="opacity:0"></i>')).not.toThrow()
  })

  it('refuses a template without the markers or the exact root placeholder', () => {
    expect(() => createDocumentBuilder({ template: '<html><head></head><body><div id="root"></div></body></html>', manifest: {}, themeStyles: '' })).toThrow(/seo:fallback/)
    expect(() => createDocumentBuilder({ template: TEMPLATE.replace('<div id="root"></div>', '<div id="root">x</div>'), manifest: {}, themeStyles: '' })).toThrow(/root/)
  })
})

describe('withRuntimeContent and stripScripts', () => {
  it('writes the content as an inert JSON block that cannot close itself', () => {
    const doc = withRuntimeContent(TEMPLATE, { stories: [{ title: '</script><b>' }], shorts: [] })
    const block = doc.match(/<script id="apc-runtime" type="application\/json">(.*)<\/script>\n {2}<\/head>/)
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
```

- [ ] **Step 2: Run the test to see it fail**

Run: `yarn vitest run src/test/document.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the builder**

```js
// scripts/lib/document.mjs
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
// invisible. src/lib/motion.js keeps entrances inert; this is the guard that
// stops a new one being added without anyone noticing. aria-hidden elements
// are exempt: a decorative layer is meant to be invisible.
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
  // so a document with anything inside #root would quietly ship with no page
  // body at all, looking like a successful build. That happened.
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(
      `index.html has no exact ${PLACEHOLDER} for the rendered body to replace. ` +
        'Empty it — the prerender is what puts real content (and the studio ' +
        'credit) in the page now, and anything left inside #root is markup the ' +
        'visitor sees before React wipes it.',
    )
  }

  // Assets index.html already references: the entry's stylesheet and its
  // modulepreloads. Anything matched here must not be emitted twice.
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

    // Swap the fallback block for this route's own tags, but only if there are
    // any: a page that renders no head keeps the site-level title rather than
    // shipping with none at all.
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
    // Design tokens as a real stylesheet, so the static document paints
    // correctly before the bundle has run.
    const injected = [...links, ...preloads, `    <style id="theme-tokens">${themeStyles}</style>`]
    doc = doc.replace(/[ \t]*<\/head>/, () => `${injected.join('\n')}\n  </head>`)

    // data-prerender tells src/main.jsx whether this markup is hydratable:
    // "full" when the whole tree rendered, anything else means a page module
    // was missing and React must not adopt the body.
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
    () => `    <script id="${RUNTIME_SCRIPT_ID}" type="application/json">${json}</script>\n  </head>`,
  )
}

/** The document as static HTML: no module script, no preloads. For the dashboard's preview. */
export function stripScripts(doc) {
  return doc
    .replace(/[ \t]*<script type="module"[^>]*><\/script>\n?/g, '')
    .replace(/[ \t]*<link rel="modulepreload"[^>]*>\n?/g, '')
}
```

- [ ] **Step 4: Run the test**

Run: `yarn vitest run src/test/document.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Make the prerender use it**

In `scripts/prerender.mjs`:

1. Add the import after the other imports:
   `import { createDocumentBuilder } from './lib/document.mjs'`
2. Delete these blocks (they now live in the builder): the `// --- Route assets` section with `assetsFor`, the `templateAssets` constant, the `FALLBACK` constant, `CREDIT_HREF`, `CREDIT_TEXT`, `assertStudioCredit`, `assertNoHiddenContent`, and the whole `buildDocument` function. Keep the og:image check, `prepare()`, `template`, the app-shell write, the loop, and the sitemap.
3. After `const template = await readFile(TEMPLATE, 'utf8')` add:

```js
// Document assembly is shared with server/render.mjs, which renders the live
// routes the same way at request time; see scripts/lib/document.mjs.
const builder = createDocumentBuilder({ template, manifest: viteManifest, themeStyles })
```

4. In the loop replace
   `const doc = buildDocument(result, assetsFor(routeModules(location)[0]))`
   with
   `const doc = builder.build(result, routeModules(location)[0])`

- [ ] **Step 6: Prove the build is unchanged**

```bash
git stash push scripts/prerender.mjs -q && yarn build >/dev/null 2>&1 && cp -r dist /tmp/apc-dist-before && git stash pop -q
yarn build && diff -rq /tmp/apc-dist-before dist && echo IDENTICAL
rm -rf /tmp/apc-dist-before
```

Expected: `IDENTICAL`. (Hashed asset names depend on content, not time, so the two builds match. If only `sitemap.xml` differs by `<lastmod>`, that is the git-dependent date and is fine.)

- [ ] **Step 7: Lint, format, commit**

```bash
yarn eslint scripts/lib/document.mjs scripts/prerender.mjs src/test/document.test.js && yarn prettier --write scripts/lib/document.mjs scripts/prerender.mjs src/test/document.test.js
git add scripts/lib/document.mjs scripts/prerender.mjs src/test/document.test.js
git commit -m "Extract the document builder so the server can render routes the prerender's way

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Live renderer

**Files:**
- Create: `server/render.mjs`
- Test: `src/test/render.test.js`

**Interfaces:**
- Consumes: `createDocumentBuilder`, `withRuntimeContent`, `stripScripts` (Task 8); `store.content.publicContent()`, `.version`, `.toPublicStory()` (Task 2); the SSR entry's `prepare`, `render`, `themeStyles`, `routeModules`, `setRuntimeContent` (Task 5).
- Produces: `createRenderer({ dist, entry, store, importEntry })` →
  - `ready: Promise<boolean>`; `error: string` (empty while fine)
  - `page(pathname): Promise<string | null>`: HTML for `/`, `/stories`, or `/stories/<published slug>`; `null` otherwise or when not ready
  - `sitemap(): Promise<string | null>`: `dist/sitemap.xml` plus one `<url>` per published story
  - `preview(record): Promise<string | null>`: a story record (any status) as static HTML with a preview bar
  - All results cached until `store.content.version` changes.

- [ ] **Step 1: Write the failing tests**

```js
// src/test/render.test.js
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
const CREDIT = '<a href="https://onraistudio.com/" target="_blank" rel="noopener noreferrer">Site by Onrai Studio</a>'
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
  createRenderer({ dist: join(dir, 'dist'), entry: join(dir, 'entry.js'), store, importEntry: async () => entry })

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
    expect(home).toContain('<script id="apc-runtime" type="application/json">{"stories":[],"shorts":[]}</script>')
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
```

- [ ] **Step 2: Run the test to see it fail**

Run: `yarn vitest run src/test/render.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the renderer**

```js
// server/render.mjs
// Request-time rendering for the routes whose content lives in the data
// store: the home page (Stories by Us, Shorts), the stories index and each
// published story. Everything else is a static document the build wrote.
//
// It renders with the same bundle the build's prerender used
// (.prerender/entry-prerender.js, written by `yarn build:ssr`) and assembles
// the document with the same builder (scripts/lib/document.mjs), so a page
// is byte-for-byte what the prerender would have written had it known the
// content. The published content is set on lib/runtimeContent.js before each
// render and written into the document as an inline JSON block, which
// src/main.jsx reads before hydrating.
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
import { createDocumentBuilder, stripScripts, withRuntimeContent } from '../scripts/lib/document.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
// Static routes that re-render with the published content.
const LIVE = new Set(['/', '/stories'])
const STORY = /^\/stories\/([a-z0-9-]+)$/

const PREVIEW_BAR =
  '<div style="position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px 16px;' +
  'background:#DFA95A;color:#0E0E0E;font:600 14px/1.3 Barlow,system-ui,sans-serif;text-align:center">' +
  'Preview. Close this tab to go back to the dashboard.</div>' +
  '<div style="height:34px"></div>'

/**
 * @param {object} [options]
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
      const builder = createDocumentBuilder({ template, manifest, themeStyles: mod.themeStyles })
      ssr = {
        render: mod.render,
        setRuntimeContent: mod.setRuntimeContent,
        routeModules: mod.routeModules,
        builder,
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
    const runtime = store.content.publicContent()
    const slug = STORY.exec(path)?.[1]
    const live = LIVE.has(path) || (slug && runtime.stories.some((s) => s.slug === slug))
    if (!live) return null
    fresh()
    if (!cache.has(path)) cache.set(path, renderDocument(path, runtime))
    return cache.get(path)
  }

  /** dist/sitemap.xml with one <url> per published story. */
  self.sitemap = async function sitemap() {
    if (!(await self.ready)) return null
    const file = join(dist, 'sitemap.xml')
    if (!existsSync(file)) return null
    fresh()
    if (!cache.has('sitemap.xml')) {
      const xml = readFileSync(file, 'utf8')
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
```

- [ ] **Step 4: Run the test**

Run: `yarn vitest run src/test/render.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Lint, format, commit**

```bash
yarn eslint server/render.mjs src/test/render.test.js && yarn prettier --write server/render.mjs src/test/render.test.js
git add server/render.mjs src/test/render.test.js
git commit -m "Render the home page and story pages at request time from the data store

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Wire the production server and the dev server

**Files:**
- Modify: `server/index.mjs`, `vite.config.js`, `admin/server.mjs`
- Test: manual, with curl (below)

**Interfaces:**
- Consumes: `createMediaHandler` (Task 3), `createRenderer` (Task 9), `withRuntimeContent` (Task 8).
- Produces: `GET /media/<file>` served; `GET /sitemap.xml` with stories; live documents for `/`, `/stories`, `/stories/<slug>`; `renderer` passed to `createAdminHandler` (used by Task 11). `yarn dev` injects the runtime block and serves `/media`.

- [ ] **Step 1: Wire `server/index.mjs`**

Imports:

```js
import { createHash } from 'node:crypto'
import { createGzip, createBrotliCompress, constants as zlib, gzipSync } from 'node:zlib'
import { createMediaHandler } from './media.mjs'
import { createRenderer } from './render.mjs'
```

After `const store = createStore()`:

```js
// Uploaded images and video, from the store's media folder, with Range support.
const media = createMediaHandler({ dir: store.content.mediaDir })
// The home page, the stories index and each story, rendered at request time
// from the published content; see server/render.mjs.
const renderer = createRenderer({ dist: DIST, store })
renderer.ready.then((ok) => {
  if (!ok) console.error(`[server] live rendering is off: ${renderer.error}`)
})
```

Change the admin line to `const admin = createAdminHandler({ store, renderer })`.

Add a sender for in-memory documents below `serveFile`:

```js
/** An in-memory document (a live page, the sitemap): ETag from its bytes, gzip when asked. */
function sendDocument(req, res, body, { type, cacheControl, status = 200 }) {
  const buffer = Buffer.from(body)
  const etag = `W/"${createHash('sha1').update(buffer).digest('base64url').slice(0, 20)}"`
  securityHeaders(res, { html: type.startsWith('text/html') })
  res.setHeader('ETag', etag)
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304)
    return res.end()
  }
  res.setHeader('Content-Type', type)
  res.setHeader('Vary', 'Accept-Encoding')
  res.setHeader('Cache-Control', cacheControl)
  let out = buffer
  if (buffer.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    res.setHeader('Content-Encoding', 'gzip')
    out = gzipSync(buffer, { level: 6 })
  }
  res.setHeader('Content-Length', String(out.length))
  res.statusCode = status
  if (req.method === 'HEAD') return res.end()
  res.end(out)
}
```

Turn the request handler async. Replace `const server = createServer((req, res) => {` with:

```js
async function handle(req, res) {
```

and the closing `})` of that function with `}`, then add after it:

```js
const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error('[server]', error)
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Internal Server Error')
  })
})
```

Inside `handle`, after the method check (`if (req.method !== 'GET' && req.method !== 'HEAD') {...}`), add:

```js
  // Uploaded media. Before the trailing-slash rule and the dist lookup: the
  // files are not in dist, and they take Range requests.
  if (media(req, res)) return
```

Before the `// A real file on disk` block, add:

```js
  // The sitemap, with the published stories added. dist/sitemap.xml is a real
  // file, so this has to come before the file lookup.
  if (pathname === '/sitemap.xml') {
    const xml = await renderer.sitemap()
    if (xml) return sendDocument(req, res, xml, { type: MIME['.xml'], cacheControl: 'public, max-age=3600' })
  }
```

Before the `// A prerendered page` block, add:

```js
  // A live route: the home page and the stories, rendered with the published
  // content. Ahead of the prerendered lookup, which holds the build-time
  // versions of "/" and "/stories" (demo content) as the fallback.
  const live = await renderer.page(pathname)
  if (live) {
    if (req.method === 'GET') recordView(req, pathname)
    return sendDocument(req, res, live, {
      type: MIME['.html'],
      cacheControl: 'public, max-age=0, must-revalidate',
    })
  }
```

Update the file header comment: add a paragraph that the server also serves `/media`, renders the live routes through `server/render.mjs`, and that `vite preview` would not do any of it.

- [ ] **Step 2: Wire `yarn dev` and `yarn admin`**

In `vite.config.js`:

```js
import { createMediaHandler } from './server/media.mjs'
import { withRuntimeContent } from './scripts/lib/document.mjs'
```

Rewrite the `admin(mode)` plugin:

```js
/**
 * The dashboard at /admin, the forms' /api/enquiry and the uploaded media at
 * /media on the dev server, as on the site server. All read and write .data/
 * (see server/store.mjs). The published stories and shorts are written into
 * the page as the production server writes them, so `yarn dev` shows them
 * (client-rendered, as everything is in dev) instead of the demo cards.
 */
function admin(mode) {
  const store = createStore()
  // Vite keeps .env out of process.env; the forms' Formspree id lives there.
  const { VITE_FORMSPREE_ID: formspreeId = '' } = loadEnv(mode, process.cwd(), 'VITE_')
  const handlers = [
    createApiHandler({ store, formspreeId }),
    createAdminHandler({ store }),
    createMediaHandler({ dir: store.content.mediaDir }),
  ]
  return {
    name: 'site-admin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!handlers.some((handle) => handle(req, res))) next()
      })
    },
    transformIndexHtml: {
      order: 'post',
      handler: (html) => withRuntimeContent(html, store.content.publicContent()),
    },
  }
}
```

In `admin/server.mjs`, add `import { createMediaHandler } from '../server/media.mjs'`, create `const store = createStore()`, pass it to `createAdminHandler({ site: SITE, store })`, create `const media = createMediaHandler({ dir: store.content.mediaDir })`, and add `if (media(req, res)) return` right after `if (admin(req, res)) return`.

- [ ] **Step 3: Build, run, and check with curl**

```bash
yarn build && (PORT=4310 yarn preview &) && sleep 2
curl -s http://localhost:4310/ | grep -c 'id="apc-runtime"'                       # 1
curl -s http://localhost:4310/stories | grep -c '<h1'                              # 1
curl -so /dev/null -w '%{http_code}\n' http://localhost:4310/stories/nope          # 404
curl -s http://localhost:4310/sitemap.xml | grep -c '<urlset'                      # 1
curl -so /dev/null -w '%{http_code}\n' http://localhost:4310/media/nope.webp       # 404
curl -s http://localhost:4310/ | grep -c 'href="https://onraistudio.com/"'        # 1
curl -s -H 'Accept-Encoding: gzip' -o /dev/null -w '%{http_code} %{size_download}\n' http://localhost:4310/
```

Then publish a story straight into the store and check it goes live without a restart:

```bash
yarn node -e "
import('./server/store.mjs').then(({ createStore }) => {
  const c = createStore().content
  const s = c.addStory({ title: 'Smoke test story', standfirst: 'From the shell.', body: '<p>Hello</p>', heroImage: '/media/x1.webp' })
  console.log(JSON.stringify(c.publishStory(s.id)))
})"
curl -s http://localhost:4310/ | grep -c 'Smoke test story'                        # ≥ 1
curl -s http://localhost:4310/stories/smoke-test-story | grep -c '<h1'             # 1
curl -s http://localhost:4310/sitemap.xml | grep -c 'smoke-test-story'             # 1
```

Then remove it the same way (`c.deleteStory(id)` via `c.listStories()[0].id`) and confirm `/stories/smoke-test-story` is 404 again. Stop the server (`kill %1` or `pkill -f 'server/index.mjs'`).

- [ ] **Step 4: Run the suite, lint, format, commit**

```bash
yarn test && yarn lint && yarn prettier --write server/index.mjs vite.config.js admin/server.mjs
git add server/index.mjs vite.config.js admin/server.mjs
git commit -m "Serve media, the live sitemap and the live pages from the site server

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Preview, TinyMCE files and the renderer's status

**Files:**
- Modify: `admin/handler.mjs`, `package.json` (dependency), `yarn.lock`
- Test: `src/test/admin.test.js`

**Interfaces:**
- Consumes: `renderer.preview(record)`, `renderer.error` (Task 9).
- Produces, behind the gate:
  - `GET preview/stories/<id>` → the static preview HTML; 404 unknown id; 503 `{ error: 'no-renderer' }` when the handler has no renderer (dev server, `yarn admin`)
  - `GET vendor/tinymce/<path>` → files from the `tinymce` package; 404 outside it or when not installed
  - `api/status` `publishing` gains `renderer: 'ready' | 'error' | 'none'` and `rendererError: string`
  - `createAdminHandler({ renderer })` option

- [ ] **Step 1: Add TinyMCE**

```bash
yarn add tinymce@6.8.6
```

Then in `package.json` add, at the top level:

```json
  "dependenciesMeta": {
    "tinymce": {
      "unplugged": true
    }
  },
```

Run `yarn install` and confirm the files are real on disk under PnP:

```bash
yarn node -e "console.log(require.resolve('tinymce/tinymce.min.js'))"
```

Expected: a path under `.yarn/unplugged/tinymce-npm-6.8.6-…/node_modules/tinymce/tinymce.min.js`. Check the licence: `yarn node -e "console.log(require('tinymce/package.json').license)"` prints `MIT`.

- [ ] **Step 2: Write the failing tests**

Append inside `describe('admin handler')` in `src/test/admin.test.js`:

```js
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
        request(`${open.base}/admin/vendor/tinymce/../../package.json`, (res) => resolve(res.statusCode)).end()
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
      expect((await (await fetch(`${open.base}/admin/api/status`)).json()).publishing.renderer).toBe('none')
      store.content.deleteStory(draft.id)
    })
  })
```

At the top of `admin.test.js` extend the http import to `import { createServer, request } from 'node:http'`.

- [ ] **Step 3: Run the tests to see them fail**

Run: `yarn vitest run src/test/admin.test.js`
Expected: the two new tests FAIL.

- [ ] **Step 4: Add the routes**

In `admin/handler.mjs`:

Imports: `import { createRequire } from 'node:module'` and extend the `node:path` import with `extname, normalize, sep`.

Constants, after `FILES`:

```js
// TinyMCE, served from the package so the editor needs no cloud key. Yarn PnP
// keeps packages zipped, so tinymce is marked `unplugged` in package.json and
// resolves to real files; without it installed the editor falls back to a
// plain textarea and this stays null.
let TINYMCE_DIR = null
try {
  TINYMCE_DIR = dirname(createRequire(import.meta.url).resolve('tinymce/tinymce.min.js'))
} catch {
  TINYMCE_DIR = null
}
const VENDOR_MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
}
```

Add `renderer` to the options (`{ prefix = '/admin', site = '', password, store, renderer } = {}`) and document it in the JSDoc: `@param {import('../server/render.mjs')} [options.renderer] the live renderer; without one the preview answers 503`.

Inside `createAdminHandler`, before `return function handleAdmin`:

```js
  function vendor(req, res, rest) {
    if (!rest.startsWith('vendor/tinymce/')) return false
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed')
      return true
    }
    const file = TINYMCE_DIR && normalize(join(TINYMCE_DIR, rest.slice('vendor/tinymce/'.length)))
    if (!file || !file.startsWith(TINYMCE_DIR + sep) || !existsSync(file) || !statSync(file).isFile()) {
      send(res, 404, 'Not found')
      return true
    }
    res.setHeader('Content-Type', VENDOR_MIME[extname(file)] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=86400')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Length', String(statSync(file).size))
    res.statusCode = 200
    if (req.method === 'HEAD') res.end()
    else createReadStream(file).pipe(res)
    return true
  }

  function preview(req, res, rest) {
    const match = /^preview\/stories\/([a-z0-9]+)$/.exec(rest)
    if (!match) return false
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed')
      return true
    }
    const record = store?.content?.getStory(match[1])
    if (!record) {
      send(res, 404, 'No such story')
      return true
    }
    if (!renderer) {
      json(res, 503, { error: 'no-renderer' })
      return true
    }
    renderer.preview(record).then(
      (html) => {
        if (html) send(res, 200, html, 'text/html; charset=utf-8')
        else json(res, 503, { error: 'renderer', message: renderer.error })
      },
      (error) => send(res, 500, `preview failed:\n${error.message}`),
    )
    return true
  }
```

In `handleAdmin`, after the `publishing(...)` line:

```js
    if (vendor(req, res, rest)) return true
    if (preview(req, res, rest)) return true
```

In `publishingStatus()`, add to the returned object (both branches):

```js
      renderer: renderer ? (renderer.error ? 'error' : 'ready') : 'none',
      rendererError: renderer?.error || '',
```

Write it so both branches share one object spread, for example build `const base = { renderer: …, rendererError: … }` and return `{ ...base, stories, shorts }`.

Update the header comment with the two new URL groups.

- [ ] **Step 5: Run the tests**

Run: `yarn vitest run src/test/admin.test.js`
Expected: PASS.

- [ ] **Step 6: Lint, format, commit**

```bash
yarn eslint admin/handler.mjs src/test/admin.test.js && yarn prettier --write admin/handler.mjs src/test/admin.test.js package.json
git add admin/handler.mjs src/test/admin.test.js package.json yarn.lock
git commit -m "Serve the story preview and TinyMCE from the dashboard

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: The Publish section: lists and the story editor

**Files:**
- Create: `admin/publish.js`, `admin/publish.css`
- Modify: `admin/index.html`, `admin/app.js`, `admin/handler.mjs` (the `FILES` table)
- Test: manual, in Chrome (steps below). The dashboard is a plain DOM app with no unit tests today; the API it talks to is covered by Tasks 4 and 11.

**Interfaces:**
- Consumes: the API from Tasks 4 and 11; `app.js` globals `state`, `esc`, `pill`, `pageHead`, `opt`, `fmtDate`, `fmtWhen`, `ago`, `siteUrl`, `external`, `getJson`, `render`, `route`.
- Produces, in `publish.js`: `publishView(kind, param)`, `bindPublish(kind, param)`, `loadPublish()`, `leaveEditor()`, and the helpers `upload()`, `resizeImage()`, `sendJson()`, `toast()` that Task 13 reuses. `state.stories`, `state.shorts`, `state.publish`, `state.editing`.

- [ ] **Step 1: Register the files and the nav group**

`admin/handler.mjs`, `FILES`:

```js
  'publish.js': { file: 'publish.js', type: 'text/javascript; charset=utf-8' },
  'publish.css': { file: 'publish.css', type: 'text/css; charset=utf-8' },
```

`admin/index.html`: add `<link rel="stylesheet" href="publish.css" />` after the `app.css` link, and `<script src="publish.js"></script>` after the `app.js` script.

`admin/app.js`:

1. `NAV`: insert after the first (untitled) group:

```js
  {
    title: 'Publish',
    items: [
      ['stories', 'Stories'],
      ['shorts', 'Shorts'],
    ],
  },
```

2. The header comment's hash-route list gains `#stories  #stories/<id>  #shorts  #shorts/<id>`.

3. In `render()`, right after `const { page, param } = route()`, before `const views`:

```js
  // An open editor owns the page: the minute refresh must not redraw it
  // under the editor's hands (TinyMCE state, unsaved fields).
  if (
    state.editing &&
    state.editing.kind === page &&
    state.editing.id === param &&
    document.getElementById('editor')
  ) {
    return
  }
```

   and add to `views`:

```js
    stories: () => publishView('stories', param),
    shorts: () => publishView('shorts', param),
```

   and after the `bindTraffic` line:

```js
  if (page === 'stories' || page === 'shorts') bindPublish(page, param)
```

4. In `load()`, add `loadPublish()` to the `Promise.all` array (after `loadTraffic()`).

5. The `hashchange` listener becomes:

```js
window.addEventListener('hashchange', () => {
  state.months.scrolled = false
  leaveEditor()
  render()
})
```

6. In `renderNav()`'s `badges`, add a draft count:

```js
    stories: (() => {
      const drafts = state.stories.filter((s) => s.status === 'draft').length
      return drafts ? `<span class="badge">${drafts}</span>` : ''
    })(),
```

- [ ] **Step 2: Write `admin/publish.js`**

```js
// The Publish section of the dashboard: Stories and Shorts, each a list and
// an editor. Loaded after app.js and shares its globals (state, esc, pill,
// pageHead, opt, fmtDate, fmtWhen, ago, siteUrl, external, getJson, render,
// route). render() calls publishView() for the HTML and bindPublish() to wire
// the controls; an open editor sets state.editing so the minute refresh
// leaves it alone, and leaveEditor() tears it down on navigation.
//
// Uploads happen here, in the browser: an image is resized on a canvas (the
// hero as 1600x900 and 800x450, a body image 1200 wide, a poster 540x960,
// WebP at 0.85) and PUT to api/media; a video is PUT as it is. The server
// checks the bytes and the size cap (server/media.mjs). TinyMCE is loaded on
// demand from vendor/tinymce, served by the dashboard from the package.

const PUBLISH = {
  stories: {
    title: 'Stories',
    one: 'story',
    api: 'api/stories',
    intro:
      'Articles for "Stories by Us" on the home page. A published story gets its own page on the site.',
    firstHint: 'Write the first one: a title, a picture and the text. Preview it, then publish.',
  },
  shorts: {
    title: 'Shorts',
    one: 'short',
    api: 'api/shorts',
    intro: 'Vertical videos for the Shorts row on the home page. A published short plays in an overlay.',
    firstHint: 'Upload the first clip: a vertical video and a title.',
  },
}
const IMAGE = { hero: [1600, 900], thumb: [800, 450], body: [1200, 0], poster: [540, 960] }
const WEBP_QUALITY = 0.85
const UPLOAD_ERRORS = {
  size: 'That file is over the size limit: 10 MB for an image, 300 MB for a video.',
  type: 'That is not a format the site can use. Images: JPG, PNG, GIF or WebP. Video: MP4 or WebM.',
  kind: 'That is the wrong kind of file for this slot.',
}
const FIELD_LABELS = { title: 'a title', heroImage: 'a hero image', video: 'a video', poster: 'a poster' }
const FIELD_IDS = { title: 'ed-title', heroImage: 'ed-hero', video: 'ed-video', poster: 'ed-poster' }

state.stories = []
state.shorts = []
state.publish = { q: '', show: '' }
state.editing = null // { kind, id, dirty } while an editor is open

// ---------------------------------------------------------------- helpers

const statusPill = (r) =>
  r.status === 'published' ? pill('good', 'Published') : pill('neutral', 'Draft')
const storyUrl = (s) => `/stories/${s.slug}`
const mmss = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`
const byId = (kind, id) => state[kind].find((r) => r.id === id)

function replaceRecord(kind, record) {
  const i = state[kind].findIndex((r) => r.id === record.id)
  if (i === -1) state[kind].unshift(record)
  else state[kind][i] = record
}

async function sendJson(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401) {
    location.replace('./')
    throw new Error('signed out')
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data })
  return data
}

/** PUT a blob to api/media. XHR, for the upload progress fetch() cannot report. */
function upload(blob, kind, name, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', `api/media?kind=${kind}`)
    xhr.setRequestHeader('X-File-Name', name || 'upload')
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status === 401) return location.replace('./')
      let data = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = {}
      }
      if (xhr.status === 201) resolve(data)
      else reject(new Error(UPLOAD_ERRORS[data.error] || `The upload failed (${xhr.status}).`))
    })
    xhr.addEventListener('error', () => reject(new Error('The upload failed. Check the connection and try again.')))
    xhr.send(blob)
  })
}

/**
 * Resize an image in the browser. With a height, crop to cover that shape
 * (never upscaling: a smaller source gives a smaller file of the same shape);
 * without one, scale to the width and keep the ratio.
 * @returns {Promise<Blob>} WebP
 */
async function resizeImage(file, [width, height]) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  if (height) {
    canvas.width = Math.min(width, bitmap.width)
    canvas.height = Math.round((canvas.width * height) / width)
  } else {
    const scale = Math.min(1, width / bitmap.width)
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
  }
  const ratio = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height)
  const w = bitmap.width * ratio
  const h = bitmap.height * ratio
  canvas.getContext('2d').drawImage(bitmap, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be read.'))),
      'image/webp',
      WEBP_QUALITY,
    ),
  )
}

let toastTimer = null
function toast(message, tone = 'good') {
  let el = document.getElementById('toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast'
    el.setAttribute('role', 'status')
    document.body.append(el)
  }
  el.className = `toast toast--${tone} is-shown`
  el.textContent = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('is-shown'), tone === 'good' ? 3500 : 7000)
}
const showError = (error) => {
  if (error.message !== 'signed out') toast(error.message, 'critical')
}

/** A drop zone: click, keyboard or drop hands the first file to onFile. */
function bindDrop(zone, input, onFile) {
  if (!zone || !input) return
  zone.addEventListener('click', (e) => {
    if (e.target.closest('video, a, button')) return
    input.click()
  })
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      input.click()
    }
  })
  input.addEventListener('change', () => {
    if (input.files[0]) onFile(input.files[0])
    input.value = ''
  })
  zone.addEventListener('dragover', (e) => {
    e.preventDefault()
    zone.classList.add('is-over')
  })
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'))
  zone.addEventListener('drop', (e) => {
    e.preventDefault()
    zone.classList.remove('is-over')
    const file = e.dataTransfer?.files?.[0]
    if (file) onFile(file)
  })
}

function setProgress(zone, percent) {
  const bar = zone.querySelector('.progress')
  if (!bar) return
  bar.hidden = percent === null
  bar.firstElementChild.style.width = `${percent ?? 0}%`
}

let tinyLoading = null
function loadTiny() {
  if (window.tinymce) return Promise.resolve()
  if (!tinyLoading) {
    tinyLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'vendor/tinymce/tinymce.min.js'
      script.onload = resolve
      script.onerror = () => {
        tinyLoading = null
        reject(new Error('The editor could not load; the body is a plain text box for now.'))
      }
      document.head.append(script)
    })
  }
  return tinyLoading
}

async function loadPublish() {
  const [stories, shorts] = await Promise.all([getJson('api/stories'), getJson('api/shorts')])
  state.stories = stories.items
  state.shorts = shorts.items
}

/** Tears down an open editor: TinyMCE, the unsaved-changes guard, the flag. */
function leaveEditor() {
  if (window.tinymce) window.tinymce.remove()
  window.onbeforeunload = null
  state.editing = null
}

// ------------------------------------------------------------------ lists

function publishView(kind, param) {
  if (!param) return publishList(kind)
  const record = byId(kind, param)
  if (!record) {
    return `${pageHead(PUBLISH[kind].title)}<p class="error">There is no ${PUBLISH[kind].one} with that id. <a href="#${kind}">Back to ${PUBLISH[kind].title}</a></p>`
  }
  return kind === 'stories' ? storyEditor(record) : shortEditor(record)
}

function bindPublish(kind, param) {
  if (!param) return bindPublishList(kind)
  const record = byId(kind, param)
  if (record) bindEditor(kind, record)
}

function publishList(kind) {
  const spec = PUBLISH[kind]
  const f = state.publish
  const all = state[kind]
  const rows = all.filter(
    (r) =>
      (!f.show || r.status === f.show) &&
      (!f.q || (r.title || '').toLowerCase().includes(f.q.toLowerCase())),
  )
  const thumb = (r) => {
    const src = kind === 'stories' ? r.heroThumb || r.heroImage : r.poster
    return src
      ? `<img class="thumb thumb--${kind}" src="${esc(src)}" alt="" loading="lazy">`
      : `<span class="thumb thumb--${kind} thumb--none"></span>`
  }
  const table = `<div class="table-wrap"><table>
      <thead><tr><th></th><th>Title</th><th>Status</th><th>${kind === 'stories' ? 'Date' : 'Duration'}</th><th>Edited</th><th></th></tr></thead>
      <tbody>${
        rows
          .map(
            (r) => `<tr class="clickable" data-href="#${kind}/${esc(r.id)}">
          <td class="thumb-cell">${thumb(r)}</td>
          <td><div class="name">${esc(r.title || 'Untitled')}</div>${
            kind === 'stories' && r.standfirst ? `<div class="sub">${esc(r.standfirst)}</div>` : ''
          }</td>
          <td>${statusPill(r)}</td>
          <td>${kind === 'stories' ? esc(fmtDate(r.date)) : r.duration ? mmss(r.duration) : '<span class="na">–</span>'}</td>
          <td><span title="${esc(fmtWhen(r.updatedAt))}">${esc(ago(r.updatedAt))}</span></td>
          <td class="nowrap">${
            kind === 'stories' && r.status === 'published' ? external(siteUrl(storyUrl(r)), 'View on site') : ''
          }</td>
        </tr>`,
          )
          .join('') || '<tr><td colspan="6" class="empty">Nothing matches.</td></tr>'
      }</tbody></table></div>`
  return `
    ${pageHead(spec.title, spec.intro)}
    <div class="filters">
      <label class="field"><span>Search</span><input type="search" id="p-q" value="${esc(f.q)}" placeholder="title"></label>
      <label class="field"><span>Status</span><select id="p-show">${opt('', 'Any', f.show)}${opt('published', 'Published', f.show)}${opt('draft', 'Drafts', f.show)}</select></label>
      <span class="count">${rows.length} of ${all.length}</span>
      <button type="button" class="btn" id="p-new">New ${spec.one}</button>
    </div>
    ${
      all.length
        ? table
        : `<div class="card empty-state"><p><strong>No ${spec.title.toLowerCase()} yet.</strong></p><p class="sub">${esc(spec.firstHint)}</p></div>`
    }`
}

function bindPublishList(kind) {
  const set = (key, value) => {
    state.publish[key] = value
    render()
    if (key === 'q') {
      const el = document.getElementById('p-q')
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }
  document.getElementById('p-q').addEventListener('input', (e) => set('q', e.target.value))
  document.getElementById('p-show').addEventListener('change', (e) => set('show', e.target.value))
  document.getElementById('p-new').addEventListener('click', async () => {
    try {
      const record = await sendJson('POST', PUBLISH[kind].api, {})
      replaceRecord(kind, record)
      location.hash = `#${kind}/${record.id}`
    } catch (error) {
      showError(error)
    }
  })
}

// ---------------------------------------------------------------- editors

function editorBar(kind, record, { preview }) {
  const live = record.status === 'published'
  return `<header class="editor__bar">
      <div>
        <p class="crumbs"><a href="#${kind}">${esc(PUBLISH[kind].title)}</a> › ${esc(record.title || 'Untitled')}</p>
        ${statusPill(record)}
      </div>
      <div class="editor__actions">
        <span class="editor__saved" id="ed-saved"></span>
        <button type="button" class="btn btn--ghost" id="ed-save">Save draft</button>
        ${preview ? '<button type="button" class="btn btn--ghost" id="ed-preview">Preview</button>' : ''}
        <button type="button" class="btn" id="ed-publish">${live ? 'Unpublish' : 'Publish'}</button>
      </div>
    </header>`
}

function deleteCard(kind, what) {
  return `<section class="card card--danger">
      <h2>Delete</h2>
      <p class="sub">Removes the ${PUBLISH[kind].one} and ${what}. This cannot be undone.</p>
      <div class="editor__delete" id="ed-delete-wrap">
        <button type="button" class="btn btn--ghost btn--sm" id="ed-delete">Delete ${PUBLISH[kind].one}</button>
      </div>
    </section>`
}

function heroZone(story) {
  return `${
    story.heroImage
      ? `<img src="${esc(story.heroImage)}" alt="">`
      : '<span class="drop__hint">Drop an image here or click to choose.<br><small>Landscape. It is cropped to 16:9 and resized to 1600 wide.</small></span>'
  }
    <input type="file" accept="image/*" id="ed-hero-file" hidden>
    <div class="progress" hidden><div></div></div>`
}

function storyEditor(story) {
  const live = story.status === 'published'
  return `<form class="editor" id="editor" novalidate>
    ${editorBar('stories', story, { preview: true })}
    <div class="editor__grid">
      <div class="editor__main">
        <label class="field field--title"><span>Title</span><input id="ed-title" value="${esc(story.title)}" placeholder="The headline" maxlength="200"></label>
        <label class="field"><span>Standfirst</span><textarea id="ed-standfirst" rows="2" placeholder="One or two sentences under the title; also the description search engines show" maxlength="600">${esc(story.standfirst)}</textarea></label>
        <div class="field"><span>Body</span><textarea id="ed-body" rows="18">${esc(story.body)}</textarea></div>
      </div>
      <aside class="editor__side">
        <section class="card">
          <h2>Hero image</h2>
          <div class="drop drop--hero" id="ed-hero" tabindex="0" role="button" aria-label="Choose the hero image">${heroZone(story)}</div>
          <label class="field"><span>Alt text</span><input id="ed-alt" value="${esc(story.heroAlt)}" placeholder="What the picture shows, for screen readers" maxlength="200"></label>
        </section>
        <section class="card">
          <h2>Publishing</h2>
          <label class="field"><span>Date shown</span><input type="date" id="ed-date" value="${esc(story.date)}"></label>
          <label class="field"><span>Address</span><span class="field__prefix"><span>/stories/</span><input id="ed-slug" value="${esc(story.slug)}" ${live ? 'readonly title="The address is fixed while the story is published."' : ''}></span></label>
          ${
            live
              ? `<p class="sub">Live at ${external(siteUrl(storyUrl(story)), siteUrl(storyUrl(story)))}</p>`
              : '<p class="sub">A draft is visible only here and in Preview.</p>'
          }
        </section>
        ${deleteCard('stories', 'its hero image')}
      </aside>
    </div>
  </form>`
}

function bindEditor(kind, record) {
  state.editing = { kind, id: record.id, dirty: false }
  const spec = PUBLISH[kind]
  const api = `${spec.api}/${record.id}`
  const $ = (id) => document.getElementById(id)
  const saved = $('ed-saved')
  const markDirty = () => {
    state.editing.dirty = true
    saved.textContent = 'Unsaved changes'
    document.querySelectorAll('.is-missing').forEach((el) => el.classList.remove('is-missing'))
  }
  for (const id of ['ed-title', 'ed-standfirst', 'ed-alt', 'ed-date', 'ed-slug']) {
    $(id)?.addEventListener('input', markDirty)
  }
  window.onbeforeunload = () => (state.editing?.dirty ? true : undefined)

  let editor = null
  if (kind === 'stories') {
    loadTiny()
      .then(() =>
        window.tinymce.init({
          selector: '#ed-body',
          base_url: new URL('vendor/tinymce', location.href).pathname,
          suffix: '.min',
          skin: 'oxide-dark',
          content_css: 'dark',
          content_style:
            'body{font-family:Barlow,system-ui,sans-serif;font-size:17px;line-height:1.7;max-width:760px;margin:16px auto;padding:0 8px} img{max-width:100%;height:auto} blockquote{border-left:3px solid #DFA95A;margin-left:0;padding-left:16px;color:#aaa}',
          plugins: 'lists link image table code autolink autoresize',
          toolbar:
            'blocks | bold italic underline strikethrough | link image | bullist numlist blockquote table | alignleft aligncenter alignright | removeformat code',
          block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4',
          menubar: false,
          branding: false,
          promotion: false,
          statusbar: false,
          min_height: 480,
          autoresize_bottom_margin: 24,
          convert_urls: false,
          automatic_uploads: true,
          paste_data_images: true,
          images_upload_handler: (blobInfo, progress) =>
            resizeImage(blobInfo.blob(), IMAGE.body)
              .then((blob) => upload(blob, 'image', blobInfo.filename(), progress))
              .then((r) => r.url),
          setup: (ed) => ed.on('change input undo redo', markDirty),
        }),
      )
      .then((editors) => {
        editor = editors?.[0] || null
      })
      .catch((error) => {
        $('ed-body').addEventListener('input', markDirty)
        toast(error.message, 'warning')
      })
  }

  const fields = () =>
    kind === 'stories'
      ? {
          title: $('ed-title').value,
          standfirst: $('ed-standfirst').value,
          heroAlt: $('ed-alt').value,
          date: $('ed-date').value,
          slug: $('ed-slug').value,
          body: editor ? editor.getContent() : $('ed-body').value,
        }
      : { title: $('ed-title').value }

  async function save(extra = {}) {
    const next = await sendJson('PUT', api, { ...fields(), ...extra })
    replaceRecord(kind, next)
    state.editing.dirty = false
    saved.textContent = `Saved ${new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
    if ($('ed-slug') && $('ed-slug').value !== next.slug) $('ed-slug').value = next.slug
    return next
  }

  $('ed-save').addEventListener('click', () => save().catch(showError))

  $('ed-preview')?.addEventListener('click', async () => {
    try {
      await save()
      window.open(`preview/stories/${record.id}`, '_blank', 'noopener')
    } catch (error) {
      showError(error)
    }
  })

  $('ed-publish').addEventListener('click', async () => {
    try {
      const current = await save()
      const action = current.status === 'published' ? 'unpublish' : 'publish'
      const result = await sendJson('POST', `${api}/${action}`)
      replaceRecord(kind, result)
      leaveEditor()
      render()
      toast(action === 'publish' ? `Published. The ${spec.one} is live on the site.` : 'Unpublished. It is a draft again.')
    } catch (error) {
      if (error.status === 422) {
        const missing = error.data.missing || []
        for (const key of missing) $(FIELD_IDS[key])?.closest('.field, .drop')?.classList.add('is-missing')
        toast(`Add ${missing.map((k) => FIELD_LABELS[k] || k).join(' and ')} before publishing.`, 'critical')
      } else showError(error)
    }
  })

  bindDelete(kind, record.id, api)

  if (kind === 'stories') bindHero(record, save)
  else bindShort(record, save)
}

/** Delete: a two-step confirmation inline, never a browser dialog. */
function bindDelete(kind, id, api) {
  const wrap = document.getElementById('ed-delete-wrap')
  const one = PUBLISH[kind].one
  const arm = () =>
    document.getElementById('ed-delete').addEventListener('click', () => {
      wrap.innerHTML = `<span class="sub">Really delete?</span>
        <button type="button" class="btn btn--sm btn--danger" id="ed-delete-yes">Yes, delete</button>
        <button type="button" class="btn btn--ghost btn--sm" id="ed-delete-no">Keep it</button>`
      document.getElementById('ed-delete-no').addEventListener('click', () => {
        wrap.innerHTML = `<button type="button" class="btn btn--ghost btn--sm" id="ed-delete">Delete ${one}</button>`
        arm()
      })
      document.getElementById('ed-delete-yes').addEventListener('click', async () => {
        try {
          await sendJson('DELETE', api)
          state[kind] = state[kind].filter((r) => r.id !== id)
          leaveEditor()
          location.hash = `#${kind}`
          toast('Deleted.')
        } catch (error) {
          showError(error)
        }
      })
    })
  arm()
}

/** The hero drop zone: resize to two sizes, upload both, save the URLs. */
function bindHero(story, save) {
  const zone = document.getElementById('ed-hero')
  const wire = () =>
    bindDrop(zone, document.getElementById('ed-hero-file'), async (file) => {
      try {
        setProgress(zone, 0)
        const [hero, thumb] = await Promise.all([resizeImage(file, IMAGE.hero), resizeImage(file, IMAGE.thumb)])
        const base = file.name.replace(/\.[^.]+$/, '')
        const [big, small] = await Promise.all([
          upload(hero, 'image', `${base}.webp`, (p) => setProgress(zone, p)),
          upload(thumb, 'image', `${base}-thumb.webp`),
        ])
        const next = await save({ heroImage: big.url, heroThumb: small.url })
        zone.innerHTML = heroZone(next)
        zone.classList.remove('is-missing')
        wire()
        toast('Hero image uploaded.')
      } catch (error) {
        setProgress(zone, null)
        showError(error)
      }
    })
  wire()
}
```

Leave `bindShort` and `shortEditor` as one-line stubs for now, replaced in Task 13:

```js
function shortEditor(short) {
  return `${editorBar('shorts', short, { preview: false })}<p class="muted">Shorts editor coming in the next task.</p>`
}
function bindShort() {}
```

- [ ] **Step 3: Write `admin/publish.css`**

```css
/* The Publish section: lists with thumbnails, and the editors. Tokens from
   app.css. */

.thumb-cell {
  width: 72px;
}
.thumb {
  display: block;
  width: 64px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  background: var(--bg-raised);
}
.thumb--shorts {
  width: 27px;
  height: 48px;
}
.thumb--none {
  background: repeating-linear-gradient(135deg, var(--bg-raised) 0 6px, var(--bg-card) 6px 12px);
}
.empty-state {
  max-width: 520px;
  text-align: left;
}
.empty-state p + p {
  margin-top: 6px;
}

/* Editor */
.editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.editor__bar {
  position: sticky;
  top: -28px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -28px -32px 0;
  padding: 16px 32px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.editor__bar .crumbs {
  margin-bottom: 4px;
}
.editor__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.editor__saved {
  font-size: 13px;
  color: var(--muted);
}
.editor__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;
}
.editor__main,
.editor__side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.editor__side .card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field--title input {
  font-family: var(--display);
  font-size: 1.6rem;
  font-weight: 700;
}
.field__prefix {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-card);
}
.field__prefix > span {
  padding: 0 0 0 10px;
  color: var(--faint);
  font-family: var(--mono);
  font-size: 0.85em;
  white-space: nowrap;
}
.field__prefix input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
}
.field__prefix input[readonly] {
  color: var(--muted);
}
.is-missing {
  outline: 2px solid var(--critical);
  outline-offset: 2px;
  border-radius: 6px;
}

/* Drop zones */
.drop {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--muted);
  cursor: pointer;
  text-align: center;
}
.drop:hover,
.drop:focus-visible,
.drop.is-over {
  border-color: var(--accent);
  color: var(--text);
}
.drop img,
.drop video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.drop video {
  object-fit: contain;
  background: #000;
}
.drop__hint {
  padding: 16px;
  font-size: 14px;
  line-height: 1.4;
}
.drop__hint small {
  color: var(--faint);
}
.drop--poster {
  aspect-ratio: 9 / 16;
  max-width: 180px;
}
.drop--video {
  aspect-ratio: 9 / 16;
  max-width: 320px;
}
.progress {
  position: absolute;
  inset: auto 0 0 0;
  height: 4px;
  background: var(--bg-raised);
}
.progress > div {
  height: 100%;
  width: 0;
  background: var(--accent);
  transition: width 150ms ease;
}

/* Delete */
.card--danger {
  border-color: color-mix(in srgb, var(--critical) 40%, var(--border));
}
.editor__delete {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn--danger {
  background: var(--critical);
  color: #fff;
}

/* TinyMCE in the dark shell */
.tox-tinymce {
  border-radius: 8px !important;
  border-color: var(--border) !important;
}

/* Toast */
.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
  max-width: 420px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-raised);
  color: var(--text);
  font-size: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.toast.is-shown {
  opacity: 1;
  transform: none;
}
.toast--good {
  border-color: var(--good);
}
.toast--warning {
  border-color: var(--warning);
}
.toast--critical {
  border-color: var(--critical);
}

@media (max-width: 1000px) {
  .editor__grid {
    grid-template-columns: 1fr;
  }
  .editor__bar {
    flex-direction: column;
    align-items: stretch;
  }
}
```

`.main` in `app.css` has `padding: 28px 32px 64px`; the `.editor__bar` negative margins match it so the bar runs edge to edge. Adjust both together if that padding changes.

- [ ] **Step 4: Check it in the browser**

Run `yarn build && PORT=4310 yarn preview` (the preview needs the built site). Open `http://localhost:4310/admin/#stories` in Chrome (use the Chrome extension tools; the extension's `find`/`read_page` are fine for checks):

1. The sidebar shows **Publish → Stories, Shorts**. The Stories list shows the empty state with "New story".
2. Click **New story**: the editor opens at `#stories/<id>` with a Draft pill, TinyMCE loads in dark skin with the toolbar described.
3. Type a title, a standfirst, two paragraphs and a heading in the body. Drop a JPG on the hero zone: the progress bar runs, the image appears, "Hero image uploaded." toasts. In `.data/media/` two `.webp` files exist, one ~1600 wide and one 800 wide (`yarn node -e` with the `sniff` helper or just open them).
4. Insert an image into the body through the toolbar: it uploads and the `src` is `/media/…` (check with the `code` toolbar button). No `data:` URL.
5. Click **Preview**: a new tab opens with the real story page, the preview bar at the top, no console errors, the site's fonts and footer present.
6. Remove the title and click **Publish**: the title field is outlined and the toast names what is missing. Put the title back and publish: the pill turns Published, the Address field is read-only, a "Live at" link appears. Open `http://localhost:4310/` in a tab: the story is the first card under Stories by Us and links to its page. `http://localhost:4310/stories` lists it. `/sitemap.xml` contains it.
7. Reload the dashboard mid-edit after typing without saving: the browser's leave-page prompt appears (that is the one native dialog we want; cancel it).
8. Wait a minute on the editor with unsaved text: the minute refresh does not wipe it.
9. **Unpublish**, then **Delete → Really delete? → Yes**: back on the list, the story is gone, the hero files are gone from `.data/media/`, the home page shows the demo cards again.
10. Resize to 375px wide: the editor stacks to one column and nothing overflows.

Fix anything that fails before committing.

- [ ] **Step 5: Lint, format, commit**

```bash
yarn eslint admin/publish.js admin/app.js admin/handler.mjs && yarn prettier --write admin/publish.js admin/publish.css admin/app.js admin/index.html admin/handler.mjs
git add admin/publish.js admin/publish.css admin/app.js admin/index.html admin/handler.mjs
git commit -m "Add the Publish section to the dashboard with the story editor

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

`publish.js` uses globals from `app.js` (`state`, `esc`, …) and `app.js` calls functions from `publish.js`. ESLint's `no-undef` will complain in both directions. Add one shared `/* global … */` comment at the top of each file naming what it borrows, for example at the top of `publish.js`:

```js
/* global state, esc, pill, pageHead, opt, fmtDate, fmtWhen, ago, siteUrl, external, getJson, render */
```

and at the top of `app.js`:

```js
/* global publishView, bindPublish, loadPublish, leaveEditor */
```

---

### Task 13: The shorts editor

**Files:**
- Modify: `admin/publish.js` (replace the two stubs)
- Test: manual, in Chrome

**Interfaces:**
- Consumes: `editorBar`, `deleteCard`, `bindDrop`, `setProgress`, `upload`, `resizeImage`, `sendJson`, `toast`, `showError`, `leaveEditor`, `render`, `replaceRecord` (Task 12).
- Produces: `shortEditor(short)`, `bindShort(short, save)`, `readVideo(file)`.

- [ ] **Step 1: Replace the stubs**

```js
/**
 * Read a video file in the browser: its duration, and a poster frame from
 * half a second in (the first frame is often black), cropped to 540x960.
 * @returns {Promise<{ duration: number, poster: Blob }>}
 */
function readVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    const fail = (message) => {
      URL.revokeObjectURL(url)
      reject(new Error(message))
    }
    video.addEventListener('error', () =>
      fail('This video cannot be played in the browser. Use MP4 (H.264) or WebM.'),
    )
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(0.5, video.duration / 2)
    })
    video.addEventListener(
      'seeked',
      () => {
        const canvas = document.createElement('canvas')
        ;[canvas.width, canvas.height] = IMAGE.poster
        const ratio = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight)
        const w = video.videoWidth * ratio
        const h = video.videoHeight * ratio
        canvas.getContext('2d').drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (blob) resolve({ duration: video.duration, poster: blob })
            else reject(new Error('A poster frame could not be captured. Drop an image on the poster box instead.'))
          },
          'image/webp',
          WEBP_QUALITY,
        )
      },
      { once: true },
    )
    video.src = url
  })
}

function videoZone(short) {
  return `${
    short.video
      ? `<video src="${esc(short.video)}" poster="${esc(short.poster)}" controls playsinline preload="metadata"></video>`
      : '<span class="drop__hint">Drop a video here or click to choose.<br><small>Vertical MP4 (H.264) or WebM, up to 300 MB. MP4 plays everywhere.</small></span>'
  }
    <input type="file" accept="video/mp4,video/webm" id="ed-video-file" hidden>
    <div class="progress" hidden><div></div></div>`
}

function posterZone(short) {
  return `${
    short.poster
      ? `<img src="${esc(short.poster)}" alt="">`
      : '<span class="drop__hint">Captured from the video.<br><small>Drop an image to use your own.</small></span>'
  }
    <input type="file" accept="image/*" id="ed-poster-file" hidden>
    <div class="progress" hidden><div></div></div>`
}

function shortEditor(short) {
  return `<form class="editor" id="editor" novalidate>
    ${editorBar('shorts', short, { preview: false })}
    <div class="editor__grid">
      <div class="editor__main">
        <label class="field field--title"><span>Title</span><input id="ed-title" value="${esc(short.title)}" placeholder="One line, as it reads on the card" maxlength="200"></label>
        <section class="card">
          <h2>Video</h2>
          <div class="drop drop--video" id="ed-video" tabindex="0" role="button" aria-label="Choose the video">${videoZone(short)}</div>
          <p class="sub" id="ed-duration">${short.duration ? `Duration ${mmss(short.duration)}` : 'The duration is read from the file.'}</p>
        </section>
      </div>
      <aside class="editor__side">
        <section class="card">
          <h2>Poster</h2>
          <div class="drop drop--poster" id="ed-poster" tabindex="0" role="button" aria-label="Choose the poster image">${posterZone(short)}</div>
        </section>
        <section class="card">
          <h2>Publishing</h2>
          <p class="sub">${
            short.status === 'published'
              ? `Live in the Shorts row on ${external(siteUrl('/'), 'the home page')}.`
              : 'A draft is visible only here.'
          }</p>
          <p class="sub">Added ${esc(fmtWhen(short.createdAt))}</p>
        </section>
        ${deleteCard('shorts', 'its video and poster')}
      </aside>
    </div>
  </form>`
}

/** The video and poster drop zones. */
function bindShort(short, save) {
  const videoEl = document.getElementById('ed-video')
  const posterEl = document.getElementById('ed-poster')

  const wirePoster = () =>
    bindDrop(posterEl, document.getElementById('ed-poster-file'), async (file) => {
      try {
        setProgress(posterEl, 0)
        const blob = await resizeImage(file, IMAGE.poster)
        const { url } = await upload(blob, 'image', `${file.name.replace(/\.[^.]+$/, '')}-poster.webp`, (p) =>
          setProgress(posterEl, p),
        )
        const next = await save({ poster: url })
        posterEl.innerHTML = posterZone(next)
        posterEl.classList.remove('is-missing')
        wirePoster()
        toast('Poster replaced.')
      } catch (error) {
        setProgress(posterEl, null)
        showError(error)
      }
    })

  const wireVideo = () =>
    bindDrop(videoEl, document.getElementById('ed-video-file'), async (file) => {
      try {
        setProgress(videoEl, 0)
        const { duration, poster } = await readVideo(file)
        const base = file.name.replace(/\.[^.]+$/, '')
        const [video, art] = await Promise.all([
          upload(file, 'video', file.name, (p) => setProgress(videoEl, p)),
          upload(poster, 'image', `${base}-poster.webp`),
        ])
        const next = await save({ video: video.url, poster: art.url, duration })
        videoEl.innerHTML = videoZone(next)
        posterEl.innerHTML = posterZone(next)
        videoEl.classList.remove('is-missing')
        posterEl.classList.remove('is-missing')
        document.getElementById('ed-duration').textContent = `Duration ${mmss(next.duration)}`
        wireVideo()
        wirePoster()
        toast('Video uploaded.')
      } catch (error) {
        setProgress(videoEl, null)
        showError(error)
      }
    })

  wireVideo()
  wirePoster()
}
```

- [ ] **Step 2: Check it in the browser**

With `PORT=4310 yarn preview` running (rebuild first if the site changed), open `http://localhost:4310/admin/#shorts`:

1. **New short** opens the editor. Drop a vertical MP4 (any phone clip): the progress bar runs, the video appears and plays in the box, the duration reads under it, the poster box shows a frame from the clip. `.data/media/` has the `.mp4` and a `.webp`.
2. Drop a JPG on the poster: it replaces the frame.
3. **Publish** with no title: the title is outlined. Add one, publish. On `http://localhost:4310/` the short is first in the Shorts row with the right `m:ss`; clicking it opens the overlay and the video plays; Escape closes it and focus returns to the card; the page did not scroll while open. Check Safari if available: the video plays (the Range support at work).
4. Open `/media/<the mp4>` directly with `curl -I -H 'Range: bytes=0-1'`: 206.
5. Delete the short: the two files are gone and the home page shows the demo shorts again.
6. At 375px the editor stacks and the video box is not wider than the screen.

- [ ] **Step 3: Lint, format, commit**

```bash
yarn eslint admin/publish.js && yarn prettier --write admin/publish.js
git add admin/publish.js
git commit -m "Add the shorts editor: video upload with a captured poster and duration

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Overview warning and the docs

**Files:**
- Modify: `admin/app.js` (Overview), `CLAUDE.md`, `docs/ENVIRONMENTS.md`, `server/store.mjs` (comment only if Task 2 did not already)

- [ ] **Step 1: Warn on the Overview when live rendering is off**

In `admin/app.js` `overview()`, after the `<dl class="stats">…</dl>` block, add:

```js
    ${
      d.publishing?.renderer === 'error'
        ? `<section class="card card--accent card--critical"><h2>Publishing is not reaching the site</h2><p>The server could not load the built pages, so published stories are not showing and story pages 404. ${esc(d.publishing.rendererError)}</p><p class="sub">Run <code>yarn build</code> and restart the server.</p></section>`
        : ''
    }
```

and add two stats to the `<dl>`:

```js
      ${stat('Stories live', d.publishing ? d.publishing.stories.published : '–', '', d.publishing && d.publishing.stories.total > d.publishing.stories.published ? `${d.publishing.stories.total - d.publishing.stories.published} draft` : '', '#stories')}
      ${stat('Shorts live', d.publishing ? d.publishing.shorts.published : '–', '', '', '#shorts')}
```

- [ ] **Step 2: Update CLAUDE.md**

- Directory map: add `server/content.mjs`, `server/media.mjs`, `server/render.mjs`, `server/sanitize.mjs`, `scripts/lib/document.mjs`, `admin/publish.js`, and `src/lib/runtimeContent.js`, `src/lib/dates.js`, the two new pages, `ShortPlayer`.
- Dashboard section: a new bullet:

  > **Publish: Stories, Shorts.** Articles written in TinyMCE with a hero image, previewed as the real page, and published to "Stories by Us" and `/stories/<slug>`; vertical videos with a captured poster, published to the Shorts row and played in an overlay. Content and media live under `DATA_DIR` (`stories.json`, `shorts.json`, `media/`), never in git; `server/sanitize.mjs` rebuilds every body from an allowlist on save.

- Routes table: add `/stories` and `/stories/:slug (dynamic, rendered live)`.
- Prerendering section: a new paragraph:

  > **Three routes render at request time.** `/`, `/stories` and `/stories/<slug>` are rendered by `server/render.mjs` with the build's own SSR bundle and `scripts/lib/document.mjs`, fed the published content through `src/lib/runtimeContent.js` and an inline `#apc-runtime` JSON block that `main.jsx` reads before hydrating. The build still prerenders `/` and `/stories` (with the demo cards) as the fallback. A component that shows published content reads `getRuntimeContent()`; it must render the same on both sides, so no `new Date()` or locale formatting in that path (`src/lib/dates.js`).

- Data section: `.data/` now also holds the published content and media; the Railway volume is required.
- Tech stack bullet: `tinymce@6.8.6` (MIT; never 7+) as the one runtime dependency, served from the package through the dashboard, `unplugged` for PnP.

- [ ] **Step 3: Update `docs/ENVIRONMENTS.md`**

Add a section **Data volume** stating: both environments need a Railway volume mounted at `/data` with `DATA_DIR=/data`; it holds enquiries, the traffic tally, and now every published story, short and uploaded file; without it a redeploy erases all of them. Include the CLI:

```bash
railway volume add -m /data -e staging
railway volume add -m /data -e production
railway variables --set DATA_DIR=/data -e staging
railway variables --set DATA_DIR=/data -e production
```

- [ ] **Step 4: Format and commit**

```bash
yarn prettier --write CLAUDE.md docs/ENVIRONMENTS.md admin/app.js && yarn eslint admin/app.js
git add CLAUDE.md docs/ENVIRONMENTS.md admin/app.js
git commit -m "Document the publishing pipeline and show its state on the dashboard

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: Verification and the Railway volume

**Files:** none new.

- [ ] **Step 1: The repo gates**

```bash
yarn lint && yarn format:check && yarn test && yarn build
```

Expected: all clean; the prerender lists one document per non-dynamic route with no warnings.

- [ ] **Step 2: The server contract**

```bash
PORT=4310 yarn preview &
sleep 2
curl -s http://localhost:4310/poker-calendar/2026 | grep -c 'href="https://onraistudio.com/"'   # 1
curl -s http://localhost:4310/ | grep -c 'href="https://onraistudio.com/"'                       # 1
curl -s http://localhost:4310/stories | grep -c '<h1'                                             # 1
curl -so /dev/null -w '%{http_code}\n' http://localhost:4310/does-not-exist                       # 404
curl -so /dev/null -w '%{http_code}\n' http://localhost:4310/stories/does-not-exist               # 404
curl -so /dev/null -w '%{http_code}\n' http://localhost:4310/media/does-not-exist.webp            # 404
for p in / /stories /about /poker-calendar/2026; do curl -s http://localhost:4310$p | grep -o '<title>[^<]*' | head -1; done
```

Every route's raw HTML carries its own `<title>` and an `<h1>`.

- [ ] **Step 3: Lighthouse**

```bash
yarn dlx @lhci/cli autorun --collect.url=http://localhost:4310/ --collect.url=http://localhost:4310/poker-calendar/2026 --collect.url=http://localhost:4310/stories
```

Or use the Chrome DevTools `lighthouse_audit` tool on `/` and `/poker-calendar/2026`. Expected: performance ≥ 90, SEO ≥ 95, accessibility ≥ 90 on both. Publish one real story (through the dashboard) and run `/` and its story page again: the same bars, with "properly sized images" clean thanks to the 800px thumb. Never rebuild while Lighthouse runs (another session may be in the same checkout).

- [ ] **Step 4: Phone layout**

With the Chrome extension and a 375px iframe (see the memory note: headless `--window-size=375` lays out wider), check `/` with a published story and short, the story page, `/stories`, and the dashboard's two editors. Nothing overflows; the overlay fills the screen; the editor stacks.

- [ ] **Step 5: The Railway volume (confirm with Billy first)**

This changes production infrastructure, so ask before running. The site needs a volume at `/data` with `DATA_DIR=/data` on `staging` and `production`, or every deploy erases the published content. Use the `railway-deploy` skill. Prefer the MCP `create_volume` tool; if it is refused, the CLI in `docs/ENVIRONMENTS.md` with the workspace flag the memory note records. After it exists, update the memory note `apc-data-store-volume.md` to say the volume is in place.

- [ ] **Step 6: Final review**

Invoke `superpowers:requesting-code-review` (or the harness's `/code-review`) on the branch. Fix what is real; argue what is not. Then `superpowers:finishing-a-development-branch`.
