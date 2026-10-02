// Contract: when `integrations.consent` is on, the visitor is asked before any
// tracking cookie is set, the banner explains what cookies are used for, links
// to the privacy policy, remembers the answer, and can be reopened from the
// footer so the choice is as easy to withdraw as it was to give.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ConsentBanner from '../components/ConsentBanner.jsx'
import Footer from '../components/Footer.jsx'
import { site } from '../config/site.config.js'
import { consent } from '../content/consent.js'
import { readConsent, openConsent } from '../lib/consent.js'

const renderBanner = () =>
  render(
    <MemoryRouter>
      <ConsentBanner />
      <Footer />
    </MemoryRouter>,
  )

describe('consent content — shape the banner renders', () => {
  it('has body copy, both button labels and a privacy link', () => {
    expect(consent.text).toBeTruthy()
    expect(consent.accept).toBeTruthy()
    expect(consent.decline).toBeTruthy()
    expect(consent.privacyLabel).toBeTruthy()
    expect(consent.settingsLabel).toBeTruthy()
  })

  it('tells the visitor what the cookies are for', () => {
    expect(consent.text.toLowerCase()).toMatch(/cookie/)
    expect(consent.text.toLowerCase()).toMatch(/experience/)
  })
})

describe('ConsentBanner — consent is required for this site', () => {
  let original
  beforeEach(() => {
    original = site.integrations.consent
    site.integrations.consent = true
    localStorage.clear()
  })
  afterEach(() => {
    site.integrations.consent = original
    localStorage.clear()
  })

  it('appears after mount when no choice has been made', async () => {
    renderBanner()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(consent.text)).toBeInTheDocument()
  })

  it('links to the privacy policy', async () => {
    renderBanner()
    await screen.findByRole('dialog')
    expect(screen.getByRole('link', { name: consent.privacyLabel })).toHaveAttribute(
      'href',
      '/privacy',
    )
  })

  it('remembers Accept and hides', async () => {
    renderBanner()
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: consent.accept }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(readConsent()).toBe('granted')
  })

  it('remembers Decline and hides', async () => {
    renderBanner()
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: consent.decline }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(readConsent()).toBe('denied')
  })

  it('stays hidden on a later visit once a choice is stored', async () => {
    localStorage.setItem('consent:analytics', 'denied')
    renderBanner()
    // Give the mount effect a tick to run; the banner must still be absent.
    await act(async () => {})
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reopens from the footer "Cookie settings" control', async () => {
    localStorage.setItem('consent:analytics', 'denied')
    renderBanner()
    await act(async () => {})
    await userEvent.click(screen.getByRole('button', { name: consent.settingsLabel }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('reopens programmatically via openConsent()', async () => {
    localStorage.setItem('consent:analytics', 'granted')
    renderBanner()
    await act(async () => {})
    act(() => openConsent())
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})

describe('Footer — cookie settings control is config-driven', () => {
  it('is absent when consent is off', () => {
    const original = site.integrations.consent
    try {
      site.integrations.consent = false
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>,
      )
      expect(screen.queryByRole('button', { name: consent.settingsLabel })).not.toBeInTheDocument()
    } finally {
      site.integrations.consent = original
    }
  })
})
