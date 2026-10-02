// Contract: the SEO layer keeps robots out when asked — per page via the
// `noindex` prop (the 404 uses it) or build-wide via VITE_NOINDEX=true
// (staging builds — see docs/ENVIRONMENTS.md) — and stays silent otherwise.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import SEO from '../lib/seo.jsx'
import { site } from '../config/site.config.js'

const renderSEO = (props) =>
  render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>,
  )

const robotsMeta = () => document.head.querySelector('meta[name="robots"]')

afterEach(() => {
  vi.unstubAllEnvs()
  // Helmet-managed tags outlive unmount in jsdom; clear them between tests.
  document.head.querySelectorAll('[data-rh]').forEach((el) => el.remove())
})

describe('SEO — robots directives', () => {
  it('emits no robots meta by default', async () => {
    renderSEO({ title: 'Home' })
    await waitFor(() => expect(document.title).toContain('Home'))
    expect(robotsMeta()).toBeNull()
  })

  it('emits noindex when the noindex prop is set (404 page)', async () => {
    renderSEO({ title: 'Page not found', noindex: true })
    await waitFor(() => expect(robotsMeta()).not.toBeNull())
    expect(robotsMeta().content).toBe('noindex, nofollow')
  })

  it('emits noindex build-wide when VITE_NOINDEX=true (staging)', async () => {
    vi.stubEnv('VITE_NOINDEX', 'true')
    renderSEO({ title: 'Home' })
    await waitFor(() => expect(robotsMeta()).not.toBeNull())
    expect(robotsMeta().content).toBe('noindex, nofollow')
  })
})

describe('SEO — canonical contract', () => {
  it('canonical URL is built from site.config siteUrl + path', async () => {
    renderSEO({ title: 'Services', path: '/services' })
    await waitFor(() => {
      const canonical = document.head.querySelector('link[rel="canonical"]')
      expect(canonical).not.toBeNull()
      expect(canonical.href).toBe(`${site.seo.siteUrl}/services`)
    })
  })
})
