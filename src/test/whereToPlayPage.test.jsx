// Contract: the Where to Play tab lands on a page that lists every venue the
// series are dealt at, grouped by state, each with its street address, the
// operators that play there and a link out — readable from the static HTML.
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
        expect(venue.tours.length, venue.name).toBeGreaterThan(0)
        for (const operator of venue.operators) {
          expect(tourCodes.has(operator.code), `${venue.name}: ${operator.code}`).toBe(true)
          expect(operator.website).toMatch(/^https?:\/\//)
        }
      }
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

  it('renders with no axe violations', async () => {
    const { container } = renderPage()
    expect(await axe(container)).toHaveNoViolations()
  })
})
