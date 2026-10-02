// Contract: ErrorBoundary passes children through normally, and swaps in the
// branded fallback when a descendant throws during render.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary.jsx'

function Boom() {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>safe content</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('safe content')).toBeInTheDocument()
  })

  it('renders the fallback when a child throws', () => {
    // React (and the error reporter) log the caught error — silence for a clean run.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('This page hit a snag.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
    spy.mockRestore()
  })
})
