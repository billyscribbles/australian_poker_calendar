import { existsSync } from 'node:fs'
import { join } from 'node:path'
// Contract: the home page sections render their fixtures and the two pieces of
// behaviour the design specifies — a single-open FAQ accordion and a pulsing
// LIVE badge — work as described in the handoff README.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import FAQ from '../components/FAQ.jsx'
import EventsBanner from '../components/EventsBanner.jsx'
import ImagePlaceholder from '../components/ImagePlaceholder.jsx'
import RecentChampions from '../components/RecentChampions.jsx'
import PlayersOfTheYear from '../components/PlayersOfTheYear.jsx'
import { faq } from '../content/faq.js'
import { heroEvent, sideEvents, ticker, tickerSeries } from '../content/events.js'
import { calendarPage } from '../content/calendarPage.js'
import { festivals } from '../content/festivals.js'
import { phaseOn, todayStamp } from '../lib/calendar.js'
import { featuredNews } from '../content/featuredNews.js'
import { stories } from '../content/stories.js'
import { shorts } from '../content/shorts.js'
import { liveNews } from '../content/liveNews.js'
import { calendar } from '../content/calendar.js'
import { recentChampions } from '../content/recentChampions.js'
import { playersOfTheYear } from '../content/playersOfTheYear.js'
import { asiaTours } from '../content/asiaTours.js'
import { partners } from '../content/partners.js'

const withRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('FAQ accordion — one open item at a time', () => {
  const buttons = () => screen.getAllByRole('button')

  it('opens the first item by default', () => {
    render(<FAQ />)
    expect(buttons()[0]).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(faq.items[0].a)).toBeInTheDocument()
    expect(screen.queryByText(faq.items[1].a)).not.toBeInTheDocument()
  })

  it('opening another item closes the current one', async () => {
    render(<FAQ />)
    await userEvent.click(buttons()[1])
    expect(buttons()[1]).toHaveAttribute('aria-expanded', 'true')
    expect(buttons()[0]).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText(faq.items[1].a)).toBeInTheDocument()
    expect(screen.queryByText(faq.items[0].a)).not.toBeInTheDocument()
  })

  it('clicking the open item closes it, leaving none open', async () => {
    render(<FAQ />)
    await userEvent.click(buttons()[0])
    for (const button of buttons()) {
      expect(button).toHaveAttribute('aria-expanded', 'false')
    }
    for (const item of faq.items) {
      expect(screen.queryByText(item.a)).not.toBeInTheDocument()
    }
  })

  it('colours the last heading line gold and renders each question', () => {
    render(<FAQ />)
    const heading = screen.getByRole('heading', { level: 2 })
    const lines = faq.headingLines
    expect(within(heading).getByText(lines[lines.length - 1]).className).toBe('faq__heading-accent')
    for (const item of faq.items) {
      expect(screen.getByRole('button', { name: item.q })).toBeInTheDocument()
    }
  })
})

describe('EventsBanner — events and ticker from fixtures', () => {
  it('renders the hero event, every side event and every ticker chip', () => {
    withRouter(<EventsBanner />)
    const hero = document.querySelector('.live-event')
    expect(within(hero).getByText(heroEvent.name)).toBeInTheDocument()
    for (const event of sideEvents) {
      expect(screen.getByRole('heading', { name: event.name })).toBeInTheDocument()
    }
    for (const event of ticker) {
      expect(screen.getByText(event.name)).toBeInTheDocument()
    }
  })

  it('frames the ticker as one series: wordmark, full title, dates, venue and a schedule link', () => {
    withRouter(<EventsBanner />)
    const header = document.querySelector('.ticker-series')
    expect(header).not.toBeNull()
    expect(header.querySelector('.tour-logo--wordmark .tour-logo__img')).not.toBeNull()
    expect(
      within(header).getByRole('heading', { level: 3, name: tickerSeries.name }),
    ).toBeInTheDocument()
    expect(within(header).getByText(tickerSeries.eyebrow)).toBeInTheDocument()
    expect(within(header).getByText(tickerSeries.dates)).toBeInTheDocument()
    expect(within(header).getByText(tickerSeries.venue)).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: tickerSeries.cta })).toHaveAttribute(
      'href',
      tickerSeries.href,
    )
    // The header carries the brand, so the chips no longer repeat the icon.
    const chips = document.querySelectorAll('.ticker-chip')
    expect(chips.length).toBe(ticker.length)
    for (const chip of chips) {
      expect(chip.querySelector('.tour-logo')).toBeNull()
    }
  })

  it("shows each chip's guarantee or entries, and the live chip leaders", () => {
    withRouter(<EventsBanner />)
    for (const event of ticker) {
      expect(screen.getAllByText(event.entries ?? event.guarantee).length).toBeGreaterThan(0)
    }
    const liveChips = ticker.filter((event) => event.live)
    for (const live of liveChips) {
      expect(screen.getByText(live.level)).toBeInTheDocument()
      for (const leader of live.leaders) {
        expect(screen.getByText(leader.stack)).toBeInTheDocument()
      }
    }
    expect(document.querySelectorAll('.ticker-chip .live-badge--sm').length).toBe(liveChips.length)
  })
})

