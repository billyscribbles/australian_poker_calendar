// The site's own little database: enquiries from the two forms and a daily
// traffic tally, as JSON files under DATA_DIR (default .data/ in the repo,
// ignored by git). The admin dashboard reads both; server/index.mjs writes
// them. No dependencies, and nothing here identifies a visitor: traffic keeps
// a per-day salted hash to count unique visitors, never an address.
//
// On Railway, mount a volume and point DATA_DIR at it, or every deploy starts
// from an empty folder.
//
//   .data/
//   ├── salt                  random, generated once, keys the visitor hashes
//   ├── enquiries.json        every submission, newest last
//   └── traffic/2026-10-03.json   one tally per Melbourne day

import { createHash, randomBytes } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const FORMS = new Set(['contact', 'venue'])
const MAX_FIELD = 4000
const MAX_ENQUIRIES = 5000
const CRAWLER =
  /bot|crawl|spider|slurp|lighthouse|headless|preview|fetch|monitor|curl|wget|python|java|go-http|facebookexternalhit|whatsapp|telegram|discord|skype|slack/i

/** Today in Melbourne, as YYYY-MM-DD. */
export function melbourneToday(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
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

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const clip = (s) => String(s ?? '').slice(0, MAX_FIELD)

/**
 * @param {object} [options]
 * @param {string} [options.dir]  where the files live; DATA_DIR or .data/
 */
export function createStore({ dir = process.env.DATA_DIR || join(ROOT, '.data') } = {}) {
  const enquiriesFile = join(dir, 'enquiries.json')
  const trafficDir = join(dir, 'traffic')
  const saltFile = join(dir, 'salt')

  let salt = ''
  function getSalt() {
    if (salt) return salt
    salt = existsSync(saltFile) ? readFileSync(saltFile, 'utf8').trim() : ''
    if (!salt) {
      salt = randomBytes(16).toString('hex')
      mkdirSync(dir, { recursive: true })
      writeFileSync(saltFile, salt)
    }
    return salt
  }

  // -------------------------------------------------------------- enquiries

  function readEnquiries() {
    const list = readJson(enquiriesFile, [])
    return Array.isArray(list) ? list : []
  }

  /**
   * Saves one form submission.
   * @param {{form: string, fields: Record<string, string>, files?: string[], page?: string}} input
   * @returns {object|null} the saved record, or null when the form is unknown
   *   or has nothing to say
   */
  function addEnquiry({ form, fields = {}, files = [], page = '' }) {
    if (!FORMS.has(form)) return null
    const message = clip(fields.message).trim()
    const email = clip(fields.email).trim()
    if (!message && !email) return null
    const record = {
      id: `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`,
      receivedAt: new Date().toISOString(),
      form,
      name: clip(fields.name || fields.venue).trim(),
      email,
      message,
      subject: clip(fields._subject).trim(),
      topic: clip(fields.topic).trim(),
      files: files.slice(0, 20).map((f) => clip(f).slice(0, 200)),
      page: clip(page).slice(0, 300),
      emailed: false,
      handled: false,
    }
    const list = readEnquiries()
    list.push(record)
    writeJson(enquiriesFile, list.slice(-MAX_ENQUIRIES))
    return record
  }

  /** Newest first. */
  function listEnquiries() {
    return readEnquiries().reverse()
  }

  /** Flips one field (handled, emailed) on a record; null when there is none. */
  function updateEnquiry(id, patch) {
    const list = readEnquiries()
    const record = list.find((e) => e.id === id)
    if (!record) return null
    if (typeof patch.handled === 'boolean') record.handled = patch.handled
    if (typeof patch.emailed === 'boolean') record.emailed = patch.emailed
    writeJson(enquiriesFile, list)
    return record
  }

  // ---------------------------------------------------------------- traffic

  // Today's tally lives in memory and is written a few seconds after it
  // changes, so a busy minute is one write, not hundreds. flush() is sync for
  // the shutdown hook.
  const days = new Map() // date -> tally
  let dirty = new Set()
  let timer = null

  function dayFile(date) {
    return join(trafficDir, `${date}.json`)
  }

  function tallyFor(date) {
    if (!days.has(date)) {
      const t = readJson(dayFile(date), null) || {
        views: 0,
        crawlers: 0,
        pages: {},
        referrers: {},
        visitors: [],
      }
      t.visitorSet = new Set(t.visitors)
      days.set(date, t)
    }
    return days.get(date)
  }

  function flush() {
    if (timer) clearTimeout(timer)
    timer = null
    for (const date of dirty) {
      const t = days.get(date)
      if (!t) continue
      const { visitorSet, ...rest } = t
      writeJson(dayFile(date), { ...rest, visitors: [...visitorSet] })
    }
    dirty = new Set()
    // Keep only today and yesterday hot; the rest reads from disk on demand.
    const keep = new Set([melbourneToday(), addDays(melbourneToday(), -1)])
    for (const date of days.keys()) if (!keep.has(date)) days.delete(date)
  }

  function scheduleFlush() {
    if (timer) return
    timer = setTimeout(flush, 5000)
    timer.unref?.()
  }

  /**
   * Counts one page view. Call it for HTML documents only, never assets.
   * @param {{path: string, referrer?: string, host?: string, ip?: string, ua?: string, today?: string}} hit
   */
  function recordView({ path, referrer = '', host = '', ip = '', ua = '', today }) {
    const date = today || melbourneToday()
    const t = tallyFor(date)
    if (CRAWLER.test(ua)) {
      t.crawlers += 1
    } else {
      t.views += 1
      t.pages[path] = (t.pages[path] || 0) + 1
      const from = referrerHost(referrer, host)
      if (from) t.referrers[from] = (t.referrers[from] || 0) + 1
      const hash = createHash('sha256')
        .update(`${getSalt()}|${date}|${ip}|${ua}`)
        .digest('hex')
        .slice(0, 16)
      t.visitorSet.add(hash)
    }
    dirty.add(date)
    scheduleFlush()
  }

  function referrerHost(referrer, host) {
    if (!referrer) return ''
    try {
      const from = new URL(referrer).hostname.replace(/^www\./, '')
      return from && from !== host.replace(/^www\./, '').split(':')[0] ? from : ''
    } catch {
      return ''
    }
  }

  function readDay(date) {
    const hot = days.get(date)
    if (hot) return { ...hot, visitors: hot.visitorSet.size }
    const t = readJson(dayFile(date), null)
    return t ? { ...t, visitors: (t.visitors || []).length } : null
  }

  /**
   * The last `days` days, oldest first, with the period's top pages and
   * referrers. Days with no file read as zero so the chart has no gaps.
   */
  function traffic({ days: span = 30, today } = {}) {
    const end = today || melbourneToday()
    const start = addDays(end, 1 - span)
    const series = []
    const pages = {}
    const referrers = {}
    const totals = { views: 0, visitors: 0, crawlers: 0 }
    for (let i = 0; i < span; i += 1) {
      const date = addDays(start, i)
      const t = readDay(date) || { views: 0, visitors: 0, crawlers: 0, pages: {}, referrers: {} }
      series.push({ date, views: t.views, visitors: t.visitors, crawlers: t.crawlers || 0 })
      totals.views += t.views
      totals.visitors += t.visitors
      totals.crawlers += t.crawlers || 0
      for (const [p, n] of Object.entries(t.pages || {})) pages[p] = (pages[p] || 0) + n
      for (const [r, n] of Object.entries(t.referrers || {})) referrers[r] = (referrers[r] || 0) + n
    }
    const top = (obj, key) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([k, views]) => ({ [key]: k, views }))
    let firstDay = ''
    if (existsSync(trafficDir)) {
      firstDay =
        readdirSync(trafficDir)
          .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
          .sort()[0]
          ?.slice(0, 10) || ''
    }
    return {
      from: start,
      to: end,
      firstDay,
      totals,
      days: series,
      pages: top(pages, 'path'),
      referrers: top(referrers, 'host'),
    }
  }

  return { dir, addEnquiry, listEnquiries, updateEnquiry, recordView, traffic, flush }
}
