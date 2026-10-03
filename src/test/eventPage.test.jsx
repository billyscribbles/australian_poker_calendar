// Contract: every series on the calendar has a page at its href. Four are an
// operator's poster as a page — brand hero, the four headline stats, and the
// full day-by-day schedule with featured rows (and, where the poster has them,
// the rows that feed another series) marked. The rest draw the same hero from
// the festival row and say the schedule is coming. routes.js passes the path.
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import EventPage from '../pages/EventPage.jsx'
import {
  eventPages,
  eventFor,
  nextEvents,
  nextUp,
  schedulePending,
  scheduleFilter,
} from '../content/eventPages.js'
import { toStamp } from '../lib/calendar.js'
import { festivals } from '../content/festivals.js'
import { ROUTES } from '../routes.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

expect.extend(toHaveNoViolations)

const renderPath = (path) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <EventPage path={path} />
      </MemoryRouter>
    </HelmetProvider>,
  )
const renderPage = (key) => renderPath(eventPages[key].path)

/** The assertions every series page must meet, whatever its poster carries. */
function describeSeriesPage({ key, path, rows, days, sample }) {
  const event = eventPages[key]

  describe(`EventPage — ${event.title}`, () => {
    it('is routed at the href the calendar derives from the series name', () => {
      expect(event.path).toBe(path)
      const route = ROUTES.find((r) => r.path === event.path)
      expect(route?.module).toBe('src/pages/EventPage.jsx')
      expect(route?.props).toEqual({ path: event.path })
      expect(festivals.some((f) => f.href === event.path)).toBe(true)
      expect(eventFor(event.path)).toBe(event)
    })

    it('shows the series name, dates, venue and the four headline stats', () => {
      renderPage(key)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(event.title)
      expect(screen.getByText(event.dates)).toBeInTheDocument()
      expect(screen.getByText(event.venue)).toBeInTheDocument()
      expect(event.stats).toHaveLength(4)
      // Scoped to the strip: a stat like "$2,500" is also a buy-in in the table.
      const strip = within(screen.getByRole('region', { name: /at a glance/i }))
      for (const stat of event.stats) {
        expect(strip.getByText(stat.value)).toBeInTheDocument()
      }
    })

    it('lists every row of the schedule under its day', () => {
      renderPage(key)
      const table = screen.getByRole('table', { name: /schedule/i })
      expect(event.schedule.length).toBe(rows)
      expect(within(table).getAllByRole('row')).toHaveLength(event.schedule.length + 1)
      // Day cells: one per calendar day, spanning that day's rows.
      const dates = [...new Set(event.schedule.map((r) => r.date))]
      expect(dates).toHaveLength(days)
      expect(within(table).getAllByRole('rowheader')).toHaveLength(dates.length)
      for (const name of sample) {
        expect(within(table).getAllByText(name).length).toBeGreaterThan(0)
      }
    })

    it('marks featured rows and rows that feed another series', () => {
      const { container } = renderPage(key)
      const featured = event.schedule.filter((r) => r.featured).length
      const feeds = event.schedule.filter((r) => r.feeds).length
      expect(featured).toBeGreaterThan(0)
      expect(container.querySelectorAll('.schedule__row--featured')).toHaveLength(featured)
      expect(container.querySelectorAll('.schedule__row--feeds')).toHaveLength(feeds)
    })

    it('tints every second day so consecutive days read apart', () => {
      const { container } = renderPage(key)
      const dates = [...new Set(event.schedule.map((r) => r.date))]
      const altRows = event.schedule.filter((r) => dates.indexOf(r.date) % 2 === 1).length
      expect(altRows).toBeGreaterThan(0)
      expect(container.querySelectorAll('.schedule__row--alt')).toHaveLength(altRows)
      const first = container.querySelector('.schedule__row')
      expect(first.classList.contains('schedule__row--alt')).toBe(false)
    })

    it('trims the grid to a maximum buy-in and restores it on "Any"', async () => {
      const user = userEvent.setup()
      const { container } = renderPage(key)
      const amounts = event.schedule
        .filter((r) => r.buyIn)
        .map((r) => Number(r.buyIn.replace(/[^0-9]/g, '')))
      // Only rungs that hide something are offered, between the cheapest and
      // dearest event; a series priced at one figure has no control at all.
      const expected = scheduleFilter.steps.filter(
        (s) => s >= Math.min(...amounts) && s < Math.max(...amounts),
      )
      const select = screen.queryByRole('combobox', { name: scheduleFilter.max })
      if (expected.length === 0) {
        expect(select).toBeNull()
        expect(screen.queryByRole('combobox', { name: scheduleFilter.min })).toBeNull()
        return
      }
      const options = within(select)
        .getAllByRole('option')
        .map((o) => o.value)
      expect(options[0]).toBe('')
      const steps = options.slice(1).map(Number)
      expect(steps).toEqual(expected)

      const max = steps[0]
      await user.selectOptions(select, String(max))
      const rows = [...container.querySelectorAll('.schedule__row')]
      expect(rows.length).toBeLessThan(event.schedule.length)
      expect(rows.length).toBeGreaterThan(0)
      // Every priced row left costs the maximum or less...
      const prices = rows
        .map((row) => row.querySelector('.schedule__total')?.textContent)
        .filter(Boolean)
        .map((text) => Number(text.replace(/[^0-9]/g, '')))
      expect(prices.length).toBeGreaterThan(0)
      expect(prices.every((p) => p <= max)).toBe(true)
      // ...and a Day 2 of an event over the cap goes with it.
      const dearest = event.schedule.find(
        (r) => r.buyIn && Number(r.buyIn.replace(/[^0-9]/g, '')) === Math.max(...amounts),
      )
      const dearStem = dearest.number || dearest.name.split(' – ')[0]
      const dearDay2 = event.schedule.find(
        (r) => !r.buyIn && (r.number || r.name.split(' – ')[0]) === dearStem,
      )
      if (dearDay2) expect(within(table()).queryByText(dearDay2.name)).toBeNull()
      // The columns are the full poster's, so the grid keeps its shape.
      expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(3)

      await user.selectOptions(select, '')
      expect(container.querySelectorAll('.schedule__row')).toHaveLength(event.schedule.length)

      function table() {
        return screen.getByRole('table', { name: /schedule/i })
      }
    })

    it('trims the grid to a minimum buy-in, and the two ends never cross', async () => {
      const user = userEvent.setup()
      const { container } = renderPage(key)
      const amounts = event.schedule
        .filter((r) => r.buyIn)
        .map((r) => Number(r.buyIn.replace(/[^0-9]/g, '')))
      const cheapest = Math.min(...amounts)
      const dearest = Math.max(...amounts)
      const expected = scheduleFilter.steps.filter((s) => s > cheapest && s <= dearest)
      const min = screen.queryByRole('combobox', { name: scheduleFilter.min })
      if (expected.length === 0) {
        expect(min).toBeNull()
        return
      }
      const steps = within(min)
        .getAllByRole('option')
        .slice(1)
        .map((o) => Number(o.value))
      expect(steps).toEqual(expected)

      const floor = steps[steps.length - 1]
      await user.selectOptions(min, String(floor))
      const rows = [...container.querySelectorAll('.schedule__row')]
      expect(rows.length).toBeLessThan(event.schedule.length)
      const prices = rows
        .map((row) => row.querySelector('.schedule__total')?.textContent)
        .filter(Boolean)
        .map((text) => Number(text.replace(/[^0-9]/g, '')))
      expect(prices.length).toBeGreaterThan(0)
      expect(prices.every((p) => p >= floor)).toBe(true)

      // A ceiling under the floor resets the floor to "Any", so the grid is
      // never asked for a range that cannot exist.
      const max = screen.getByRole('combobox', { name: scheduleFilter.max })
      const ceiling = within(max)
        .getAllByRole('option')
        .slice(1)
        .map((o) => Number(o.value))
        .find((s) => s < floor)
      if (ceiling) {
        await user.selectOptions(max, String(ceiling))
        expect(min).toHaveValue('')
        expect(max).toHaveValue(String(ceiling))
        await user.selectOptions(min, String(floor))
        expect(max).toHaveValue('')
        expect(min).toHaveValue(String(floor))
      }
    })

    it('says so when a range matches nothing, inside the grid', async () => {
      const user = userEvent.setup()
      const { container } = renderPage(key)
      const amounts = event.schedule
        .filter((r) => r.buyIn)
        .map((r) => Number(r.buyIn.replace(/[^0-9]/g, '')))
      // A rung both selects offer that prices no event: floor = ceiling = rung.
      const gap = scheduleFilter.steps.find(
        (s) => s > Math.min(...amounts) && s < Math.max(...amounts) && !amounts.includes(s),
      )
      if (!gap) return
      await user.selectOptions(screen.getByRole('combobox', { name: scheduleFilter.min }), `${gap}`)
      await user.selectOptions(screen.getByRole('combobox', { name: scheduleFilter.max }), `${gap}`)
      expect(container.querySelectorAll('.schedule__row:not(.schedule__row--empty)')).toHaveLength(
        0,
      )
      expect(screen.getByText(scheduleFilter.empty)).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(3)
    })

    it('shows only the columns its poster fills', () => {
      renderPage(key)
      const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
      const hasShotClock = event.schedule.some((r) => r.shotClock)
      expect(headers.some((h) => /shot clock/i.test(h))).toBe(hasShotClock)
    })

    it('links to the official site', () => {
      renderPage(key)
      expect(screen.getByRole('link', { name: /official site/i })).toHaveAttribute(
        'href',
        event.website,
      )
    })

    it('renders with no axe violations', async () => {
      const { container } = renderPage(key)
      expect(await axe(container)).toHaveNoViolations()
    })
  })
}

