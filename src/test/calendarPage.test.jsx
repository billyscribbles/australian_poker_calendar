// Contract: the Poker Calendar page behaves as the handoff's "Interactions &
// State" section describes — month tabs and the Timeline/List toggle drive the
// view and are mirrored into the URL, today is marked only in the month that
// contains it, and the static document hydrates cleanly against a URL that
// carries state.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, StaticRouter, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import CalendarPage from '../pages/CalendarPage.jsx'
import FAQ from '../components/FAQ.jsx'
import FestivalTimeline from '../components/FestivalTimeline.jsx'
import { festivals, STATUS_LABELS } from '../content/festivals.js'
import { calendarPage } from '../content/calendarPage.js'
import { DAY, HEAD, ROW, festivalsInYear } from '../lib/calendar.js'

expect.extend(toHaveNoViolations)

const PATH = '/poker-calendar/2026'

function Search() {
  return <output data-testid="search">{useLocation().search}</output>
}

const renderPage = (url = PATH) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <CalendarPage />
        <Search />
      </MemoryRouter>
    </HelmetProvider>,
  )

const monthTab = (name) => screen.getByRole('button', { name: new RegExp(`^${name}`) })
const timeline = () => screen.getByRole('list', { name: /timeline/ })
const bar = (name) => within(timeline()).getByRole('link', { name: new RegExp(name) })

beforeEach(() => {
  // The handoff's "today": 2 October 2026. Only Date is faked so user-event's
  // timers keep working.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 2, 12) })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('CalendarPage — static content', () => {
  it('renders the title, every tour tile and the count of series touching the year', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(calendarPage.title(2026))
    for (const tour of calendarPage.tours) {
      expect(screen.getByRole('link', { name: tour.label })).toHaveAttribute('href', tour.href)
    }
    // The season runs past New Year, so the 2026 document counts only the
    // series that touch 2026 — not the whole scrape.
    const inYear = festivalsInYear(festivals, 2026)
    expect(inYear.length).toBeLessThan(festivals.length)
    expect(screen.getByText(String(inYear.length), { selector: 'strong' })).toBeInTheDocument()
    expect(festivals.length).toBeGreaterThanOrEqual(19)
  })

  it("renders the 2027 document with its own title and only that year's series", () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/poker-calendar/2027?month=4']}>
          <CalendarPage year={2027} />
        </MemoryRouter>
      </HelmetProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(calendarPage.title(2027))
    expect(
      screen.getByText(String(festivalsInYear(festivals, 2027).length), { selector: 'strong' }),
    ).toBeInTheDocument()
    expect(bar('2027 Aussie Millions')).toBeInTheDocument()
    expect(
      within(timeline()).queryByRole('link', { name: /Melbourne Champs II$/ }),
    ).not.toBeInTheDocument()
  })

  it('renders the Up Next cards and the calendar FAQ copy', () => {
    renderPage()
    for (const item of calendarPage.upNext.items) {
      const card = within(
        screen.getByRole('region', { name: calendarPage.upNext.heading }),
      ).getByRole('link', {
        name: new RegExp(item.name),
      })
      expect(card).toHaveAttribute('href', item.href)
      if (item.prize) expect(within(card).getByText(item.prize)).toBeInTheDocument()
    }
    for (const item of calendarPage.faq) {
      expect(screen.getByRole('button', { name: item.q })).toBeInTheDocument()
    }
  })
})

