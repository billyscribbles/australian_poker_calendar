/* global esc, pill, pageHead, opt, fmtDate, fmtWhen, ago, siteUrl, getJson, render */
// The Publish section of the dashboard: Stories and Shorts, each a list and
// an editor. A classic script that shares the page's global scope with
// app.js, loaded BEFORE it: app.js calls loadPublish() as soon as it runs, so
// these functions must already exist, and nothing at the top level here may
// touch app.js's bindings (state, esc...) until it is called. Its own state
// lives in `pub`.
//
// render() in app.js calls publishView() for the HTML and bindPublish() to
// wire the controls; an open editor sets pub.editing so the minute refresh
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
    intro:
      'Vertical videos for the Shorts row on the home page. A published short plays in an overlay.',
    firstHint: 'Upload the first clip: a vertical video and a title.',
  },
}
const PUB_IMAGE = { hero: [1600, 900], thumb: [800, 450], body: [1200, 0], poster: [540, 960] }
const PUB_WEBP_QUALITY = 0.85
const PUB_UPLOAD_ERRORS = {
  size: 'That file is over the size limit: 10 MB for an image, 300 MB for a video.',
  type: 'That is not a format the site can use. Images: JPG, PNG, GIF or WebP. Video: MP4 or WebM.',
  kind: 'That is the wrong kind of file for this slot.',
}
const PUB_FIELD_LABELS = {
  title: 'a title',
  heroImage: 'a hero image',
  video: 'a video',
  poster: 'a poster',
}
const PUB_FIELD_IDS = {
  title: 'ed-title',
  heroImage: 'ed-hero',
  video: 'ed-video',
  poster: 'ed-poster',
}

const pub = {
  stories: [],
  shorts: [],
  filters: { q: '', show: '' },
  editing: null, // { kind, id, dirty } while an editor is open
}

// ---------------------------------------------------------------- helpers

const statusPill = (r) =>
  r.status === 'published' ? pill('good', 'Published') : pill('neutral', 'Draft')
const storyUrl = (s) => `/stories/${s.slug}`
const mmss = (seconds) => {
  const total = Math.round(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
const recordById = (kind, id) => pub[kind].find((r) => r.id === id)

function replaceRecord(kind, record) {
  const i = pub[kind].findIndex((r) => r.id === record.id)
  if (i === -1) pub[kind].unshift(record)
  else pub[kind][i] = record
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
  if (!res.ok) {
    throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data })
  }
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
      if (xhr.status === 401) {
        location.replace('./')
        return
      }
      let data = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = {}
      }
      if (xhr.status === 201) resolve(data)
      else reject(new Error(PUB_UPLOAD_ERRORS[data.error] || `The upload failed (${xhr.status}).`))
    })
    xhr.addEventListener('error', () =>
      reject(new Error('The upload failed. Check the connection and try again.')),
    )
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
      PUB_WEBP_QUALITY,
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
  zone.onclick = (e) => {
    if (e.target.closest('video, a, button')) return
    input.click()
  }
  zone.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      input.click()
    }
  }
  input.onchange = () => {
    if (input.files[0]) onFile(input.files[0])
    input.value = ''
  }
  zone.ondragover = (e) => {
    e.preventDefault()
    zone.classList.add('is-over')
  }
  zone.ondragleave = () => zone.classList.remove('is-over')
  zone.ondrop = (e) => {
    e.preventDefault()
    zone.classList.remove('is-over')
    const file = e.dataTransfer?.files?.[0]
    if (file) onFile(file)
  }
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

// eslint-disable-next-line no-unused-vars -- called from app.js
async function loadPublish() {
  const [stories, shorts] = await Promise.all([getJson('api/stories'), getJson('api/shorts')])
  pub.stories = stories.items
  pub.shorts = shorts.items
}

/** True while an editor for this page is open, so render() leaves it alone. */
// eslint-disable-next-line no-unused-vars -- called from app.js
function editorOpen(page, param) {
  return Boolean(
    pub.editing &&
    pub.editing.kind === page &&
    pub.editing.id === param &&
    document.getElementById('editor'),
  )
}

/** Tears down an open editor: TinyMCE, the unsaved-changes guard, the flag. */
function leaveEditor() {
  if (window.tinymce) window.tinymce.remove()
  window.onbeforeunload = null
  pub.editing = null
}

/** The nav badge: how many drafts are waiting. */
// eslint-disable-next-line no-unused-vars -- called from app.js
function draftBadge(kind) {
  const drafts = pub[kind].filter((r) => r.status === 'draft').length
  return drafts ? `<span class="badge">${drafts}</span>` : ''
}

// ------------------------------------------------------------------ lists

// eslint-disable-next-line no-unused-vars -- called from app.js
function publishView(kind, param) {
  if (!param) return publishList(kind)
  const record = recordById(kind, param)
  if (!record) {
    return `${pageHead(PUBLISH[kind].title)}<p class="error">There is no ${PUBLISH[kind].one} with that id. <a href="#${kind}">Back to ${PUBLISH[kind].title}</a></p>`
  }
  return kind === 'stories' ? storyEditor(record) : shortEditor(record)
}

// eslint-disable-next-line no-unused-vars -- called from app.js
function bindPublish(kind, param) {
  if (!param) {
    bindPublishList(kind)
    return
  }
  const record = recordById(kind, param)
  if (record) bindEditor(kind, record)
}

