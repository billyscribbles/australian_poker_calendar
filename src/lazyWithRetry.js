import { createElement, lazy } from 'react'

// Lazy page loading that can also render synchronously — which is what makes
// prerendering work for every route, not just the homepage.
//
// Retries a failed chunk import once, then forces a reload: prevents a
// white page on a stale tab after a redeploy (ChunkLoadError).
const RELOAD_KEY = 'apc:chunk-reloaded'

const isServer = typeof window === 'undefined'

// --- Synchronous-once-loaded -------------------------------------------
//
// A page module that has already finished loading renders like any ordinary
// import: no lazy, no Suspense, no fallback.
//
// The build's prerender pass resolves every factory up front (loadAll below),
// so renderToString emits the real page instead of an empty Suspense boundary.
// src/main.jsx hands the browser the same deal: it awaits the current route's
// chunk before hydrateRoot, so React's first render produces exactly the markup
// the build wrote and adopts it, rather than throwing the document away.
//
// Anything NOT preloaded — every client-side navigation after the first — falls
// through to React.lazy and the <Suspense fallback> in App.jsx, as before.
const loaded = new Map() // factory -> Component
const inflight = new Map() // factory -> Promise<Component>
const factories = new Set() // every factory, for the prerender's benefit

// --- Prerender support --------------------------------------------------
//
// A route is "complete" when nothing in it rendered as a hole. loadAll() makes
// that the normal case, so this flag exists to catch the abnormal one: a
// factory that failed to load would otherwise prerender as a blank body, which
// is the exact regression the pipeline exists to prevent.
let sawUnloadedDuringRender = false

/** Called by the prerender before each route. */
export function beginServerRender() {
  sawUnloadedDuringRender = false
}

/** False if the last prerender hit a module that wasn't loaded. */
export function serverRenderWasComplete() {
  return !sawUnloadedDuringRender
}

function importWithRetry(factory) {
  return factory().catch((err) => {
    if (isServer) throw err
    const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1'
    if (!alreadyReloaded) {
      sessionStorage.setItem(RELOAD_KEY, '1')
      window.location.reload()
      return new Promise(() => {}) // suspend until the reload lands
    }
    sessionStorage.removeItem(RELOAD_KEY)
    throw err
  })
}

/**
 * Load a module now and remember it, so the component it backs renders
 * synchronously from here on. Safe to call repeatedly — concurrent callers
 * share one import.
 */
export function preload(factory) {
  if (loaded.has(factory)) return Promise.resolve(loaded.get(factory))
  let pending = inflight.get(factory)
  if (!pending) {
    pending = importWithRetry(factory).then((mod) => {
      const Component = mod.default ?? mod
      loaded.set(factory, Component)
      inflight.delete(factory)
      return Component
    })
    inflight.set(factory, pending)
  }
  return pending
}

/** Prerender only: resolve every page module so renderToString can emit them. */
export function loadAll() {
  return Promise.all([...factories].map(preload))
}

/**
 * @param {() => Promise<any>} factory  the dynamic import for the page
 * @param {{ prerender?: boolean }} [options]
 *   `prerender: false` keeps this module out of loadAll(), for a route that is
 *   never rendered at build time. It matters for more than speed: an admin-only
 *   page can pull in browser-only dependencies (an editor that reads `window`
 *   at module scope), and loading one inside Node crashes the build outright.
 *   Keep this in step with `clientOnly` in src/routes.js.
 */
export function lazyWithRetry(factory, { prerender = true } = {}) {
  if (prerender) factories.add(factory)

  // Built once and reused, so the fallback path keeps a stable element type.
  const Lazy = isServer
    ? null
    : lazy(() => preload(factory).then((Component) => ({ default: Component })))

  return function Routed(props) {
    const Ready = loaded.get(factory)
    if (Ready) return createElement(Ready, props)
    if (isServer) {
      sawUnloadedDuringRender = true
      return null
    }
    // Suspends on first render and resolves into the branch above. The element
    // type changes from Lazy to the real component at that point, but Lazy
    // suspended and so never committed — React mounts the page once, not twice.
    return createElement(Lazy, props)
  }
}

if (!isServer) {
  window.addEventListener('load', () => {
    sessionStorage.removeItem(RELOAD_KEY)
  })
}
