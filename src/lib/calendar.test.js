// Contract: the pure date and lane-packing logic behind the calendar page.
// Festivals carry ISO dates; everything else is derived here so the timeline
// component can stay a dumb renderer.
import { describe, it, expect } from 'vitest'
import {
  DAY,
  HEAD,
  ROW,
  toStamp,
  monthDays,
  festivalsInMonth,
  packLanes,
  formatRange,
  parseMonth,
  todayStamp,
} from './calendar.js'

const f = (name, start, end, extra = {}) => ({ tour: 'T', name, start, end, place: 'X', ...extra })

describe('calendar — dates', () => {
  it('exposes the timeline geometry from the handoff', () => {
    expect([DAY, HEAD, ROW]).toEqual([64, 60, 116])
  })

  it('toStamp reads an ISO date as UTC midnight so day arithmetic is exact', () => {
    expect(toStamp('2026-01-08')).toBe(Date.UTC(2026, 0, 8))
    expect(toStamp(Date.UTC(2026, 0, 8))).toBe(Date.UTC(2026, 0, 8))
    expect((toStamp('2026-03-29') - toStamp('2026-03-28')) / 86400000).toBe(1)
  })

  it('monthDays lists every day with its weekday and weekend flag', () => {
    const days = monthDays(2026, 10)
    expect(days).toHaveLength(31)
    expect(days[0]).toEqual({
      day: 1,
      weekday: 'THU',
      weekend: false,
      stamp: toStamp('2026-10-01'),
    })
    expect(days[2]).toMatchObject({ day: 3, weekday: 'SAT', weekend: true })
    expect(monthDays(2026, 2)).toHaveLength(28)
  })

  it('formatRange prints the dotted year.month.day range', () => {
    expect(formatRange('2026-01-08', '2026-01-18')).toBe('2026.01.08 - 2026.01.18')
  })

  it('parseMonth accepts 1–12 and falls back otherwise', () => {
    expect(parseMonth('3', 10)).toBe(3)
    expect(parseMonth('12', 10)).toBe(12)
    expect(parseMonth('0', 10)).toBe(10)
    expect(parseMonth('13', 10)).toBe(10)
    expect(parseMonth('abc', 10)).toBe(10)
    expect(parseMonth(null, 10)).toBe(10)
  })

  it('todayStamp uses the local calendar date', () => {
    const d = new Date(2026, 9, 2, 23, 30)
    expect(todayStamp(d)).toBe(Date.UTC(2026, 9, 2))
  })
})

describe('calendar — festivals in a month', () => {
  const list = [
    f('March only', '2026-03-05', '2026-03-15'),
    f('Spans Feb to Mar', '2026-02-25', '2026-03-09'),
    f('April', '2026-04-01', '2026-04-03'),
    f('Ends 31 Mar', '2026-03-26', '2026-03-31'),
    f('Starts 1 Mar, long', '2026-03-01', '2026-03-20'),
    f('Starts 1 Mar, short', '2026-03-01', '2026-03-02'),
  ]

  it('keeps anything overlapping the month, sorted by start asc then end desc', () => {
    const names = festivalsInMonth(list, 2026, 3).map((x) => x.name)
    expect(names).toEqual([
      'Spans Feb to Mar',
      'Starts 1 Mar, long',
      'Starts 1 Mar, short',
      'March only',
      'Ends 31 Mar',
    ])
  })
})

describe('calendar — lane packing', () => {
  it('places a festival in the first lane that is free before its start', () => {
    const bars = packLanes(
      [
        f('A', '2026-10-01', '2026-10-05'),
        f('B', '2026-10-03', '2026-10-08'),
        f('C', '2026-10-06', '2026-10-10'),
      ],
      2026,
      10,
    )
    expect(bars.map((b) => [b.festival.name, b.lane])).toEqual([
      ['A', 0],
      ['B', 1],
      ['C', 0],
    ])
    expect(bars.map((b) => b.laneCount)).toEqual([2, 2, 2])
  })

  it('clips a festival to the month and flags the clipped edges', () => {
    const [bar] = packLanes([f('X', '2026-09-24', '2026-10-12')], 2026, 10)
    expect(bar).toMatchObject({ startDay: 1, days: 12, clipStart: true, clipEnd: false })
    const [bar2] = packLanes([f('Y', '2026-10-28', '2026-11-15')], 2026, 10)
    expect(bar2).toMatchObject({ startDay: 28, days: 4, clipStart: false, clipEnd: true })
  })

  it('a one-day festival occupies one column', () => {
    const [bar] = packLanes([f('Z', '2026-03-06', '2026-03-06')], 2026, 3)
    expect(bar).toMatchObject({ startDay: 6, days: 1 })
  })

  it('a lane is reused only once the previous bar has ended', () => {
    // Back-to-back: A ends on the 5th, B starts on the 5th → overlap → new lane.
    const bars = packLanes(
      [f('A', '2026-10-01', '2026-10-05'), f('B', '2026-10-05', '2026-10-08')],
      2026,
      10,
    )
    expect(bars.map((b) => b.lane)).toEqual([0, 1])
  })
})