function publishList(kind) {
  const spec = PUBLISH[kind]
  const f = pub.filters
  const all = pub[kind]
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
  const when = (r) =>
    kind === 'stories'
      ? esc(fmtDate(r.date))
      : r.duration
        ? mmss(r.duration)
        : '<span class="na">–</span>'
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
          <td>${when(r)}</td>
          <td><span title="${esc(fmtWhen(r.updatedAt))}">${esc(ago(r.updatedAt))}</span></td>
          <td class="nowrap">${
            kind === 'stories' && r.status === 'published'
              ? external(siteUrl(storyUrl(r)), 'View on site')
              : ''
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
    pub.filters[key] = value
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
        <span class="editor__saved" id="ed-saved" role="status"></span>
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
        <div class="field"><label for="ed-body">Body</label><textarea id="ed-body" rows="18">${esc(story.body)}</textarea></div>
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
  pub.editing = { kind, id: record.id, dirty: false }
  const spec = PUBLISH[kind]
  const api = `${spec.api}/${record.id}`
  const $ = (id) => document.getElementById(id)
  const saved = $('ed-saved')
  const markDirty = () => {
    if (!pub.editing) return
    pub.editing.dirty = true
    saved.textContent = 'Unsaved changes'
    document.querySelectorAll('.is-missing').forEach((el) => el.classList.remove('is-missing'))
  }
  for (const id of ['ed-title', 'ed-standfirst', 'ed-alt', 'ed-date', 'ed-slug']) {
    $(id)?.addEventListener('input', markDirty)
  }
  // Enter in a text field must not submit the form and reload the page.
  $('editor').addEventListener('submit', (e) => e.preventDefault())
  window.onbeforeunload = () => (pub.editing?.dirty ? true : undefined)

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
            resizeImage(blobInfo.blob(), PUB_IMAGE.body)
              .then((blob) => upload(blob, 'image', blobInfo.filename(), progress))
              .then((r) => r.url),
          setup: (ed) => ed.on('change input undo redo', markDirty),
        }),
      )
      .then((editors) => {
        editor = editors?.[0] || null
      })
      .catch((error) => {
        $('ed-body')?.addEventListener('input', markDirty)
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
    if (pub.editing) pub.editing.dirty = false
    saved.textContent = `Saved ${new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
    if ($('ed-slug') && $('ed-slug').value !== next.slug) $('ed-slug').value = next.slug
    return next
  }

  $('ed-save').addEventListener('click', () => save().catch(showError))

  $('ed-preview')?.addEventListener('click', async () => {
    // Open the tab inside the click so the popup blocker allows it, then
    // point it at the preview once the draft is saved.
    const tab = window.open('about:blank', '_blank')
    try {
      await save()
      const href = `preview/stories/${record.id}`
      if (tab) tab.location.href = href
      else window.open(href, '_blank')
    } catch (error) {
      tab?.close()
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
      toast(
        action === 'publish'
          ? `Published. The ${spec.one} is live on the site.`
          : 'Unpublished. It is a draft again.',
      )
    } catch (error) {
      if (error.status === 422) {
        const missing = error.data.missing || []
        for (const key of missing) {
          $(PUB_FIELD_IDS[key])?.closest('.field, .drop')?.classList.add('is-missing')
        }
        toast(
          `Add ${missing.map((k) => PUB_FIELD_LABELS[k] || k).join(' and ')} before publishing.`,
          'critical',
        )
      } else showError(error)
    }
  })

  bindDelete(kind, record.id, api)
  if (kind === 'stories') bindHero(save)
  else bindShort(save)
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
          pub[kind] = pub[kind].filter((r) => r.id !== id)
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
function bindHero(save) {
  const zone = document.getElementById('ed-hero')
  bindDrop(zone, document.getElementById('ed-hero-file'), async (file) => {
    try {
      setProgress(zone, 0)
      const [hero, thumb] = await Promise.all([
        resizeImage(file, PUB_IMAGE.hero),
        resizeImage(file, PUB_IMAGE.thumb),
      ])
      const base = file.name.replace(/\.[^.]+$/, '')
      const [big, small] = await Promise.all([
        upload(hero, 'image', `${base}.webp`, (p) => setProgress(zone, p)),
        upload(thumb, 'image', `${base}-thumb.webp`),
      ])
      const next = await save({ heroImage: big.url, heroThumb: small.url })
      zone.innerHTML = heroZone(next)
      zone.classList.remove('is-missing')
      bindHero(save) // the input was replaced with the zone's contents
      toast('Hero image uploaded.')
    } catch (error) {
      setProgress(zone, null)
      showError(error)
    }
  })
}

// ------------------------------------------------------------------ shorts

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
        ;[canvas.width, canvas.height] = PUB_IMAGE.poster
        const ratio = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight)
        const w = video.videoWidth * ratio
        const h = video.videoHeight * ratio
        canvas
          .getContext('2d')
          .drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (blob) resolve({ duration: video.duration, poster: blob })
            else {
              reject(
                new Error(
                  'A poster frame could not be captured. Drop an image on the poster box instead.',
                ),
              )
            }
          },
          'image/webp',
          PUB_WEBP_QUALITY,
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
function bindShort(save) {
  const videoEl = document.getElementById('ed-video')
  const posterEl = document.getElementById('ed-poster')

  const wirePoster = () =>
    bindDrop(posterEl, document.getElementById('ed-poster-file'), async (file) => {
      try {
        setProgress(posterEl, 0)
        const blob = await resizeImage(file, PUB_IMAGE.poster)
        const name = `${file.name.replace(/\.[^.]+$/, '')}-poster.webp`
        const { url } = await upload(blob, 'image', name, (p) => setProgress(posterEl, p))
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
