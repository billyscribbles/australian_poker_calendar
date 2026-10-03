// Contract: the Where to Play tab lands on a page that lists every venue the
// series are dealt at, grouped by state, each with its street address, the
// operators that play there and a link out — readable from the static HTML.
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import WhereToPlayPage from '../pages/WhereToPlayPage.jsx'
import { whereToPlay, STATES } from '../content/whereToPlay.js'
import { calendarPage } from '../content/calendarPage.js'
import { ROUTES } from '../routes.js'
import { site } from '../config/site.config.js'

expect.extend(toHaveNoViolations)

const PATH = '/where-to-play'
const tourCodes = new Set(calendarPage.tours.map((tour) => tour.code))

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[PATH]}>
        <WhereToPlayPage />
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('whereToPlay content', () => {
  it('has venues in every listed state, sorted by name, each with a full address', () => {
    expect(whereToPlay.states.length).toBeGreaterThan(0)
    const order = STATES.map((state) => state.code)
    expect(whereToPlay.states.map((state) => state.code)).toEqual(
      order.filter((code) => whereToPlay.states.some((state) => state.code === code)),
    )
    for (const state of whereToPlay.states) {
      expect(state.venues.length, state.code).toBeGreaterThan(0)
      const names = state.venues.map((venue) => venue.name)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en-AU')))
      for (const venue of state.venues) {
        expect(venue.street, venue.name).toBeTruthy()
        expect(venue.suburb, venue.name).toBeTruthy()
        expect(venue.postcode, venue.name).toMatch(/^\d{4}$/)
        expect(venue.address).toContain(`${state.code} ${venue.postcode}`)
        expect(venue.website, venue.name).toMatch(/^https?:\/\//)
      }
    }
  })

  it('names only operators the calendar knows, with their site to link to', () => {
    for (const state of whereToPlay.states) {
      for (const venue of state.venues) {
        for (const operator of venue.operators) {
          expect(tourCodes.has(operator.code), `${venue.name}: ${operator.code}`).toBe(true)
          expect(operator.website).toMatch(/^https?:\/\//)
        }
      }
    }
  })

  it('gives every room without a series its own mark, with a file and both colours', () => {
    const marked = whereToPlay.states.flatMap((state) => state.venues).filter((v) => v.mark)
    expect(marked.length).toBeGreaterThan(0)
    for (const venue of marked) {
      expect(venue.operators, venue.name).toHaveLength(0)
      expect(existsSync(resolve('public', `.${venue.mark.iconSrc}`)), venue.name).toBe(true)
      expect(venue.mark.primary, venue.name).toMatch(/^#[0-9A-F]{6}$/i)
      expect(venue.mark.iconBg, venue.name).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })

  it('gives every league its states, a line, a link and a mark that resolves', () => {
    const stateCodes = new Set(STATES.map((state) => state.code))
    expect(whereToPlay.leagues.list.length).toBeGreaterThan(0)
    for (const league of whereToPlay.leagues.list) {
      expect(league.states.length, league.name).toBeGreaterThan(0)
      for (const code of league.states) expect(stateCodes.has(code), league.name).toBe(true)
      expect(league.about, league.name).toBeTruthy()
      expect(league.website, league.name).toMatch(/^https?:\/\//)
      if (league.code) expect(tourCodes.has(league.code), league.name).toBe(true)
      else expect(existsSync(resolve('public', `.${league.mark.iconSrc}`)), league.name).toBe(true)
    }
  })

  it('lists each venue once', () => {
    const ids = whereToPlay.states.flatMap((state) => state.venues.map((venue) => venue.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('WhereToPlayPage', () => {
  it('is routed and linked from the nav', () => {
    expect(ROUTES.some((route) => route.path === PATH)).toBe(true)
    expect(site.nav.some((item) => item.to === PATH)).toBe(true)
  })

  it('renders a section per state with every venue, its address and links', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(whereToPlay.title)
    const jump = screen.getByRole('navigation', { name: whereToPlay.jumpLabel })
    for (const state of whereToPlay.states) {
      expect(within(jump).getByRole('link', { name: new RegExp(state.name) })).toHaveAttribute(
        'href',
        `#${state.code}`,
      )
      const section = screen.getByRole('region', { name: state.name })
      const cards = within(section).getAllByRole('listitem')
      expect(cards).toHaveLength(state.venues.length)
      for (const venue of state.venues) {
        expect(within(section).getByRole('heading', { level: 3, name: venue.name })).toBeTruthy()
        expect(within(section).getByText(venue.address)).toBeInTheDocument()
        const link = within(section).getByRole('link', {
          name: `${whereToPlay.visitLabel}: ${venue.name}`,
        })
        expect(link).toHaveAttribute('href', venue.website)
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
      }
    }
  })

  it('shows each operator’s mark in its own colours and links to its site', () => {
    const { container } = renderPage()
    for (const state of whereToPlay.states) {
      for (const venue of state.venues) {
        for (const operator of venue.operators) {
          expect(
            container.querySelector(`.venue-card .tour-logo--icon[style*="--tour-primary"]`),
            `${venue.name}: ${operator.code}`,
          ).not.toBeNull()
          expect(
            screen
              .getAllByRole('link', { name: operator.name })
              .some((link) => link.getAttribute('href') === operator.website),
          ).toBe(true)
        }
      }
    }
  })

  it('leaves the operators line off a room with no operator on the calendar', () => {
    renderPage()
    const bare = whereToPlay.states
      .flatMap((state) => state.venues)
      .filter((venue) => venue.operators.length === 0)
    expect(bare.length).toBeGreaterThan(0)
    for (const venue of bare) {
      const card = screen.getByRole('heading', { level: 3, name: venue.name }).closest('li')
      expect(within(card).queryByText(whereToPlay.operatorsLabel), venue.name).toBeNull()
    }
  })

  it('opens on poker rooms and switches to the leagues with the tab', () => {
    renderPage()
    const tabs = screen.getByRole('tablist', { name: whereToPlay.tabs.label })
    const rooms = within(tabs).getByRole('tab', { name: new RegExp(whereToPlay.tabs.rooms) })
    const leagues = within(tabs).getByRole('tab', { name: new RegExp(whereToPlay.tabs.leagues) })
    expect(rooms).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.queryByRole('heading', { level: 2, name: whereToPlay.leagues.heading }),
    ).toBeNull()

    fireEvent.click(leagues)
    expect(leagues).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('heading', { level: 2, name: whereToPlay.leagues.heading }),
    ).toBeTruthy()
    for (const league of whereToPlay.leagues.list) {
      expect(screen.getByRole('heading', { level: 3, name: league.name })).toBeTruthy()
    }
    expect(screen.queryByRole('region', { name: whereToPlay.states[0].name })).toBeNull()
  })

  it('renders with no axe violations', async () => {
    const { container } = renderPage()
    expect(await axe(container)).toHaveNoViolations()
  })
})
