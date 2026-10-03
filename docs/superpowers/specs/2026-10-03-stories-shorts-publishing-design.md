# Stories and Shorts publishing — design

**Date:** 2026-10-03
**Status:** approved in conversation, awaiting spec review

## What this is

A publishing section in the `/admin` dashboard. An editor writes an article in
TinyMCE with a hero image, previews it as the page visitors will see, and
publishes it. Published articles appear under **Stories by Us** on the home
page and get their own page on the site. A second editor uploads a short
vertical video that appears under **Shorts** on the home page and plays in an
overlay when clicked.

Publishing is instant: content lives in the server's data store (the same
`DATA_DIR` as enquiries and traffic), not in git, and no deploy is involved.
The site still ships every page as real HTML: the server renders the affected
pages at request time with the build's own prerender bundle.

Decisions made with Billy on 2026-10-03:

- Instant publishing from the dashboard, content on the data volume. Not
  committed to the repo.
- A short plays in an overlay on the home page. No page per short.
- Published items replace the demo cards. While a section has nothing
  published, its demo cards stay so the home page never goes empty.

## Out of scope

Author bylines, categories or tags, scheduled publishing, comments, a page per
short, third-party embeds (YouTube etc.) in the body, server-side image
processing, more than one editor account. None were asked for; all can be
added later without undoing anything here.

---

## 1. Content and files

Everything lives under `DATA_DIR` (`.data/` locally, the Railway volume in
production). `server/store.mjs` keeps enquiries and traffic as it does now; a
new `server/content.mjs` owns the publishing records and media, created by
`createStore()` and exposed as `store.content` so the existing wiring
(`server/index.mjs`, `vite.config.js`, `admin/server.mjs`, tests) passes one
object around.

```
.data/
├── stories.json        every story, drafts included
├── shorts.json         every short, drafts included
└── media/              uploads: <id>.<ext>, names never reused
```

### Story record

| field          | notes                                                              |
| -------------- | ------------------------------------------------------------------ |
| `id`           | random, stable; the dashboard's handle                             |
| `slug`         | from the title; editable while a draft; locked once published      |
| `title`        | required to publish                                                |
| `date`         | `YYYY-MM-DD`, shown on the card and page; defaults to today        |
| `standfirst`   | one or two sentences; the page's intro and meta description        |
| `heroImage`    | `/media/<file>`, 1600px wide WebP; required to publish             |
| `heroThumb`    | `/media/<file>`, 800px wide WebP, for the card                     |
| `heroAlt`      | alt text; defaults to the title                                    |
| `body`         | sanitised HTML from TinyMCE                                        |
| `status`       | `draft` or `published`                                             |
| `createdAt`, `updatedAt`, `publishedAt` | ISO timestamps                                   |

### Short record

| field       | notes                                                            |
| ----------- | ---------------------------------------------------------------- |
| `id`, `slug`, `title`, `status`, timestamps | as for a story                                |
| `video`     | `/media/<file>`, MP4 or WebM, up to 300 MB; required to publish  |
| `poster`    | `/media/<file>`, 540×960 WebP; required to publish               |
| `duration`  | seconds, read from the file in the browser; card shows `m:ss`    |

### Rules

- Slugs are lower-case ASCII with hyphens, unique within their list; a clash
  gets a numeric suffix. A published slug cannot change, because its URL is
  out in the world.
- Publishing requires the fields marked required. The API refuses otherwise
  and the dashboard says which field is missing.
- Deleting a record deletes the media files that record alone refers to
  (hero, thumb, video, poster). Images inside a body are left alone; an
  orphan sweep is not part of this.
- Files are written through a temp file and renamed, like the store does now,
  so a crash never leaves half a JSON file.
- `store.content.version` increments on every change. The renderer's cache
  keys on it.
- `store.content.publicContent()` returns `{ stories, shorts }`: published
  only, newest first by `date` then `publishedAt`. This is the one shape the
  site ever sees.

### Uploads

`PUT /admin/api/media?kind=image|video` with the raw file as the body and the
original name in `X-File-Name`. The server streams the body straight to
`media/<id>.<ext>` (never buffered in memory), sniffs the type from the first
bytes (PNG, JPEG, GIF, WebP; MP4 via the `ftyp` box; WebM via the EBML
header), refuses anything else with a 415, and caps images at 10 MB and video
at 300 MB with a 413. A refused upload is removed from disk. Response:
`{ url: '/media/<file>', bytes }`.

The dashboard does the image work in the browser before uploading, so the
server needs no image library:

- a story hero is resized on a canvas to 1600px wide and 800px wide, both
  encoded as WebP at quality 0.85, and uploaded as two files;
