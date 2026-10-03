// Contract: every operator in calendarPage.tours has a page at the href that
// list carries (/series/<slug>) — the page "APL poker" lands on — and /series
// indexes them. A page is the operator's series on the calendar, the rooms it
// deals at, the cities it visits and a link to its own site, built from rows
// already on the site.
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import TourPage from '../pages/TourPage.jsx'
import ToursPage from '../pages/ToursPage.jsx'
import { tourPages, tourFor, tourPage, toursPath, brandName } from '../content/tourPages.js'
import { calendarPage } from '../content/calendarPage.js'
import { festivals } from '../content/festivals.js'
import { ROUTES } from '../routes.js'
import { site } from '../config/site.config.js'
import { legacyRedirects } from '../config/server.config.js'

expect.extend(toHaveNoViolations)

const wrap = (path, page) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
    </HelmetProvider>,
  )

describe('tourPages content', () => {
  it('builds one page per tour at its href, carrying every series with that code', () => {
    expect(tourPages).toHaveLength(calendarPage.tours.length)
    for (const tour of tourPages) {
      expect(tour.path).toMatch(/^\/series\/[a-z0-9-]+$/)
      expect(tour.path).toBe(`${toursPath}/${tour.slug}`)
      expect(tour.series).toEqual(
        festivals
          .filter((f) => f.tour === tour.code)
          .sort((a, b) => a.start.localeCompare(b.start)),
      )
      for (const venue of tour.venues) expect(venue.tours).toContain(tour.code)
      expect(tour.seo.title).toContain(brandName(tour))
      expect(tour.seo.description.length, `${tour.name}: description`).toBeLessThanOrEqual(200)
      expect(tour.heading).toContain(brandName(tour))
    }
    expect(tourFor('/series/apl')?.code).toBe('APL')
    expect(tourFor('/series/nope')).toBeUndefined()
  })

  it('puts "Poker" in the name a search starts with', () => {
    expect(brandName({ name: 'APL' })).toBe('APL Poker')
    expect(brandName({ name: 'Kings Poker' })).toBe('Kings Poker')
    expect(brandName({ name: 'Australian Poker Tour' })).toBe('Australian Poker Tour')
  })

  it('is routed: the index and one route per tour, linked from the footer', () => {
    expect(ROUTES.find((route) => route.path === toursPath)?.module).toBe('src/pages/ToursPage.jsx')
    for (const tour of tourPages) {
      const route = ROUTES.find((route) => route.path === tour.path)
      expect(route?.module, tour.path).toBe('src/pages/TourPage.jsx')
      expect(route?.props).toEqual({ path: tour.path })
    }
    expect(site.footer.columns.flatMap((col) => col.links).some((l) => l.to === toursPath)).toBe(
      true,
    )
  })
})

describe('the old /tours addresses', () => {
  it('301 to the same page under /series', () => {
    expect(legacyRedirects['/tours']).toBe(toursPath)
    for (const tour of tourPages) {
      expect(legacyRedirects[`/tours/${tour.slug}`], tour.code).toBe(tour.path)
    }
  })
})

describe('TourPage', () => {
  const apl = tourFor('/series/apl')

  it('renders the heading, intro, official site, every series and venue, and the other tours', () => {
    wrap(apl.path, <TourPage path={apl.path} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(apl.heading)
    expect(screen.getByText(apl.intro)).toBeInTheDocument()
    const official = screen.getByRole('link', { name: tourPage.officialSite })
    expect(official).toHaveAttribute('href', apl.website)
    expect(official).toHaveAttribute('rel', expect.stringContaining('noopener'))
    for (const festival of apl.series) {
      expect(
        screen.getAllByRole('link').some((link) => link.getAttribute('href') === festival.href),
        festival.name,
      ).toBe(true)
    }
    for (const venue of apl.venues) {
      expect(screen.getByRole('heading', { level: 3, name: venue.name })).toBeInTheDocument()
    }
    const cities = screen.getByRole('region', { name: tourPage.citiesHeading })
    for (const city of apl.cities) {
      expect(within(cities).getByRole('link', { name: city.heading })).toHaveAttribute(
        'href',
        city.path,
      )
    }
    const others = screen.getByRole('navigation', { name: tourPage.otherHeading })
    expect(within(others).getAllByRole('link')).toHaveLength(tourPages.length - 1)
    expect(within(others).queryByRole('link', { name: apl.name })).toBeNull()
  })

  it('says so when a tour has nothing upcoming', () => {
    const quiet = tourPages.find((tour) => tour.series.every((f) => f.end < '2026-01-01'))
    if (!quiet) return
    wrap(quiet.path, <TourPage path={quiet.path} />)
    expect(screen.getByText(tourPage.noUpcoming(quiet))).toBeInTheDocument()
  })

  // One axe run per tour, in sequence: about 4 s alone, more under the full
  // suite's parallel load, so the 5 s default is too tight.
  it('renders every tour with no axe violations', { timeout: 20000 }, async () => {
    for (const tour of tourPages) {
      const { container, unmount } = wrap(tour.path, <TourPage path={tour.path} />)
      expect(await axe(container)).toHaveNoViolations()
      unmount()
    }
  })
})

describe('ToursPage', () => {
  it('lists every tour as a card through to its page', async () => {
    const { container } = wrap(toursPath, <ToursPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(tourPage.index.heading)
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    for (const tour of tourPages) expect(hrefs, tour.name).toContain(tour.path)
    expect(await axe(container)).toHaveNoViolations()
  })
})
