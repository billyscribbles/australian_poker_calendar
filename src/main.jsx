import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { applyTheme } from './lib/applyTheme.js'
import { initAnalytics } from './lib/analytics.js'
import { preloadRoute } from './routes.js'
import './index.css'
import App from './App.jsx'

applyTheme()
initAnalytics()

const container = document.getElementById('root')

const app = (
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
)

// Two mount paths, chosen by what the document already contains.
//
// scripts/prerender.mjs stamps #root with how much of the route it rendered,
// and only data-prerender="full" is hydratable. `yarn dev` serves the untouched
// index.html — no attribute, empty #root — so it falls through to createRoot.
//
// WHY THE PRELOAD: React adopts prerendered markup only if its first render
// produces the same thing. A lazy page renders as an empty Suspense boundary on
// that first pass, so hydrating a prerendered /services against it is React
// #418/#422 — React throws the body away and client-renders, undoing the
// prerender everywhere but "/". Loading the route's chunk first lets
// lazyWithRetry render it synchronously, so the two agree and the markup
// survives. The document already carries a modulepreload for that chunk, so the
// request is in flight before this line runs.
if (container.dataset.prerender === 'full') {
  preloadRoute(window.location.pathname)
    .then(() => hydrateRoot(container, app))
    // A chunk that cannot load leaves nothing to hydrate against. Client-render
    // instead so the page still boots.
    .catch(() => createRoot(container).render(app))
} else {
  createRoot(container).render(app)
}