describe('CalendarPage — month and view state', () => {
  it('defaults to the current month in the timeline view, with today marked', () => {
    renderPage()
    expect(monthTab('Oct')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true')
    expect(bar('Victorian Poker Championship 2026')).toBeInTheDocument()
    expect(
      within(timeline()).queryByRole('link', { name: /APT Sydney Champs/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByTestId('search')).toHaveTextContent('')
  })

  it('positions a bar by its clipped start day, length and lane', () => {
    renderPage()
    // Victorian Poker Championship: 12 Oct – 27 Oct → column 12, 16 columns wide.
    const vic = bar('Victorian Poker Championship 2026').closest('li')
    expect(vic.style.left).toBe(`${11 * DAY + 3}px`)
    expect(vic.style.width).toBe(`${16 * DAY - 6}px`)
    expect((parseInt(vic.style.top, 10) - (HEAD + 8)) % ROW).toBe(0)
    // APT Melbourne Champs II began on 30 September → squared left edge.
    const apt = bar('APT Melbourne Champs II').closest('li')
    expect(apt.style.left).toBe('3px')
    expect(apt.className).toContain('timeline__bar--clip-start')
    // Kings Poker Sydney Millions runs into November → squared right edge.
    expect(bar('Kings Poker Sydney Millions').closest('li').className).toContain(
      'timeline__bar--clip-end',
    )
  })

  it('marks the festivals running today and not the ones still to come', () => {
    renderPage()
    // On 2 October: Melbourne Champs II (30 Sep – 11 Oct) and the Sydney Showdown (1 – 19 Oct).
    expect(bar('APT Melbourne Champs II').closest('li').className).toContain('timeline__bar--live')
    expect(bar('Aurum Sydney Showdown').closest('li').className).toContain('timeline__bar--live')
    expect(bar('Victorian Poker Championship 2026').closest('li').className).not.toContain(
      'timeline__bar--live',
    )
  })

  it('draws a festival that is not going ahead in the off style with its status label', () => {
    const moved = {
      tour: 'APT',
      name: 'Moved Series',
      start: '2026-10-05',
      end: '2026-10-09',
      place: 'Somewhere, TBA',
      status: 'moved',
      href: '/events/moved-series',
    }
    render(
      <MemoryRouter>
        <FestivalTimeline festivals={[moved]} year={2026} month={10} today={0} />
      </MemoryRouter>,
    )
    const li = bar('Moved Series').closest('li')
    expect(li.className).toContain('timeline__bar--off')
    expect(within(li).getByText(STATUS_LABELS.moved)).toBeInTheDocument()
  })

  it('switching month re-renders the lanes and writes ?month=', async () => {
    renderPage()
    await userEvent.click(monthTab('Nov'))
    expect(monthTab('Nov')).toHaveAttribute('aria-pressed', 'true')
    expect(monthTab('Oct')).toHaveAttribute('aria-pressed', 'false')
    expect(bar('APLPT Albury')).toBeInTheDocument()
    expect(
      within(timeline()).queryByRole('link', { name: /Victorian Poker Championship/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
    expect(screen.getByTestId('search')).toHaveTextContent('?month=11')
  })

  it('switching to List shows rows for the month and writes ?view=list', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('list', { name: /October 2026/ })).toBeInTheDocument()
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
    expect(screen.getByTestId('search')).toHaveTextContent('view=list')
    await userEvent.click(screen.getByRole('button', { name: 'Timeline' }))
    expect(screen.getByTestId('search')).toHaveTextContent('view=timelineDays')
  })

  it('reads month and view from the URL on arrival', () => {
    renderPage(`${PATH}?month=11&view=list`)
    expect(monthTab('Nov')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: /APLPT Albury/ })).toBeInTheDocument()
  })

  it('ignores an out-of-range month', () => {
    renderPage(`${PATH}?month=13`)
    expect(monthTab('Oct')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('CalendarPage — hydration', () => {
  it('hydrates the static document without a mismatch, then applies the URL state', async () => {
    // The prerender renders the route without a query string.
    const html = renderToString(
      <HelmetProvider context={{}}>
        <StaticRouter location={PATH}>
          <CalendarPage />
        </StaticRouter>
      </HelmetProvider>,
    )
    expect(html).toContain('Victorian Poker Championship 2026')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    // A visitor arrives on a shared link with state in the URL.
    let root
    await act(async () => {
      root = hydrateRoot(
        container,
        <HelmetProvider>
          <MemoryRouter initialEntries={[`${PATH}?month=11&view=list`]}>
            <CalendarPage />
          </MemoryRouter>
        </HelmetProvider>,
      )
    })

    const hydrationErrors = errors.mock.calls.filter((call) =>
      /hydrat|did not match|#418|#422|#423/i.test(call.join(' ')),
    )
    expect(hydrationErrors).toEqual([])
    expect(within(container).getByRole('link', { name: /APLPT Albury/ })).toBeInTheDocument()
    expect(within(container).getByRole('button', { name: 'List' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    errors.mockRestore()
    await act(async () => root.unmount())
    container.remove()
  })
})

describe('FAQ — accepts page-specific items', () => {
  it('renders the items it is given instead of the home copy', () => {
    render(<FAQ items={calendarPage.faq} />)
    expect(screen.getByRole('button', { name: calendarPage.faq[0].q })).toBeInTheDocument()
    expect(screen.getByText(calendarPage.faq[0].a)).toBeInTheDocument()
  })
})

describe('CalendarPage — accessibility', () => {
  it('renders with no axe violations in both views', async () => {
    const { container } = renderPage()
    expect(await axe(container)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('festivals — fixture shape', () => {
  it('every festival has a known tour, name, ISO dates, place, link, source and website', () => {
    const codes = calendarPage.tours.map((t) => t.code)
    for (const f of festivals) {
      expect(f.tour && f.name && f.place && f.href, f.name).toBeTruthy()
      expect(codes, f.name).toContain(f.tour)
      expect(f.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(f.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(f.start <= f.end, f.name).toBe(true)
      expect(f.source, f.name).toMatch(/^https:\/\//)
      expect(f.website, f.name).toMatch(/^https:\/\//)
      if (f.status) expect(Object.keys(STATUS_LABELS)).toContain(f.status)
    }
  })

  it('every tour links to its operator and ships the wordmark and icon files it names', () => {
    for (const tour of calendarPage.tours) {
      expect(tour.website, tour.code).toMatch(/^https:\/\//)
      for (const src of [tour.logoSrc, tour.iconSrc, tour.monoSrc]) {
        expect(src, tour.code).toMatch(/^\/images\/tours\//)
        expect(existsSync(join(process.cwd(), 'public', src)), src).toBe(true)
      }
    }
  })

  it('is sorted by start date and has no duplicate links', () => {
    const starts = festivals.map((f) => f.start)
    expect(starts).toEqual([...starts].sort())
    expect(new Set(festivals.map((f) => f.href)).size).toBe(festivals.length)
  })
})
