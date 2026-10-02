// Optional, zero-dependency error reporting.
//
// The template bundles NO error-monitoring SDK, so clients who skip
// observability pay nothing. `reportError` simply forwards to `window.Sentry`
// when a client has wired one up — e.g. the Sentry Loader Script in index.html,
// or `@sentry/react` initialised in src/main.jsx using VITE_SENTRY_DSN. Until
// then it stays silent in production and logs to the console in development.
// See README "Error monitoring" for how to enable it per client.

export function reportError(error, info) {
  const sentry = typeof window !== 'undefined' ? window.Sentry : undefined
  if (sentry && typeof sentry.captureException === 'function') {
    sentry.captureException(error, info ? { extra: info } : undefined)
    return
  }
  if (import.meta.env.DEV) {
    console.error('[errorReporter]', error, info ?? '')
  }
}
