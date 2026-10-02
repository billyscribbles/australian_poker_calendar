import { Component } from 'react'
import { reportError } from '../lib/errorReporter.js'
import './ErrorBoundary.css'

// Catches render-time errors in any routed page so a single broken component
// degrades to a branded fallback instead of a white screen. Errors are
// forwarded to the optional error reporter (no-op unless a client wires Sentry).
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="errorboundary">
        <div className="container errorboundary__inner">
          <span className="section-eyebrow">Something went wrong</span>
          <h1 className="errorboundary__title">This page hit a snag.</h1>
          <p className="errorboundary__sub">
            Try reloading the page — if it keeps happening, head back home.
          </p>
          <div className="errorboundary__actions">
            <button
              type="button"
              className="errorboundary__btn"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
            <a href="/" className="errorboundary__link">
              ← Back home
            </a>
          </div>
        </div>
      </div>
    )
  }
}
