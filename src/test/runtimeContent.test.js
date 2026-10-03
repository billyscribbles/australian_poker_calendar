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