describeSeriesPage({
  key: 'melbourneChampsII',
  path: '/events/apt-melbourne-champs-ii',
  rows: 58,
  days: 12,
  sample: ['The Crown Opener', 'Monster Stack'],
})

describeSeriesPage({
  key: 'victorianPokerChampionship2026',
  path: '/events/victorian-poker-championship-2026',
  rows: 90,
  days: 16,
  sample: ['Victorian Champs Main Event – Flight 1', 'Closing Event NLHE'],
})

describeSeriesPage({
  key: 'sydneyShowdown2026',
  path: '/events/aurum-sydney-showdown',
  rows: 61,
  days: 22,
  sample: ['Showdown Main Event – Flight 1A', 'Encore'],
})

describeSeriesPage({
  key: 'playLiveSummerChampionship2026',
  path: '/events/playlive-summer-championship',
  rows: 114,
  days: 20,
  sample: ['Melb. Millions Main Event – Day 1', 'Berserker'],
})

describeSeriesPage({
  key: 'playLiveMelbourneMillions2027',
  path: '/events/playlive-melbourne-millions-2027',
  rows: 126,
  days: 21,
  sample: ['Main Event – Day 1A', '25K Super Highroller – Day 1', 'Berserker'],
})

describeSeriesPage({
  key: 'aplptBrisbane2026',
  path: '/events/aplpt-brisbane',
  rows: 67,
  days: 6,
  sample: ['APLPT Queensland Main Event – Flight 1', 'Freezeout Finisher'],
})

