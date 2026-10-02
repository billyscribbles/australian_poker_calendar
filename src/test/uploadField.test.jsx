// Contract: each upload section is a real file input the form posts under its
// own name, takes a file by click or by drop, lists what was chosen, lets it
// be removed, and refuses anything the upload gate rejects with a message.
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import UploadField from '../components/UploadField.jsx'
import VenueForm from '../components/VenueForm.jsx'
import { venueForm } from '../content/contact.js'

const { uploads } = venueForm
const pdf = (name = 'schedule.pdf') =>
  new File(['%PDF-1.4 1 0 obj << /Type /Catalog >> endobj'], name, { type: 'application/pdf' })
const png = (name = 'poster.png') =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], name, {
    type: 'image/png',
  })

describe('UploadField', () => {
  it('the form carries every section as a file input of its own in the static HTML', () => {
    const html = renderToString(<VenueForm />)
    expect(uploads.sections.map((s) => s.name)).toEqual(['poster', 'schedule', 'banner', 'logos'])
    for (const section of uploads.sections) {
      expect(html).toContain(`type="file" name="${section.name}"`)
    }
    expect(html).toContain(`accept="${uploads.accept}"`)
    expect(html.match(/multiple=""/g)).toHaveLength(1)
  })

  it('lists a file chosen through the input', async () => {
    render(<UploadField section={uploads.sections[1]} />)
    const input = screen.getByLabelText(/Schedule/)
    fireEvent.change(input, { target: { files: [pdf()] } })
    await waitFor(() => expect(screen.getByText('schedule.pdf')).toBeInTheDocument())
  })

  it('takes a dropped file', async () => {
    render(<UploadField section={uploads.sections[0]} />)
    const zone = screen.getByText('Poster').closest('label')
    fireEvent.drop(zone, { dataTransfer: { files: [png()] } })
    await waitFor(() => expect(screen.getByText('poster.png')).toBeInTheDocument())
  })

  it('a single-file section keeps only the latest file; the logos section keeps all of them', async () => {
    render(
      <>
        <UploadField section={uploads.sections[0]} />
        <UploadField section={uploads.sections[3]} />
      </>,
    )
    const poster = screen.getByLabelText(/Poster/)
    fireEvent.change(poster, { target: { files: [png('a.png')] } })
    await screen.findByText('a.png')
    fireEvent.change(poster, { target: { files: [png('b.png')] } })
    await screen.findByText('b.png')
    expect(screen.queryByText('a.png')).not.toBeInTheDocument()

    const logos = screen.getByLabelText(/Logos/)
    fireEvent.change(logos, { target: { files: [png('one.png')] } })
    await screen.findByText('one.png')
    fireEvent.change(logos, { target: { files: [png('two.png')] } })
    await screen.findByText('two.png')
    expect(screen.getByText('one.png')).toBeInTheDocument()
  })

  it('removes a listed file', async () => {
    render(<UploadField section={uploads.sections[2]} />)
    fireEvent.change(screen.getByLabelText(/Banner/), { target: { files: [png('wide.png')] } })
    await screen.findByText('wide.png')
    fireEvent.click(screen.getByRole('button', { name: `${uploads.remove} wide.png` }))
    expect(screen.queryByText('wide.png')).not.toBeInTheDocument()
  })

  it('refuses a file the gate rejects and says why, keeping the good ones', async () => {
    render(<UploadField section={uploads.sections[3]} />)
    const fake = new File(['MZ not really'], 'logo.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/Logos/), { target: { files: [fake, png('ok.png')] } })
    await screen.findByText('ok.png')
    expect(screen.getByRole('status').textContent).toContain(`logo.png ${uploads.errors.type}`)
    expect(screen.queryByText('logo.png')).not.toBeInTheDocument()
  })
})