describe('EventsBanner — status badges follow the date', () => {
  // Only Date is faked so user-event's timers keep working.
  const onDay = (year, month, day) =>
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(year, month - 1, day, 12) })
  afterEach(() => {
    vi.useRealTimers()
  })

  const byHref = new Map(festivals.map((festival) => [festival.href, festival]))
  const phaseOf = (event) => {
    const festival = byHref.get(event.href)
    return phaseOn(festival.start, festival.end, todayStamp())
  }
  const cards = () => [...document.querySelectorAll('.live-event, .side-event')]
  const badgeText = (card) => card.querySelector('.live-badge, .badge').textContent

  it('marks every series running today LIVE, the rest Upcoming (hero: Featured)', () => {
    // The day the hero and one side series were both running: 3 October 2026.
    onDay(2026, 10, 3)
    withRouter(<EventsBanner />)
    const events = [heroEvent, ...sideEvents]
    const live = events.filter((event) => phaseOf(event) === 'live')
    expect(live.length).toBeGreaterThan(1)
    cards().forEach((card, i) => {
      const phase = phaseOf(events[i])
      if (phase === 'live') {
        expect(badgeText(card)).toBe('LIVE')
        expect(card.querySelector('.live-badge--lg .live-badge__dot')).not.toBeNull()
      } else {
        expect(badgeText(card)).toBe(i === 0 ? 'Featured' : 'Upcoming')
      }
    })
  })

  it('shows nothing as live before any series starts, and Finished once they have all ended', () => {
    onDay(2020, 1, 1)
    const { unmount } = withRouter(<EventsBanner />)
    expect(document.querySelector('.live-event .live-badge, .side-event .live-badge')).toBeNull()
    expect(cards().map(badgeText)).toEqual(['Featured', 'Upcoming', 'Upcoming', 'Upcoming'])
    unmount()

    vi.setSystemTime(new Date(2030, 0, 1, 12))
    withRouter(<EventsBanner />)
    expect(document.querySelector('.live-event .live-badge, .side-event .live-badge')).toBeNull()
    expect(cards().map(badgeText)).toEqual(['Finished', 'Finished', 'Finished', 'Finished'])
  })
})

describe('ImagePlaceholder — swappable for a real image', () => {
  it('renders decorative stripes with a label when there is no src', () => {
    const { container } = render(<ImagePlaceholder label="story image" className="x" />)
    const box = container.firstChild
    expect(box).toHaveAttribute('aria-hidden', 'true')
    expect(box.className).toContain('image-placeholder')
    expect(box.className).toContain('x')
    expect(box.textContent).toBe('[ story image ]')
  })

  it('renders an <img> with the same class once a src is provided', () => {
    render(<ImagePlaceholder src="/p.webp" alt="A photo" width={96} height={64} className="x" />)
    const img = screen.getByAltText('A photo')
    expect(img.className).toContain('x')
    expect(img).toHaveAttribute('loading', 'lazy')
  })
})

