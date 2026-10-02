// Contract: every site built from this template credits the studio with an
// ordinary link (no nofollow) at the plain https://onraistudio.com/ address,
// reading "Site by Onrai Studio". The prerender writes the footer into every
// route's HTML and refuses to build without it (scripts/prerender.mjs); this
// test catches the same regression before the build runs.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from '../components/Footer.jsx'

const CREDIT_HREF = 'https://onraistudio.com/'
const CREDIT_LABEL = 'Site by Onrai Studio'

describe('studio credit', () => {
  it('the footer links "Site by Onrai Studio" to https://onraistudio.com/', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: CREDIT_LABEL })

    expect(link.getAttribute('href')).toBe(CREDIT_HREF)
    expect(link.getAttribute('rel') || '').not.toMatch(/nofollow/i)
  })
})