- an image inserted into the body through TinyMCE is resized to 1200px wide;
- a short's poster is captured from the video's first frame (or an uploaded
  image) and scaled to 540×960.

Video is uploaded as it is; no transcoding. The UI says MP4 (H.264) plays
everywhere.

### Serving media

`server/index.mjs` serves `/media/<file>` from `DATA_DIR/media` with the
existing security headers, a 30-day cache (names are unique, so a file never
changes behind its URL), and **HTTP Range support**. Safari refuses to play a
video from a server that answers a Range request with the whole file, so this
is not optional. Directory traversal is refused the same way `safeJoin` does
for `dist/`.

---

## 2. The site

### Routes

Two entries join `src/routes.js`:

| path             | page             | notes                                             |
| ---------------- | ---------------- | ------------------------------------------------- |
| `/stories`       | `StoriesPage`    | prerendered at build (with the demo cards), rendered live in production |
| `/stories/:slug` | `StoryPage`      | `dynamic: true`: never prerendered, no sitemap entry at build; the server renders it |

`matchRoute()` learns to match a `:param` segment so `preloadRoute()` and
`routeModules()` resolve the story page's chunk, and `PRERENDER_ROUTES`
leaves `dynamic` routes out. `src/test/routes.test.js` pins both.

### Runtime content

`src/lib/runtimeContent.js` holds `{ stories, shorts }` in module state with
`setRuntimeContent()` and `getRuntimeContent()`. Both sides set it before
rendering:

- **Server.** `src/entry-prerender.jsx` re-exports `setRuntimeContent`. The
  server calls it with `publicContent()` before `render(path)`.
