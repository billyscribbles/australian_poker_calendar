// Contract: components are "dumb" — they render brand strings and links
// straight from site.config, never hardcoded. This proves the wire is live,
// so a config swap is enough to reskin the chrome.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { site } from '../config/site.config.js'
import Img from '../components/Img.jsx'
import ConsentBanner from '../components/ConsentBanner.jsx'
import Footer from '../components/Footer.jsx'

const renderNavbar = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )

describe('Navbar — renders brand + nav from site.config', () => {
  it('labels the logo with the brand name', () => {
    renderNavbar()
    expect(screen.getByLabelText(site.brand.name)).toBeInTheDocument()
  })

  it('renders every nav tab from config', () => {
    renderNavbar()
    for (const item of site.nav) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.to)
    }
  })

  it('marks the tab for the current route as active', () => {
    renderNavbar() // MemoryRouter starts at "/"
    const home = site.nav.find((item) => item.to === '/')
    const tab = screen.getByRole('link', { name: home.label })
    expect(tab).toHaveAttribute('aria-current', 'page')
    expect(tab.className).toContain('nav-tab--active')
    const other = site.nav.find((item) => item.to !== '/')
    expect(screen.getByRole('link', { name: other.label })).not.toHaveAttribute('aria-current')
  })

  it('has a hamburger that opens the nav, and closes it on Escape and on navigation', async () => {
    const user = userEvent.setup()
    renderNavbar()
    const nav = screen.getByRole('navigation', { name: site.navMenu.label })
    const button = screen.getByRole('button', { name: site.navMenu.open })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', nav.id)
    expect(nav.className).not.toContain('site-header__tabs--open')

    await user.click(button)
    expect(screen.getByRole('button', { name: site.navMenu.close })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(nav.className).toContain('site-header__tabs--open')

    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: site.navMenu.open })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    await user.click(screen.getByRole('button', { name: site.navMenu.open }))
    const other = site.nav.find((item) => item.to !== '/')
    await user.click(screen.getByRole('link', { name: other.label }))
    expect(screen.getByRole('button', { name: site.navMenu.open })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(nav.className).not.toContain('site-header__tabs--open')
  })
})

// The template had no image pattern, so each site reinvented one and
// rediscovered the same layout-shift and LCP bugs. Img exists to make the
// correct attributes the default.
describe('Img', () => {
  it('lazy-loads by default and reserves space so nothing shifts', () => {
    render(<Img src="/photo.webp" alt="A photo" width={800} height={600} />)
    const img = screen.getByAltText('A photo')

    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
    expect(img).toHaveAttribute('width', '800')
    expect(img).toHaveAttribute('height', '600')
  })

  it('does not lazy-load the LCP image, which would delay it', () => {
    render(<Img src="/hero.webp" alt="Hero" width={1600} height={900} priority />)
    const img = screen.getByAltText('Hero')

    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
  })

  it('passes srcSet/sizes through for responsive images', () => {
    render(
      <Img
        src="/h-800.webp"
        alt="Responsive"
        width={1600}
        height={900}
        srcSet="/h-800.webp 800w, /h-1600.webp 1600w"
        sizes="(max-width: 700px) 100vw, 700px"
      />,
    )
    expect(screen.getByAltText('Responsive')).toHaveAttribute('srcset')
  })

  it('imposes no class of its own, so pages keep control of styling', () => {
    render(<Img src="/x.webp" alt="X" width={10} height={10} className="hero__image" />)
    expect(screen.getByAltText('X').getAttribute('class')).toBe('hero__image')
  })
})

// Behaviour when consent is ON lives in consent.test.jsx. These two guard the
// edges: nothing renders when a site opts out, and nothing is ever in the
// server render — the prerendered HTML has no banner, and a mismatch on
// hydration makes React throw the whole prerendered document away.
describe('ConsentBanner', () => {
  it('renders nothing when consent is not required', () => {
    const original = site.integrations.consent
    try {
      site.integrations.consent = false
      const { container } = render(
        <MemoryRouter>
          <ConsentBanner />
        </MemoryRouter>,
      )
      expect(container).toBeEmptyDOMElement()
    } finally {
      site.integrations.consent = original
    }
  })

  it('is absent from the server render even when consent IS required', () => {
    // This is the render the prerender writes to disk, and the one React
    // compares the DOM against when it hydrates. A banner here — with no
    // localStorage on the server to have read a choice from — would guarantee a
    // mismatch and throw the prerendered document away.
    const original = site.integrations.consent
    try {
      site.integrations.consent = true
      expect(
        renderToString(
          <MemoryRouter>
            <ConsentBanner />
          </MemoryRouter>,
        ),
      ).toBe('')
    } finally {
      site.integrations.consent = original
    }
  })
})

// site.contact.phone sat in the config unrendered — for a local service
// business the phone is usually the shortest path to a job, so it is a real
// conversion path that simply was not wired up.
describe('Footer contact', () => {
  const renderFooter = () =>
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )

  it('renders no phone link when no number is configured', () => {
    expect(site.contact.phone).toBe('') // the template ships without one
    renderFooter()
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('dials a clean number when one is set, whatever the label formatting', () => {
    const original = site.contact.phone
    try {
      site.contact.phone = '+61 400 123 456'
      renderFooter()
      const link = document.querySelector('a[href^="tel:"]')
      expect(link).not.toBeNull()
      // Label keeps the spacing a human reads; the href must not.
      expect(link.getAttribute('href')).toBe('tel:+61400123456')
      expect(link.textContent).toBe('+61 400 123 456')
    } finally {
      site.contact.phone = original
    }
  })
})
