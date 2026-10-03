// Contract: the Poker Players nav item lands on the Australian Global Poker
// Index standings, the GPI ranking and PoY behind tabs, every row linked to its
// GPI profile, with the source and GPI's last update credited on the page.
import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import PlayersPage from '../pages/PlayersPage.jsx'
import { playersPage } from '../content/playersPage.js'
import { gpiRankings } from '../content/gpiRankings.js'
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

describe('gpiRankings data', () => {
  it('has the GPI board first, as the default tab, then PoY', () => {
    expect(gpiRankings.boards.map((b) => b.id)).toEqual(['gpi', 'poy'])
  })

  it.each(gpiRankings.boards.map((b) => [b.id, b]))(
    '%s is ranked 1..n with points, a global rank and a GPI profile',
    (_, board) => {
      expect(board.label && board.title && board.globalRankLabel).toBeTruthy()
      expect(board.standings.length).toBeGreaterThan(0)
      board.standings.forEach((player, i) => {
        expect(player.rank).toBe(i + 1)
        expect(player.name, `row ${i + 1}`).toBeTruthy()
        expect(player.points).toMatch(/^\d{1,3}(,\d{3})*\.\d{2}$/)
        expect(Number.isInteger(player.globalRank)).toBe(true)
        expect(player.href).toMatch(/^https:\/\/www\.globalpokerindex\.com\/poker-players\/.+\/$/)
      })
      expect(new Set(board.standings.map((p) => p.href)).size).toBe(board.standings.length)
    },
  )

  it('names its source, last update and a logo that exists', () => {
    expect(gpiRankings.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(gpiRankings.updatedLabel).toBeTruthy()
    expect(gpiRankings.source.href).toMatch(/^https:\/\/www\.globalpokerindex\.com\//)
    expect(existsSync(join('public', gpiRankings.source.logoSrc))).toBe(true)
  })
})

describe('PlayersPage', () => {
  it('is routed, indexable now it has standings, and linked from the nav', () => {
    const route = ROUTES.find((r) => r.path === '/players')
    expect(route?.noindex).toBeFalsy()
    expect(site.nav.some((item) => item.to === '/players')).toBe(true)
  })

  it('shows the GPI ranking first and switches to PoY, every row linked to GPI', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(playersPage.title)
    expect(screen.getByRole('tab', { name: 'GPI' })).toHaveAttribute('aria-selected', 'true')
    for (const board of gpiRankings.boards) {
      fireEvent.click(screen.getByRole('tab', { name: board.label }))
      expect(screen.getByRole('tab', { name: board.label })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      const table = screen.getByRole('table')
      expect(within(table).getAllByRole('row')).toHaveLength(board.standings.length + 1)
      const first = board.standings[0]
      expect(within(table).getByRole('link', { name: first.name })).toHaveAttribute(
        'href',
        first.href,
      )
    }
  })

  it('carries both boards in the markup so crawlers see both', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('table')).toHaveLength(gpiRankings.boards.length)
  })

  it('credits GPI with a link to the source table and the last update', () => {
    renderPage()
    expect(screen.getByRole('link', { name: new RegExp(playersPage.source.name) })).toHaveAttribute(
      'href',
      playersPage.source.href,
    )
    expect(screen.getByText(playersPage.updatedText)).toHaveAttribute(
      'datetime',
      playersPage.updated,
    )
    for (const item of playersPage.how.items) {
      expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeInTheDocument()
    }
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

describe('PlayersPage search', () => {
  const searchBox = () => screen.getByRole('searchbox', { name: playersPage.search.label })
  const panel = () => within(screen.getByRole('tabpanel'))
  const activeTable = () => panel().getByRole('table')

  it('filters the active board by name, ignoring case, and hides the podium', () => {
    renderPage()
    const [first] = gpiRankings.boards
    const target = first.standings[4]
    expect(panel().getByRole('list', { name: playersPage.podium.label(first.title) })).toBeVisible()
    fireEvent.change(searchBox(), { target: { value: target.name.toUpperCase() } })
    const matches = first.standings.filter((p) =>
      p.name.toLowerCase().includes(target.name.toLowerCase()),
    )
    expect(within(activeTable()).getAllByRole('row')).toHaveLength(matches.length + 1)
    expect(within(activeTable()).getByRole('link', { name: target.name })).toBeInTheDocument()
    expect(
      panel().getByText(playersPage.search.count(matches.length, first.standings.length)),
    ).toBeInTheDocument()
    expect(
      panel().queryByRole('list', { name: playersPage.podium.label(first.title) }),
    ).not.toBeInTheDocument()
  })

  it('keeps the query across tabs and says so when nothing matches', () => {
    renderPage()
    fireEvent.change(searchBox(), { target: { value: 'zzqqx' } })
    expect(panel().queryByRole('table')).not.toBeInTheDocument()
    expect(panel().getByText(playersPage.search.empty('zzqqx'))).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: gpiRankings.boards[1].label }))
    expect(panel().getByText(playersPage.search.empty('zzqqx'))).toBeVisible()
  })

  it('cross-references each row with its rank on the other board', () => {
    renderPage()
    const [first, second] = gpiRankings.boards
    const both = first.standings.find((p) => second.standings.some((q) => q.href === p.href))
    const onSecond = second.standings.find((q) => q.href === both?.href)
    const row = within(activeTable()).getByRole('link', { name: both?.name }).closest('tr')
    expect(row).toHaveTextContent(`#${onSecond?.rank}`)
    expect(
      within(activeTable()).getByRole('columnheader', {
        name: playersPage.table.otherRank(second.label),
      }),
    ).toBeInTheDocument()
  })

  it('names each stat from its own board', () => {
    renderPage()
    for (const board of gpiRankings.boards) {
      expect(screen.getAllByText(board.standings[0].name).length).toBeGreaterThan(0)
    }
  })
})
