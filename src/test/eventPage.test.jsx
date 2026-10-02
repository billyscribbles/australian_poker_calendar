// Contract: /events/apt-melbourne-champs-ii is the series poster as a page —
// brand hero, the four headline stats, and the full day-by-day schedule with
// featured rows and the rows that feed another series marked.
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import EventPage from '../pages/EventPage.jsx'
import { event } from '../content/eventMelbourneChampsII.js'
import { ROUTES } from '../routes.js'

expect.extend(toHaveNoViolations)

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[event.path]}>
        <EventPage />
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('EventPage — APT Melbourne Champs II', () => {
  it('is routed at the href the home page and calendar link to', () => {
    expect(event.path).toBe('/events/apt-melbourne-champs-ii')
    const route = ROUTES.find((r) => r.path === event.path)
    expect(route?.module).toBe('src/pages/EventPage.jsx')
  })

  it('shows the series name, dates, venue and the four headline stats', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(event.title)
    expect(screen.getByText(event.dates)).toBeInTheDocument()
    expect(screen.getByText(event.venue)).toBeInTheDocument()
    expect(event.stats).toHaveLength(4)
    for (const stat of event.stats) {
      expect(screen.getByText(stat.value)).toBeInTheDocument()
    }
  })

  it('lists every row of the schedule under its day', () => {
    renderPage()
    const table = screen.getByRole('table', { name: /schedule/i })
    expect(event.schedule.length).toBe(58)
    expect(within(table).getAllByRole('row')).toHaveLength(event.schedule.length + 1)
    // Day cells: one per calendar day, spanning that day's rows.
    const days = [...new Set(event.schedule.map((r) => r.date))]
    expect(days).toHaveLength(12)
    expect(within(table).getAllByRole('rowheader')).toHaveLength(days.length)
    expect(within(table).getByText('The Crown Opener')).toBeInTheDocument()
    expect(within(table).getByText('Monster Stack')).toBeInTheDocument()
  })

  it('marks featured rows and rows that feed another series', () => {
    const { container } = renderPage()
    const featured = event.schedule.filter((r) => r.featured).length
    const feeds = event.schedule.filter((r) => r.feeds).length
    expect(featured).toBeGreaterThan(0)
    expect(feeds).toBeGreaterThan(0)
    expect(container.querySelectorAll('.schedule__row--featured')).toHaveLength(featured)
    expect(container.querySelectorAll('.schedule__row--feeds')).toHaveLength(feeds)
  })

  it('links to the official site', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /official site/i })).toHaveAttribute(
      'href',
      event.website,
    )
  })

  it('renders with no axe violations', async () => {
    const { container } = renderPage()
    expect(await axe(container)).toHaveNoViolations()
  })
})