describeSeriesPage({
  key: 'nplSuperSeries2026',
  path: '/events/npl-super-series-2026',
  rows: 4,
  days: 4,
  sample: ['Main Event – Flight 1', 'Main Event – Day 2'],
})

describe('EventPage — NPL Super Series specifics', () => {
  const event = eventPages.nplSuperSeries2026

  it('features every Main Event day and shows the dealt column, no shot clock or rego', () => {
    expect(event.schedule.every((r) => r.featured && r.dealt === 'Dealer')).toBe(true)
    renderPage('nplSuperSeries2026')
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers.some((h) => /^dealt$/i.test(h))).toBe(true)
    for (const dropped of [/shot clock/i, /rego ends/i, /^room$/i, /stack/i]) {
      expect(headers.some((h) => dropped.test(h))).toBe(false)
    }
  })

  it('prices the three flights and marks Day 2 as qualifiers only', () => {
    const [f1, f2, f3, day2] = event.schedule
    for (const flight of [f1, f2, f3]) {
      expect(flight.buyIn).toBe('$1,150')
      expect(flight.split).toBe('1,000+150')
      expect(flight.reEntry).toBe('2')
    }
    expect(day2.buyIn).toBe('')
    expect(day2.split).toBe('Qualifiers only')
  })
})

describe('EventPage — PlayLive Summer Championship specifics', () => {
  const event = eventPages.playLiveSummerChampionship2026

  it('features the Main Event and Melbourne Millions Main Event days, nothing else', () => {
    for (const row of event.schedule) {
      const headline = /^(Melb\. Millions )?Main Event – Day/.test(row.name)
      expect(row.featured, `${row.date} ${row.time} ${row.name}`).toBe(headline)
    }
    expect(event.schedule.filter((r) => r.featured)).toHaveLength(9)
  })

  it('shows late rego as a time only: no level, shot clock, re-entry or room column', () => {
    renderPage('playLiveSummerChampionship2026')
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers.filter((h) => /rego ends/i.test(h))).toHaveLength(1)
    expect(headers.some((h) => /rego ends.*time/i.test(h))).toBe(true)
    for (const dropped of [/shot clock/i, /re-entry/i, /^room$/i]) {
      expect(headers.some((h) => dropped.test(h))).toBe(false)
    }
  })

  it('says qualifiers only on every Day 2+ row and prices every other row', () => {
    for (const row of event.schedule) {
      const later = /Day [234]\b/.test(row.name) && !/Day 1/.test(row.name)
      if (row.split === 'Qualifiers only') {
        expect(later, row.name).toBe(true)
        expect(row.buyIn).toBe('')
      } else {
        expect(row.buyIn, row.name).toMatch(/^\$[\d,]+$/)
      }
    }
  })
})

