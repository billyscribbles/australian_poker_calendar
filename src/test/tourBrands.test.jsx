import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { calendarPage } from '../content/calendarPage.js'
import { tourBrands, tourBrandStyle } from '../content/tourBrands.js'
import FestivalTimeline from '../components/FestivalTimeline.jsx'
import TourLogo from '../components/TourLogo.jsx'

const HEX = /^#[0-9A-F]{6}$/

describe('tourBrands — poker room colour profiles', () => {
  it('has a profile with two hex colours and a logo tone for every tour on the calendar', () => {
    for (const tour of calendarPage.tours) {
      const brand = tourBrands[tour.code]
      expect(brand, tour.code).toBeTruthy()
      expect(brand.primary, tour.code).toMatch(HEX)
      expect(brand.secondary, tour.code).toMatch(HEX)
      expect(['light', 'dark'], tour.code).toContain(brand.logo)
      expect(brand.iconBg, tour.code).toMatch(HEX)
      expect(brand.source, tour.code).toMatch(/^https:\/\//)
    }
  })

  it('has no profile for a tour that is not on the calendar', () => {
    const codes = calendarPage.tours.map((t) => t.code)
    for (const code of Object.keys(tourBrands)) expect(codes).toContain(code)
  })

  it('exposes the profile as CSS custom properties, and nothing for an unknown code', () => {
    expect(tourBrandStyle('KINGS')).toEqual({
      '--tour-primary': tourBrands.KINGS.primary,
      '--tour-secondary': tourBrands.KINGS.secondary,
      '--tour-icon-bg': tourBrands.KINGS.iconBg,
    })
    expect(tourBrandStyle('NOPE')).toEqual({})
  })
})

describe('brand colours on the calendar surfaces', () => {
  const festival = {
    tour: 'KINGS',
    name: 'Kings Poker Sydney Millions',
    start: '2026-10-27',
    end: '2026-11-09',
    place: 'Sydney, St. George Leagues Club',
    href: '/events/kings-poker-sydney-millions',
  }

  it('dresses a timeline bar in its tour colours, with the icon by the name and the wordmark unboxed', () => {
    render(
      <MemoryRouter>
        <FestivalTimeline festivals={[festival]} year={2026} month={10} today={0} />
      </MemoryRouter>,
    )
    const bar = screen.getByRole('link', { name: /Sydney Millions/ }).closest('li')
    expect(bar.style.getPropertyValue('--tour-primary')).toBe(tourBrands.KINGS.primary)
    expect(bar.style.getPropertyValue('--tour-secondary')).toBe(tourBrands.KINGS.secondary)
    const imgs = within(bar).getAllByRole('presentation', { hidden: true })
    const icon = imgs.find((i) => i.getAttribute('src') === '/images/tours/kings-icon.png')
    const wordmark = imgs.find((i) => i.getAttribute('src') === '/images/tours/kings.png')
    expect(icon.closest('.tour-logo')).toHaveClass('tour-logo--icon')
    expect(
      within(bar)
        .getByText(/Sydney Millions/)
        .contains(icon),
    ).toBe(true)
    expect(wordmark.closest('.tour-logo')).toHaveClass('tour-logo--wordmark')
    expect(bar.querySelector('.tour-logo--wordmark')).not.toHaveClass('tour-logo--icon')
  })

  it('draws the circle icon on the brand backing, and the wordmark from logoSrc', () => {
    const { container, rerender } = render(<TourLogo code="AURUM" variant="icon" size={48} />)
    const icon = container.querySelector('.tour-logo--icon')
    expect(icon.style.getPropertyValue('--tour-icon-bg')).toBe(tourBrands.AURUM.iconBg)
    expect(icon.style.getPropertyValue('--tour-logo-size')).toBe('48px')
    expect(icon.querySelector('img')).toHaveAttribute('src', '/images/tours/aurum-icon.png')
    rerender(<TourLogo code="AURUM" variant="wordmark" size={60} />)
    const mark = container.querySelector('.tour-logo--wordmark')
    expect(mark.querySelector('img')).toHaveAttribute('src', '/images/tours/aurum.png')
    expect(mark.style.getPropertyValue('--tour-logo-size')).toBe('60px')
  })

  it('falls back to a striped placeholder with the code for a tour with no files', () => {
    const { container } = render(<TourLogo code="NOPE" variant="icon" />)
    expect(container.querySelector('.tour-logo--placeholder')).toHaveTextContent('NOPE')
  })
})
