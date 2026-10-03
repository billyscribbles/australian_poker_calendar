// Contract: every city the calendar's series are dealt in has a page at
// /poker/<slug> — the page "poker in Sydney" lands on — built from the rows
// already on the site: its series (upcoming first), its venues, the operators
// that run there and the way through to every other city. A series printed
// with a city no row here knows fails, which is the prompt to add the city.
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import CityPage from '../pages/CityPage.jsx'
import { cities, CITY_ROWS, cityFor, cityPage, placeCity, listNames } from '../content/cities.js'
import { festivals } from '../content/festivals.js'
import { venues } from '../content/whereToPlay.js'
import { ROUTES } from '../routes.js'

expect.extend(toHaveNoViolations)

const renderCity = (city) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[city.path]}>
        <CityPage path={city.path} />
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('cities content', () => {
  it('knows every city a festival row is placed in', () => {
    const known = new Set(CITY_ROWS.flatMap((row) => row.places))
    for (const festival of festivals) {
      const place = placeCity(festival.place)
      expect(known.has(place), `${festival.name}: "${place}" has no city in cities.js`).toBe(true)
    }
  })

  it('knows every city a venue is tagged with, and tags every venue', () => {
    const slugs = new Set(CITY_ROWS.map((row) => row.slug))
    for (const venue of venues) {
      expect(venue.city, `${venue.name}: city`).toBeTruthy()
      expect(slugs.has(venue.city), `${venue.name}: "${venue.city}"`).toBe(true)
    }
  })

  it('builds a page for every city with a series or a venue, with its own head copy', () => {
    expect(cities.length).toBeGreaterThanOrEqual(10)
    for (const city of cities) {
      expect(city.path).toBe(`/poker/${city.slug}`)
      expect(city.series.length + city.venues.length, city.name).toBeGreaterThan(0)
      expect(city.seo.title).toContain(`Poker in ${city.name}`)
      expect(city.seo.description.length, `${city.name}: description`).toBeLessThanOrEqual(200)
      expect(city.heading).toBe(`Poker in ${city.name}`)
      expect(city.intro).toContain(city.blurb)
      for (const festival of city.series) {
        expect(city.places).toContain(placeCity(festival.place))
      }
      for (const venue of city.venues) expect(venue.city).toBe(city.slug)
      // Series are in start order so "upcoming" reads chronologically.
      const starts = city.series.map((f) => f.start)
      expect(starts).toEqual([...starts].sort())
    }
    expect(cityFor('/poker/sydney')?.name).toBe('Sydney')
    expect(cityFor('/poker/nowhere')).toBeUndefined()
  })

  it('folds the greater-area places into the city people search for', () => {
    expect(cityFor('/poker/melbourne').places).toContain('South Melbourne')
    expect(cityFor('/poker/brisbane').places).toContain('Beenleigh')
    expect(listNames(['A', 'B', 'C'])).toBe('A, B and C')
    expect(listNames(['A'])).toBe('A')
  })

  it('is routed once per city', () => {
    for (const city of cities) {
      const route = ROUTES.find((route) => route.path === city.path)
      expect(route?.module, city.path).toBe('src/pages/CityPage.jsx')
      expect(route?.props).toEqual({ path: city.path })
    }
  })
})

describe('CityPage', () => {
  const sydney = cityFor('/poker/sydney')

  it('renders the heading, intro, every series, venue and operator, and the other cities', () => {
    renderCity(sydney)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Poker in Sydney')
    expect(screen.getByText(sydney.intro)).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(
      'Where to Play',
    )

    for (const festival of sydney.series) {
      // Names nest ("APT Sydney Champs", "APT Sydney Champs II"), so match on href.
      expect(
        screen.getAllByRole('link').some((link) => link.getAttribute('href') === festival.href),
        festival.name,
      ).toBe(true)
    }
    for (const venue of sydney.venues) {
      expect(screen.getByRole('heading', { level: 3, name: venue.name })).toBeInTheDocument()
    }
    const operators = screen.getByRole('region', { name: cityPage.operatorsHeading(sydney) })
    for (const tour of sydney.operators) {
      expect(within(operators).getByRole('link', { name: tour.name })).toHaveAttribute(
        'href',
        tour.href,
      )
    }
    const others = screen.getByRole('navigation', { name: cityPage.otherHeading })
    for (const city of cities.filter((c) => c.slug !== 'sydney')) {
      expect(within(others).getByRole('link', { name: city.heading })).toHaveAttribute(
        'href',
        city.path,
      )
    }
    expect(within(others).queryByRole('link', { name: 'Poker in Sydney' })).toBeNull()
  })

  it('emits breadcrumb and event-list structured data', () => {
    renderCity(sydney)
    const scripts = () =>
      [...document.head.querySelectorAll('script[type="application/ld+json"]')].map((el) =>
        JSON.parse(el.textContent),
      )
    return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
      const types = scripts().map((ld) => ld['@type'])
      expect(types).toContain('BreadcrumbList')
      expect(types).toContain('ItemList')
      const list = scripts().find((ld) => ld['@type'] === 'ItemList')
      expect(list.numberOfItems).toBe(sydney.series.length)
      expect(list.itemListElement[0].item['@type']).toBe('Event')
    })
  })

  // One axe run per city, in sequence; the 5 s default is too tight once the
  // big cities list a few dozen series.
  it('renders every city with no axe violations', { timeout: 20000 }, async () => {
    for (const city of cities) {
      const { container, unmount } = renderCity(city)
      expect(await axe(container)).toHaveNoViolations()
      unmount()
    }
  })
})