describe('EventPage — PlayLive Melbourne Millions specifics', () => {
  const event = eventPages.playLiveMelbourneMillions2027

  it('features every Main Event day and nothing else', () => {
    for (const row of event.schedule) {
      expect(row.featured, `${row.date} ${row.time} ${row.name}`).toBe(
        /^Main Event – Day/.test(row.name),
      )
    }
    expect(event.schedule.filter((r) => r.featured)).toHaveLength(15)
  })

  it('says qualifiers only on every unpriced Day 2+ row and prices every other row', () => {
    for (const row of event.schedule) {
      const later = /Day [2-5]\b/.test(row.name) && !/Day 1/.test(row.name)
      if (row.split === 'Qualifiers only') {
        expect(later, row.name).toBe(true)
        expect(row.buyIn).toBe('')
        expect(row.regoTime, row.name).toBe('')
      } else {
        expect(row.buyIn, row.name).toMatch(/^\$[\d,]+$/)
        expect(row.regoTime, row.name).toMatch(/^(\d{1,2}:\d{2} [AP]M|Day 2)$/)
      }
    }
  })

  it('carries the poster as the hero key art', () => {
    expect(event.image.src).toBe('/images/events/playlive-melbourne-millions-2027.webp')
    expect(existsSync(join(process.cwd(), 'public', event.image.src))).toBe(true)
  })
})

describe('EventPage — Aurum Sydney Showdown specifics', () => {
  const event = eventPages.sydneyShowdown2026

  it('numbers the 22 events and keeps every Showdown Open flight as Event 7', () => {
    const numbers = new Set(event.schedule.filter((r) => r.number).map((r) => r.number))
    expect(numbers.size).toBe(22)
    for (const row of event.schedule.filter((r) => /^Showdown Open/.test(r.name))) {
      expect(row.number, row.name).toBe('7')
    }
  })

  it('features the five colour-coded championship events, nothing else', () => {
    const championship = new Set(['1', '4', '7', '14', '15'])
    for (const row of event.schedule) {
      expect(row.featured, `${row.date} ${row.time} ${row.name}`).toBe(championship.has(row.number))
    }
  })

  it('shows the room column, which the other posters leave off', () => {
    renderPage('sydneyShowdown2026')
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers.some((h) => /^room$/i.test(h))).toBe(true)
    expect(headers.some((h) => /shot clock/i.test(h))).toBe(false)
    expect(event.schedule.every((r) => r.room)).toBe(true)
  })

  it('leaves the room column off the Crown, APT and APL pages', () => {
    for (const key of [
      'melbourneChampsII',
      'victorianPokerChampionship2026',
      'aplptBrisbane2026',
    ]) {
      const { unmount } = renderPage(key)
      const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
      expect(headers.some((h) => /^room$/i.test(h))).toBe(false)
      unmount()
    }
  })
})

describe('EventPage — Crown Victorian Poker Championship specifics', () => {
  const event = eventPages.victorianPokerChampionship2026

  it("feeds nothing: Crown's schedule is the destination, not a feeder", () => {
    expect(event.schedule.some((r) => r.feeds)).toBe(false)
  })

  it('numbers the 21 championship events and shows the number by the name', () => {
    const numbers = new Set(event.schedule.filter((r) => r.number).map((r) => r.number))
    expect(numbers.size).toBe(21)
    const { container } = renderPage('victorianPokerChampionship2026')
    expect(container.querySelectorAll('.schedule__number')).toHaveLength(
      event.schedule.filter((r) => r.number).length,
    )
  })

  it('marks the Main Event and every Main Event satellite as featured, nothing else', () => {
    for (const row of event.schedule) {
      const isMain = row.number === '12' || /^Main Event Satellite/.test(row.name)
      expect(row.featured, `${row.date} ${row.time} ${row.name}`).toBe(isMain)
    }
  })

  it('leaves the shot clock and late-rego time columns off', () => {
    renderPage('victorianPokerChampionship2026')
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers.filter((h) => /rego ends/i.test(h))).toHaveLength(1)
    expect(headers.some((h) => /shot clock/i.test(h))).toBe(false)
  })
})