- **Browser.** The server writes the same JSON into the document as
  `<script id="apc-runtime" type="application/json">` (with `<` escaped as
  `<`). `src/main.jsx` reads and sets it before `hydrateRoot`, so the
  first client render matches the server's. A document without the block
  (a build-time prerender, `yarn dev`'s shell) means empty runtime content.
- **Dev server.** The `site-admin` Vite plugin injects the same block through
  `transformIndexHtml` from the store, and serves `/media/*`, so `yarn dev`
  shows published content too (client-rendered, as everything is in dev).

The components pick: published items when there are any, demo items from
the content file otherwise. All strings (headings, "Read the story", the
overlay's close label, the index intro, the empty state) live in
`src/content/stories.js` and `src/content/shorts.js`; the demo items stay
there under `demo`.

### Stories by Us

The home grid shows the latest eight published stories. A published card is
a link to `/stories/<slug>`, with the thumb, the date as "2 Oct" and the
title. Demo cards keep their current non-linking markup. The section heading
links to `/stories` when there is published content.

### Story page

Article column: hero image (the 1600px file, `fetchpriority="high"`), the
date in full, the title as the `h1`, the standfirst, then the body in a
`.prose` block whose CSS covers everything the sanitiser lets through
(headings, lists, links, images with captions, tables, blockquotes, code).
Below: a "More stories" row of up to three other published stories, and a
link back to `/stories`. SEO via the existing `SEO` component: title,
standfirst as description, canonical, `og:type article`, the hero as
`og:image`, and `NewsArticle` JSON-LD (`headline`, `datePublished`,
`dateModified`, `image`, publisher from `site.config`) from a new
`articleLd()` in `src/lib/structuredData.js`.

An unknown or unpublished slug is a 404: the server never renders it, and
the client route renders `NotFoundPage` for it on a client-side navigation.

### Stories index

`/stories`: heading and intro from the content file, then every published
story as cards, newest first. Empty state text while there are none.

### Shorts

The home row shows the latest eight published shorts: poster, duration badge,
play icon, title. A published card is a `<button>` that opens `ShortPlayer`,
a `<dialog>`-based overlay with the video (`controls autoplay playsinline`),
the title and a close button. Escape and the backdrop close it, body scroll
is locked while it is open, focus returns to the card. It mounts only while
open, so nothing hidden ships in the HTML. Demo cards keep their current
markup.

### Sitemap

The server answers `/sitemap.xml` itself: it reads the built file and inserts
one `<url>` per published story (`<lastmod>` from `updatedAt`) before
`</urlset>`. Cached with the same version key as the pages.

---

## 3. Server rendering

### Shared document assembly

The document-building half of `scripts/prerender.mjs` (`assetsFor`,
`buildDocument`, the studio-credit and hidden-content assertions, the
fallback-marker swap, the theme-token inline) moves to
`scripts/lib/document.mjs` as `createDocumentBuilder({ template, manifest,
themeStyles })`. The prerender script keeps its loop, its og:image check and
its sitemap writing and calls the builder. Behaviour at build is unchanged.

### `server/render.mjs`

`createRenderer({ dist, store })`:

- At boot, imports `.prerender/entry-prerender.js` (the SSR bundle `yarn
  build` already writes; Railway builds in the same container so it is
  present), awaits `prepare()`, reads `dist/app-shell.html` as the template
  and `dist/.vite/manifest.json`, and creates the document builder.
- `page(path)` returns the HTML for `/`, `/stories` or a published
  `/stories/<slug>`, or `null` for anything else. It sets the runtime
  content, renders, builds the document, appends the runtime JSON block
  before `</head>`, and caches the result in a `Map` keyed on
  `${store.content.version}:${path}`. A publish therefore invalidates
  everything at once, and the next request re-renders in a few
  milliseconds.
- `sitemap()` as above.
- `preview(story)` renders a draft or published story's page the same way,
  then removes the `<script type="module">` and `modulepreload` tags and adds
  a small fixed bar reading "Preview. Close this tab to go back." The result
  is static HTML with the site's real CSS: exactly what a visitor sees, with
  nothing to hydrate (the preview URL does not match the client router).

If the SSR bundle is missing or fails to load, the server logs the error
once and falls back to the static documents: the home page and `/stories`
show demo content and story pages 404. The dashboard's Overview shows a
warning in that case.

### `server/index.mjs`

In request order, after the forms API and the dashboard:

1. `/media/<file>`: serve from the data store (Range, 30-day cache).
2. `/sitemap.xml`: the renderer's version when it has one.
3. The existing legacy-redirect, trailing-slash and static-file steps.
4. Before the prerendered lookup: `renderer.page(pathname)`; when it returns
   HTML, serve it with the document headers (CSP, `must-revalidate`, ETag
   from the version and path) and record the view.
5. The prerendered documents and the 404, as now.

---

## 4. The dashboard

### Where it lives

A new sidebar group **Publish** with **Stories** and **Shorts**. Hash routes:
`#stories`, `#stories/new`, `#stories/<id>`, `#shorts`, `#shorts/new`,
`#shorts/<id>`. The views and their bindings go in a new `admin/publish.js`
and `admin/publish.css`, loaded by `admin/index.html` after `app.js`, so the
existing 1300-line files do not grow. `admin/handler.mjs` adds them to its
file table.

### TinyMCE

`tinymce@^6.8` as a runtime dependency. TinyMCE 7 moved to GPL-2.0-or-later or
a paid licence; 6.8 is MIT and has everything needed. The dashboard serves
it from the package at `/admin/vendor/tinymce/<path>` (behind the gate, paths
confined to that package directory), so there is no cloud key and nothing
leaves the server. Plugins: lists, link, image, table, code, autolink,
autoresize. Toolbar: blocks (paragraph, headings 2 to 4), bold, italic,
underline, strikethrough, link, image, lists, blockquote, table, align,
remove formatting, source. Images use `images_upload_handler` pointing at the
media endpoint, so an inserted or pasted image is resized and uploaded, never
embedded as base64. The editor's content CSS reuses the site's `.prose`
rules so spacing matches the page.

### Story list

Title, status pill (Draft or Published), date, last edited; search box and a
status filter; "New story". Each row opens the editor; a published row also
links to the live page.

### Story editor

Fields: Title, Date, Address (the slug, editable until published), Standfirst,
Hero image (drop zone showing the current image, alt text under it), Body
(TinyMCE). Buttons: **Save draft**, **Preview**, **Publish** (or
**Unpublish** when live), **Delete** (confirms inline, not with a browser
dialog). Save is also triggered before Preview and Publish. An unsaved change
marks the page and warns on leaving. A publish that fails validation shows
which field is missing next to it.

Preview opens `/admin/preview/stories/<id>` in a new tab.

### Shorts list and editor

List: poster thumbnail, title, duration, status, date. Editor: Title, Video
(drop zone; after choosing a file the browser reads its duration and grabs a
poster frame), Poster (shows the captured frame; drop an image to replace
it), the same Save draft / Publish / Unpublish / Delete. A short has no
preview button: the editor plays the uploaded video itself.

### API (all behind the existing gate, JSON unless noted)

```
GET    api/stories                 all stories, newest first
POST   api/stories                 create a draft; returns the record
GET    api/stories/<id>
PUT    api/stories/<id>            update fields (body sanitised on the way in); 2 MB cap
POST   api/stories/<id>/publish    validates, sets status; 422 with the missing fields
POST   api/stories/<id>/unpublish
DELETE api/stories/<id>
                                   the same six for api/shorts
PUT    api/media?kind=image|video  raw body upload, see §1
GET    preview/stories/<id>        static HTML preview
GET    vendor/tinymce/<path>       the editor's files
```

`api/status` gains `publishing: { ok, stories, shorts }` so the Overview can
show counts and the renderer warning.

---

## 5. Safety

- **Sanitiser.** `server/sanitize.mjs`, no dependencies: a small tokenizer
  that walks the body HTML and rebuilds it from an allowlist. Tags: `p`,
  `h2`–`h4`, `strong`, `em`, `u`, `s`, `a`, `ul`, `ol`, `li`, `blockquote`,
  `img`, `figure`, `figcaption`, `br`, `hr`, `table`, `thead`, `tbody`, `tr`,
  `th`, `td`, `pre`, `code`, `sub`, `sup`. Attributes: `href` (http, https,
  mailto or a site-relative path; external links get
  `rel="noopener noreferrer"` and `target="_blank"`), `src` (a `/media/`
  path or https; `data:` is dropped), `alt`, `width`, `height`, `colspan`,
  `rowspan`, and `style` only when it is exactly a `text-align` rule. Every
  other tag, attribute, comment and processing instruction is removed; text
  is re-escaped. Runs on every save, so nothing unsanitised is ever stored.
- **CSP.** Unchanged. `script-src 'self'` already blocks inline scripts on the
  site, so a sanitiser miss cannot run code. The runtime JSON block is
  `type="application/json"` and is never executed.
- **Dashboard gate.** Every new endpoint sits behind the same sign-in and
  loopback rules as the existing API. Uploads and the preview included.
- **Uploads.** Type by bytes, not by name or header; size caps enforced while
  streaming; a refused file is unlinked; names are server-generated so a
  client cannot pick a path.
- **Media serving.** Only files directly in `media/`, by basename; Range
  requests validated (416 on a bad range).

---

## 6. Testing

New and changed tests in `src/test/`:

- `contentStore.test.js`: create, update, slug derivation and clashes,
  slug lock after publish, publish validation, delete removes the record and
  its own files, `publicContent()` ordering and filtering, `version` bumps.
- `sanitize.test.js`: allowed markup survives unchanged, scripts and event
  handlers and `javascript:` hrefs and `data:` images are dropped, external
  links get `rel`, `style` keeps only `text-align`, malformed HTML does not
  throw.
- `admin.test.js`: the new endpoints 401 when signed out; create, update,
  publish (422 on a missing field), unpublish, delete; media upload accepts a
  real PNG and MP4 header, refuses a renamed text file (415) and an oversize
  body (413) and leaves no file behind; preview returns HTML with no module
  scripts; TinyMCE files are served and a traversal path is refused.
- `media.test.js`: `/media/<file>` serves whole and partial content, 416 on
  a bad range, 404 outside the folder.
- `render.test.js`: with a fake `render()` and a fixture template and
  manifest, the document carries the runtime JSON block, the cache keys on
  the version, unknown paths return `null`, the preview strips the module
  scripts, the sitemap gains a `<url>` per published story.
- `routes.test.js`: `:slug` matching and the `dynamic` exclusion.
- `home.test.jsx`: demo cards render when runtime content is empty;
  published stories render as links and published shorts as buttons that
  open the overlay; the overlay closes on Escape.
- `storyPage.test.jsx`: renders the hero, title, standfirst, body, JSON-LD
  and the more-stories row; an unknown slug renders the 404 page; axe clean.
- `document.test.js`: the extracted builder behaves as the prerender did
  (fallback swap, asset links, credit assertion).

The build keeps every current check: `/` and `/stories` prerender with demo
content, the credit and hidden-content assertions run on them, and the
dynamic story route is simply not in the loop.

---

## 7. Docs, deploy and follow-ups

- `CLAUDE.md`: the Dashboard section gains Publish; the directory map gains
  `server/content.mjs`, `server/render.mjs`, `server/sanitize.mjs`,
  `scripts/lib/document.mjs`, `admin/publish.js`; the prerender section gets
  a paragraph on live-rendered routes; the data note says stories, shorts and
  media live in `DATA_DIR` and are not in git.
- `server/store.mjs` and `server/content.mjs` header comments describe the
  layout.
- `docs/ENVIRONMENTS.md`: the volume is now required, not advisable.
- **Railway:** mount a volume at `/data` and set `DATA_DIR=/data` on staging
  and production before this ships, or every deploy wipes the articles. This
  is a deploy step in the plan, done with the `railway-deploy` skill.
- The memory note about the data volume is updated once the volume exists.
