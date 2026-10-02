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
    const brisbane = find(status, 'APLPT Brisbane') // starts 2026-10-06
    expect(brisbane.phase).toMatchObject({ key: 'upcoming', until: 3 })
    expect(brisbane.jobs.some((j) => j.level === 'now' && /no schedule/.test(j.text))).toBe(true)

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
    expect(status.unlisted.map((u) => u.title).join()).toMatch(/Nouméa/)
  })

  it('orders jobs now, soon, later with a series link on each', () => {
    const levels = status.jobs.map((j) => LEVELS.indexOf(j.level))
    expect(levels).toEqual([...levels].sort())
    for (const j of status.jobs) expect(typeof j.slug).toBe('string')
  })
})
