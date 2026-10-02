// Contract: the assembled home page has no automatically-detectable
// accessibility violations. This guards the config/content swap — rewriting
// copy or tokens must never silently introduce an a11y regression.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import Home from '../pages/Home.jsx'

expect.extend(toHaveNoViolations)

describe('Home — accessibility', () => {
  it('renders with no axe violations', async () => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </HelmetProvider>,
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
