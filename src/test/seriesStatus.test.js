// Contract: the series status model (behind `yarn status` and the admin
// dashboard) derives the right phase and jobs from the content files. Fixed
// dates, so the assertions hold whatever today is; the series named here are
// real rows, so a row removed from festivals.js fails these on purpose.
import { describe, it, expect } from 'vitest'
import { buildStatus, LEVELS } from '../../scripts/series-status.mjs'

const find = (status, name) => status.series.find((s) => s.name === name)

describe('series status', () => {
  const status = buildStatus('2026-10-03')

  it('gives every series a phase, a slug and a page', () => {
    for (const s of status.series) {
      expect(['done', 'live', 'upcoming']).toContain(s.phase.key)
      expect(s.href).toBe(`/events/${s.slug}`)
      expect(s.contentFile).toMatch(/^src\/content\//)
    }
    expect(status.series.map((s) => s.start)).toEqual([...status.series.map((s) => s.start)].sort())
  })

  it('reads a hand-built poster as a schedule with its data file and art', () => {
    const vpc = find(status, 'Victorian Poker Championship 2026')
    expect(vpc.poster).toBe(true)
    expect(vpc.scheduleRows).toBeGreaterThan(50)
    expect(vpc.dataFile).toBe('victorian-poker-championship-2026-schedule.json')
    expect(vpc.imageExists).toBe(true)
    expect(vpc.contentFile).toBe('src/content/eventVictorianPokerChampionship2026.js')
  })

  it('chases a schedule only inside the windows', () => {
    const brisbane = find(status, 'APLPT Brisbane') // starts 2026-10-06, schedule up
    expect(brisbane.phase).toMatchObject({ key: 'upcoming', until: 3 })
    expect(brisbane.jobs.some((j) => /schedule/i.test(j.text))).toBe(false)

    const oct15 = buildStatus('2026-10-15')
    const townsville = find(oct15, 'APL The Ville 600 Townsville') // starts 2026-10-18, no schedule
    expect(townsville.phase).toMatchObject({ key: 'upcoming', until: 3 })
    expect(townsville.jobs.some((j) => j.level === 'now' && /no schedule/.test(j.text))).toBe(true)

    const aussieMillions = find(status, '2027 Aussie Millions') // six months out
    expect(aussieMillions.jobs.some((j) => /schedule/i.test(j.text))).toBe(false)
  })

  it('never asks for a schedule for a finished series', () => {
    const later = buildStatus('2027-06-01')
    for (const s of later.series) {
      expect(s.phase.key).toBe('done')
      expect(s.jobs.some((j) => /schedule/i.test(j.text))).toBe(false)
    }
  })

  it('flags finished series still holding a site slot', () => {
    const oct20 = buildStatus('2026-10-20')
    const melb = find(oct20, 'APT Melbourne Champs II') // ended 2026-10-11, still the hero
    expect(melb.phase.key).toBe('done')
    expect(melb.jobs.map((j) => j.text).join(' ')).toMatch(/hero/)
    expect(oct20.slots.find((e) => e.slot === 'Home hero').state.tone).toBe('critical')
  })

  it('matches calendar rows to the scrape by source URL', () => {
    const scraped = status.series.filter((s) => s.scraped)
    expect(scraped.length).toBeGreaterThan(10)
    for (const s of scraped) expect(s.scraped.url).toBe(s.source)
    expect(status.unlisted).toEqual([])
  })

  it('orders jobs now, soon, later with a series link on each', () => {
    const levels = status.jobs.map((j) => LEVELS.indexOf(j.level))
    expect(levels).toEqual([...levels].sort())
    for (const j of status.jobs) expect(typeof j.slug).toBe('string')
  })

  it('profiles every poker room from the tours, brands, venues and scrape', () => {
    const codes = status.rooms.map((r) => r.code)
    expect(codes).toEqual(status.calendar.tours.map((t) => t.code))
    for (const room of status.rooms) {
      expect(room.path).toBe(`/tours/${room.slug}`)
      expect(room.website).toMatch(/^https?:\/\//)
      expect(room.brand, room.code).not.toBeNull()
      expect(room.logo.wordmark.ok, `${room.code} wordmark`).toBe(true)
      // Every series on the calendar under this code, newest first within each phase.
      const mine = status.series.filter((s) => s.tour === room.code).map((s) => s.slug)
      expect([...room.live, ...room.upcoming, ...room.done].sort()).toEqual([...mine].sort())
      expect(room.counts.series).toBe(mine.length)
    }
  })

  it('merges every organiser record a room files under and lists where it deals', () => {
    const kings = status.rooms.find((r) => r.code === 'KINGS')
    expect(kings.name).toBe('Kings Poker')
    expect(kings.contact.organisers).toEqual(
      expect.arrayContaining(['Kings Poker Sydney', 'Kings Poker Newcastle']),
    )
    expect(kings.contact.emails).toContain('kingspokernewcastle@gmail.com')
    expect(kings.venues.map((v) => v.name)).toContain('Blackbutt Hotel')
    expect(kings.venues[0].address).toMatch(/NSW \d{4}$/)
    expect(kings.cities).toEqual(expect.arrayContaining(['Sydney', 'Newcastle']))

    // NPL is not on the scrape: no organiser block, but the room still profiles.
    const npl = status.rooms.find((r) => r.code === 'NPL')
    expect(npl.contact.organisers).toEqual([])
    expect(npl.contact.websites).toContain('https://www.npl.com.au/')
    expect(npl.venues.length).toBeGreaterThan(0)
  })

  it("rolls a room's open jobs up from its series", () => {
    const oct20 = buildStatus('2026-10-20')
    const apt = oct20.rooms.find((r) => r.code === 'APT')
    const melb = find(oct20, 'APT Melbourne Champs II')
    expect(apt.jobs).toEqual(
      expect.arrayContaining(melb.jobs.map((j) => ({ ...j, slug: melb.slug, series: melb.name }))),
    )
    expect(apt.counts.jobs).toBe(apt.jobs.length)
  })
})