describe('EventPage — every other series on the calendar', () => {
  const posters = new Set(Object.values(eventPages).map((e) => e.path))
  const pending = festivals.filter((f) => !posters.has(f.href))

  it('has a route at every festival href, each passing its own path', () => {
    expect(pending.length).toBeGreaterThan(0)
    for (const festival of festivals) {
      const route = ROUTES.find((r) => r.path === festival.href)
      expect(route?.module, festival.href).toBe('src/pages/EventPage.jsx')
      expect(route?.props, festival.href).toEqual({ path: festival.href })
    }
  })

  it('derives the hero from the festival row: name, dates with year, venue', () => {
    const festival = festivals.find((f) => f.name === 'APT Sydney Champs')
    renderPath(festival.href)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('APT Sydney Champs')
    expect(screen.getByText('Nov 5 – Nov 15, 2026')).toBeInTheDocument()
    expect(screen.getByText("Revesby Workers' Club")).toBeInTheDocument()
  })

  it('splits a bracketed venue detail onto its own line', () => {
    const event = eventFor(festivals.find((f) => f.name === 'APT Melbourne Champs III').href)
    expect(event.city).toBe('Melbourne')
    expect(event.venue).toBe('Crown Melbourne')
    expect(eventFor('/events/apt-melbourne-champs-ii').venueDetail).toBe('Metropol, Sky Bar 28')
    const seasoned = eventFor('/events/kings-poker-sydney-millions')
    expect(seasoned.venue).toBe('St. George Leagues Club')
    expect(seasoned.venueDetail).toBe('Sydney')
  })

  it('says the schedule is coming and links to the operator, with no table or stats', () => {
    const festival = pending[0]
    renderPath(festival.href)
    expect(screen.getByText(schedulePending.title)).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('region', { name: /at a glance/i })).toBeNull()
    expect(screen.getByRole('link', { name: schedulePending.link })).toHaveAttribute(
      'href',
      festival.website,
    )
  })

  it('renders every derived page with no axe violations', async () => {
    for (const festival of pending) {
      const { container, unmount } = renderPath(festival.href)
      expect(await axe(container)).toHaveNoViolations()
      unmount()
    }
  })
})

describe('EventPage — unknown path', () => {
  it('renders nothing rather than a half page, so the prerender fails loudly', () => {
    expect(eventFor('/events/nope')).toBeUndefined()
    const { container } = renderPath('/events/nope')
    expect(container).toBeEmptyDOMElement()
  })
})

describe('EventPage — up next', () => {
  const today = toStamp('2026-10-03')

  it('picks the next series to start after today, skipping this page and anything off', () => {
    const here = eventPages.melbourneChampsII.path
    const picks = nextEvents(here, today, nextUp.count)
    expect(picks).toHaveLength(nextUp.count)
    const starts = picks.map((f) => toStamp(f.start))
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
    for (const pick of picks) {
      expect(pick.href).not.toBe(here)
      expect(pick.status).toBeUndefined()
      expect(toStamp(pick.start)).toBeGreaterThan(today)
    }
    // Nothing earlier was skipped: the first pick is the very next start.
    const earliest = festivals
      .filter((f) => f.href !== here && !f.status && toStamp(f.start) > today)
      .reduce((a, b) => (toStamp(a.start) <= toStamp(b.start) ? a : b))
    expect(picks[0]).toBe(earliest)
  })

  it('never offers the page its own series, even when it is the next to start', () => {
    const next = nextEvents('/events/none', today, 1)[0]
    expect(nextEvents(next.href, today, nextUp.count)).not.toContain(next)
  })

  it('returns nothing once the calendar runs out', () => {
    expect(nextEvents('/events/none', toStamp('2099-01-01'), nextUp.count)).toEqual([])
  })

  it('closes every series page with cards through to the next series', () => {
    const here = eventPages.melbourneChampsII.path
    renderPath(here)
    const region = screen.getByRole('region', { name: nextUp.heading })
    const cards = within(region)
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href').startsWith('/events/'))
    expect(cards).toHaveLength(nextUp.count)
    for (const card of cards) {
      expect(card).not.toHaveAttribute('href', here)
      const festival = festivals.find((f) => f.href === card.getAttribute('href'))
      expect(festival).toBeDefined()
      expect(card).toHaveTextContent(festival.name)
    }
    expect(within(region).getByRole('link', { name: nextUp.link })).toHaveAttribute(
      'href',
      '/poker-calendar/2026',
    )
  })
})
