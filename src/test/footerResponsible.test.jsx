// The responsible-gambling line in the footer: items with an href are links,
// web links open in a new tab without leaking the opener, and the dial link
// stays in place because a tel: URL opens the phone app, not a tab.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import { site } from '../config/site.config.js'

describe('responsible-gambling footer line', () => {
  it('renders every item, linking the ones with an href', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    for (const item of site.footer.responsible) {
      if (!item.href) {
        expect(screen.getByText(item.label)).toBeTruthy()
        continue
      }
      const link = screen.getByRole('link', { name: item.label })
      expect(link.getAttribute('href')).toBe(item.href)
      if (item.href.startsWith('http')) {
        expect(link.getAttribute('target')).toBe('_blank')
        expect(link.getAttribute('rel')).toMatch(/noopener/)
      } else {
        expect(link.getAttribute('target')).toBeNull()
      }
    }
  })

  it('links Gambling Help Online in the config', () => {
    const hrefs = site.footer.responsible.map((i) => i.href).filter(Boolean)
    expect(hrefs).toContain('https://www.gamblinghelponline.org.au/')
  })
})
