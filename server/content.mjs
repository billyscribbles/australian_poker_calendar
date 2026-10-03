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

/** Write via a temp file so a crash mid-write never leaves half a file. */
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
export function createContentStore({
  dir = process.env.DATA_DIR || join(process.cwd(), '.data'),
} = {}) {
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

    /** True when `slug` is what `title` derives to, with or without a clash suffix. */
    function derivedFrom(slug, title) {
      const base = slugify(title) || spec.fallbackSlug
      return slug === base || new RegExp(`^${base}-\\d+$`).test(slug)
    }

    /**
     * Copies the fields a caller may set onto `record`, cleaned. While a
     * draft, the slug follows the title unless the caller sets a different
     * one; once published it is locked, because the URL is out in the world.
     */
    function apply(record, fields, list) {
      const was = { title: record.title, slug: record.slug }
      for (const [key, max] of Object.entries(spec.text)) {
        if (typeof fields[key] === 'string') record[key] = fields[key].trim().slice(0, max)
      }
      for (const key of spec.media) {
        if (typeof fields[key] === 'string') {
          record[key] = MEDIA_URL.test(fields[key]) ? fields[key] : ''
        }
      }
      if (kind === 'story') {
        if (typeof fields.body === 'string') record.body = sanitizeHtml(fields.body)
        if (typeof fields.date === 'string' && DATE.test(fields.date)) record.date = fields.date
      }
      if (kind === 'short' && fields.duration !== undefined) {
        const seconds = Math.round(Number(fields.duration))
        record.duration = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
      }
      if (record.status !== 'published') {
        const asked = typeof fields.slug === 'string' ? slugify(fields.slug) : ''
        if (asked && asked !== was.slug) record.slug = uniqueSlug(list, fields.slug, record.id)
        else if (record.title !== was.title && derivedFrom(was.slug, was.title)) {
          record.slug = uniqueSlug(list, record.title, record.id)
        }
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
    // Newest first, for the dashboard's lists.
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
