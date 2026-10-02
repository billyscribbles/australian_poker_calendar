// Contract: the "Poker rooms across Australia" strip shows every tour's
// wordmark once, visible to assistive tech and crawlers, linking out to the
// room's own site. The looping clone is decorative and hidden.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PokerRooms from '../components/PokerRooms.jsx'
import { pokerRooms } from '../content/pokerRooms.js'
import { calendarPage } from '../content/calendarPage.js'
import { tourBrands } from '../content/tourBrands.js'

describe('PokerRooms', () => {
  it('lists every tour exactly once for assistive tech, as a link to its site', () => {
    render(<PokerRooms />)
    expect(screen.getByRole('heading', { level: 2, name: pokerRooms.heading })).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(pokerRooms.rooms.length)
    for (const room of pokerRooms.rooms) {
      const link = screen.getByRole('link', { name: room.name })
      expect(link).toHaveAttribute('href', room.website)
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })

  it('duplicates the track for the seamless loop but hides the clone', () => {
    const { container } = render(<PokerRooms />)
    const tracks = container.querySelectorAll('.poker-rooms__track')
    expect(tracks).toHaveLength(2)
    expect(tracks[1]).toHaveAttribute('aria-hidden', 'true')
    expect(tracks[1].querySelectorAll('img')).toHaveLength(pokerRooms.rooms.length)
  })

  it('dresses each tile in the room’s own brand colours', () => {
    const { container } = render(<PokerRooms />)
    for (const room of pokerRooms.rooms) {
      const tile = container.querySelector(`[data-tour="${room.code}"]`)
      expect(tile, room.code).not.toBeNull()
      expect(tile.style.getPropertyValue('--tour-primary')).toBe(tourBrands[room.code].primary)
      expect(tile).toHaveAttribute('data-logo', room.tone)
    }
  })

  it('content: every room is a calendar tour with a wordmark and a brand profile', () => {
    expect(pokerRooms.rooms.length).toBeGreaterThan(0)
    const byCode = new Map(calendarPage.tours.map((t) => [t.code, t]))
    for (const room of pokerRooms.rooms) {
      expect(byCode.get(room.code), room.code).toBeTruthy()
      expect(room.logoSrc, room.code).toMatch(/^\/images\/tours\//)
      expect(room.website, room.code).toMatch(/^https:\/\//)
      expect(tourBrands[room.code], room.code).toBeTruthy()
      expect(['light', 'dark']).toContain(room.tone)
    }
  })

  it('content: Crown and Aurum take inverse lockups on the dark card, not a white one', () => {
    const crown = pokerRooms.rooms.find((r) => r.code === 'CROWN')
    expect(crown.tone).toBe('light')
    expect(crown.logoSrc).toBe('/images/tours/crown-on-dark.png')
    const aurum = pokerRooms.rooms.find((r) => r.code === 'AURUM')
    expect(aurum.tone).toBe('light')
    expect(aurum.logoSrc).toBe('/images/tours/aurum-on-dark.png')
  })
})
