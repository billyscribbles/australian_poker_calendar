import './RouteFallback.css'

// Shown by <Suspense> while a lazy-loaded route chunk is fetching. Holds a
// fixed min-height so swapping it for the page causes no layout shift.
export default function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="route-fallback__spinner" aria-hidden="true" />
      <span className="route-fallback__label">Loading…</span>
    </div>
  )
}
