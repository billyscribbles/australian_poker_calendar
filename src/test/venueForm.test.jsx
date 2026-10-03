// Contract: the poker-room listing form has its own page, the footer on every
// page carries a short call-to-action that links to it, the form reads its
// copy from the content file, posts to the site's own /api/enquiry tagged as
// the venue form (the server saves it and emails it on), and never lets a
// honeypot hit through.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Footer from '../components/Footer.jsx'
import VenueForm from '../components/VenueForm.jsx'
import ListVenuePage from '../pages/ListVenuePage.jsx'
import { venueForm } from '../content/contact.js'
import { site } from '../config/site.config.js'
import { ENQUIRY_ENDPOINT } from '../lib/useEnquiry.js'
import { ROUTES } from '../routes.js'

const fill = () => {
  fireEvent.change(screen.getByLabelText(venueForm.fields.venue), { target: { value: 'Crown' } })
  fireEvent.change(screen.getByLabelText(venueForm.fields.email), {
    target: { value: 'ops@example.com' },
  })
  fireEvent.change(screen.getByLabelText(venueForm.fields.message), {
    target: { value: 'Weekly $200 deepstack' },
  })
}

describe('VenueForm', () => {
  afterEach(() => vi.restoreAllMocks())

  it('has a route of its own, prerendered and indexable', () => {
    const route = ROUTES.find((r) => r.path === venueForm.path)
    expect(route).toBeTruthy()
    expect(route.module).toBe('src/pages/ListVenuePage.jsx')
    expect(route.noindex).toBeFalsy()
  })

  it('the page carries the heading as its h1 and the form in the static HTML', () => {
    const html = renderToString(
      <HelmetProvider>
        <MemoryRouter>
          <ListVenuePage />
        </MemoryRouter>
      </HelmetProvider>,
    )
    expect(html).toContain(`>${venueForm.heading}</h1>`)
    expect(html).toContain('name="venue"')
  })

  it('the footer links to the page from every route instead of carrying the form', () => {
    const html = renderToString(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    expect(html).toContain(venueForm.cta.heading)
    expect(html).toContain(`href="${venueForm.path}"`)
    expect(html).not.toContain('name="venue"')
  })

  it('the footer band stays off the listing page, which has the form above it', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={[venueForm.path]}>
        <Footer />
      </MemoryRouter>,
    )
    expect(html).not.toContain(venueForm.cta.heading)
  })

  it('tags the submission as a listing request and counts it on acceptance', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
    render(<VenueForm />)
    fill()
    fireEvent.submit(screen.getByRole('button', { name: venueForm.submit }).closest('form'))
    await waitFor(() => expect(screen.getByText(venueForm.success)).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(ENQUIRY_ENDPOINT)
    expect(init.body.get('form')).toBe('venue')
    expect(init.body.get('topic')).toBe(venueForm.topic)
    expect(init.body.get('_subject')).toBe(venueForm.subject)
    expect(init.body.get('venue')).toBe('Crown')
  })

  it('drops a submission whose honeypot is filled without posting it', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
    render(<VenueForm />)
    fill()
    fireEvent.change(screen.getByLabelText('Leave this field empty'), { target: { value: 'spam' } })
    fireEvent.submit(screen.getByRole('button', { name: venueForm.submit }).closest('form'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('points at the contact email when the server refuses the submission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false })
    const { container } = render(<VenueForm />)
    fill()
    fireEvent.submit(screen.getByRole('button', { name: venueForm.submit }).closest('form'))
    // The form's own live region; each upload box has one of its own too.
    await waitFor(() =>
      expect(container.querySelector('.venue-form__status').textContent).toContain(
        site.contact.email,
      ),
    )
  })
})