describe('home fixtures — shape each section renders', () => {
  const hasLinks = (items) => {
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.href, JSON.stringify(item)).toBeTruthy()
    }
  }

  it('events: hero, three side events on the calendar, ticker chips with a figure', () => {
    expect(heroEvent.name && heroEvent.dates && heroEvent.place && heroEvent.venue).toBeTruthy()
    expect(sideEvents).toHaveLength(3)
    // The badges are read off the calendar row's dates, so each card must be
    // a series festivals.js knows.
    const hrefs = festivals.map((festival) => festival.href)
    for (const event of [heroEvent, ...sideEvents]) expect(hrefs, event.name).toContain(event.href)
    const codes = calendarPage.tours.map((t) => t.code)
    for (const event of [heroEvent, ...sideEvents, ...ticker]) {
      expect(codes, event.name).toContain(event.tour)
    }
    expect(codes).toContain(tickerSeries.tour)
    expect(
      tickerSeries.name && tickerSeries.eyebrow && tickerSeries.dates && tickerSeries.venue,
    ).toBeTruthy()
    expect(tickerSeries.cta && tickerSeries.href).toBeTruthy()
    hasLinks(ticker)
    for (const event of ticker) {
      expect(event.buyIn && event.currency && event.name && event.date).toBeTruthy()
      expect(event.entries ?? event.guarantee, event.name).toBeTruthy()
    }
    // A live chip needs a results feed behind it: level plus the top three stacks.
    for (const live of ticker.filter((event) => event.live)) {
      expect(live.level).toBeTruthy()
      expect(live.leaders).toHaveLength(3)
    }
  })

  it('news lists carry a title, a date and a link', () => {
    expect(featuredNews.hero.title && featuredNews.hero.excerpt).toBeTruthy()
    for (const list of [featuredNews.items, liveNews.items]) {
      hasLinks(list)
      for (const item of list) expect(item.title && item.date).toBeTruthy()
    }
    // Stories are teasers with no page behind them: title, date and artwork, no link.
    expect(stories.items.length).toBeGreaterThan(0)
    for (const item of stories.items) {
      expect(item.title && item.date && item.imageSrc, item.title).toBeTruthy()
      expect(item.href, item.title).toBeUndefined()
      expect(existsSync(join('public', item.imageSrc)), item.imageSrc).toBe(true)
    }
  })

  it('shorts have a duration, title and poster, and no link', () => {
    // Teasers with no page or video behind them yet, like the stories.
    expect(shorts.items.length).toBeGreaterThan(0)
    for (const item of shorts.items) {
      expect(item.duration && item.title && item.posterSrc, item.title).toBeTruthy()
      expect(item.href, item.title).toBeUndefined()
      expect(existsSync(join('public', item.posterSrc)), item.posterSrc).toBe(true)
    }
  })

  it('calendar entries have a day, month, name, range and venue', () => {
    hasLinks(calendar.items)
    for (const entry of calendar.items) {
      expect(entry.day && entry.month && entry.name && entry.range && entry.venue).toBeTruthy()
    }
  })

  it('champions carry a name, title, series, date, prize and portrait', () => {
    // Empty until a result lands; the coming-soon test below pins that.
    for (const champion of recentChampions.items) {
      expect(champion.href, champion.name).toBeTruthy()
      expect(
        champion.name && champion.event && champion.series && champion.date && champion.prize,
        champion.name,
      ).toBeTruthy()
      if (champion.portraitSrc) {
        expect(existsSync(join('public', champion.portraitSrc)), champion.portraitSrc).toBe(true)
      }
    }
  })

  it('standings are ranked 1..n with points and earnings', () => {
    playersOfTheYear.items.forEach((player, i) => {
      expect(player.href, player.name).toBeTruthy()
      expect(player.rank).toBe(i + 1)
      expect(player.name && player.country && player.points && player.earnings).toBeTruthy()
      expect(typeof player.cashes).toBe('number')
      if (player.avatarSrc) {
        expect(existsSync(join('public', player.avatarSrc)), player.avatarSrc).toBe(true)
      }
    })
  })

  it('champions and standings say they are coming soon until there is data', () => {
    for (const [section, Component] of [
      [recentChampions, RecentChampions],
      [playersOfTheYear, PlayersOfTheYear],
    ]) {
      const { unmount } = withRouter(<Component />)
      expect(section.items).toHaveLength(0)
      expect(section.pending.title && section.pending.body).toBeTruthy()
      expect(screen.getByText(section.pending.title)).toBeInTheDocument()
      expect(screen.getByText(section.pending.body)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: section.cta.label })).toHaveAttribute(
        'href',
        section.cta.to,
      )
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('Asia tours and partners have what their cards read', () => {
    expect(asiaTours.items.length).toBeGreaterThan(0)
    for (const tour of asiaTours.items) {
      expect(tour.name && tour.dates && tour.country && tour.logoSrc, tour.name).toBeTruthy()
      expect(asiaTours.flags[tour.country], tour.country).toBeTruthy()
      expect(existsSync(join('public', tour.logoSrc)), tour.logoSrc).toBe(true)
      expect(existsSync(join('public', asiaTours.flags[tour.country])), tour.country).toBe(true)
    }
    expect(partners.items.length).toBeGreaterThan(0)
    for (const partner of partners.items) expect(partner.name).toBeTruthy()
  })
})
