import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * False during the server render and the hydration pass, true from the first
 * client render after that — and true immediately when there is nothing to
 * hydrate (`vite dev`, tests).
 *
 * WHY THIS EXISTS: scripts/prerender.mjs renders every route once, with no
 * query string and the build machine's clock. A page whose first client render
 * reads `?month=3` or `new Date()` produces different markup from that static
 * document, React declares a hydration mismatch and throws the prerendered body
 * away — the regression src/main.jsx exists to prevent. Gate anything that
 * depends on the URL query or the current date behind this flag: the hydration
 * pass then matches the document exactly, and React re-renders with the real
 * values synchronously afterwards, before the browser paints.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
