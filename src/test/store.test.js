// Contract: the store under DATA_DIR keeps every form submission and a daily
// traffic tally, survives a restart, and never writes a visitor's address.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../../server/store.mjs'

let dir
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'apc-store-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('enquiries', () => {
  it('saves a submission and lists newest first', () => {
    const store = createStore({ dir })
    const a = store.addEnquiry({
      form: 'contact',
      fields: { name: 'Ada', email: 'ada@example.com', message: 'Hello' },
      page: 'https://example.com/contact',
    })
    const b = store.addEnquiry({
      form: 'venue',
      fields: { venue: 'Crown', email: 'crown@example.com', message: 'List us', topic: 'venue' },
    })
    expect(a.id).not.toBe(b.id)
    expect(a).toMatchObject({ form: 'contact', name: 'Ada', handled: false, emailed: false })
    expect(b).toMatchObject({ form: 'venue', name: 'Crown', topic: 'venue' })
    expect(store.listEnquiries().map((e) => e.id)).toEqual([b.id, a.id])
    // And again from disk, as the dashboard's process would read it.
    expect(createStore({ dir }).listEnquiries()).toHaveLength(2)
  })

  it('rejects unknown forms and empty submissions', () => {
    const store = createStore({ dir })
    expect(store.addEnquiry({ form: 'newsletter', fields: { email: 'x@y.z' } })).toBeNull()
    expect(store.addEnquiry({ form: 'contact', fields: { name: 'Nobody' } })).toBeNull()
    expect(store.listEnquiries()).toEqual([])
    expect(existsSync(join(dir, 'enquiries.json'))).toBe(false)
  })

  it('marks a record handled or emailed and ignores other fields', () => {
    const store = createStore({ dir })
    const { id } = store.addEnquiry({ form: 'contact', fields: { email: 'a@b.c', message: 'hi' } })
    expect(store.updateEnquiry(id, { handled: true, message: 'rewritten' })).toMatchObject({
      handled: true,
      message: 'hi',
    })
    expect(store.updateEnquiry(id, { emailed: true }).emailed).toBe(true)
    expect(store.updateEnquiry('nope', { handled: true })).toBeNull()
    expect(createStore({ dir }).listEnquiries()[0]).toMatchObject({ handled: true, emailed: true })
  })
})

describe('traffic', () => {
  const hit = (over = {}) => ({
    path: '/poker-calendar/2026',
    referrer: 'https://www.google.com/',
    host: 'australianpokercalendar.com',
    ip: '203.0.113.9',
    ua: 'Mozilla/5.0 (iPhone)',
    today: '2026-10-03',
    ...over,
  })

  it('counts views, unique visitors, pages and referrers per day', () => {
    const store = createStore({ dir })
    store.recordView(hit())
    store.recordView(hit({ path: '/' }))
    store.recordView(hit({ ip: '198.51.100.4', referrer: '' }))
    store.recordView(hit({ today: '2026-10-02', referrer: 'https://australianpokercalendar.com/' }))
    const t = store.traffic({ days: 7, today: '2026-10-03' })
    expect(t.days).toHaveLength(7)
    expect(t.days.at(-1)).toEqual({ date: '2026-10-03', views: 3, visitors: 2, crawlers: 0 })
    expect(t.days.at(-2)).toMatchObject({ date: '2026-10-02', views: 1, visitors: 1 })
    expect(t.days[0]).toEqual({ date: '2026-09-27', views: 0, visitors: 0, crawlers: 0 })
    expect(t.totals).toEqual({ views: 4, visitors: 3, crawlers: 0 })
    expect(t.pages[0]).toEqual({ path: '/poker-calendar/2026', views: 3 })
    // Only off-site referrers count; the site's own pages are not a source.
    expect(t.referrers).toEqual([{ host: 'google.com', views: 2 }])
  })

  it('keeps crawlers out of the visitor numbers', () => {
    const store = createStore({ dir })
    store.recordView(hit({ ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }))
    store.recordView(hit({ ua: 'curl/8.0' }))
    const day = store.traffic({ days: 1, today: '2026-10-03' }).days[0]
    expect(day).toEqual({ date: '2026-10-03', views: 0, visitors: 0, crawlers: 2 })
  })

  it('writes the tally to disk without the address, and reads it back after a restart', () => {
    const store = createStore({ dir })
    store.recordView(hit())
    store.flush()
    const file = join(dir, 'traffic', '2026-10-03.json')
    const raw = readFileSync(file, 'utf8')
    expect(raw).not.toContain('203.0.113.9')
    expect(JSON.parse(raw).visitors).toHaveLength(1)

    const again = createStore({ dir })
    again.recordView(hit()) // same visitor, same day: still one
    again.recordView(hit({ ip: '198.51.100.4' }))
    const day = again.traffic({ days: 1, today: '2026-10-03' }).days[0]
    expect(day).toMatchObject({ views: 3, visitors: 2 })
    expect(again.traffic({ days: 1, today: '2026-10-03' }).firstDay).toBe('2026-10-03')
  })
})
