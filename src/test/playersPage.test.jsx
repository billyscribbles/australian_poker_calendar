// Contract: the Poker Players nav item lands on a real page that says the
// rankings are coming and how points will be awarded, until standings exist.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import PlayersPage from '../pages/PlayersPage.jsx'
import { playersPage } from '../content/playersPage.js'
import { ROUTES } from '../routes.js'
import { site } from '../config/site.config.js'

expect.extend(toHaveNoViolations)

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/players']}>
        <PlayersPage />
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('PlayersPage', () => {
  it('is routed, noindexed while it holds no standings, and linked from the nav', () => {
    const route = ROUTES.find((r) => r.path === '/players')
    expect(route?.noindex).toBe(true)
    expect(site.nav.some((item) => item.to === '/players')).toBe(true)
  })

  it('says the stats are coming soon and how points are awarded', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(playersPage.title)
    for (const item of playersPage.how.items) {
      expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: playersPage.source.name })).toHaveAttribute(
      'href',
      playersPage.source.href,
    )
    expect(screen.getByRole('link', { name: playersPage.cta.label })).toHaveAttribute(
      'href',
      playersPage.cta.to,
    )
  })

  it('renders with no axe violations', async () => {
    const { container } = renderPage()
    expect(await axe(container)).toHaveNoViolations()
  })
})
