import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect, Suspense, createElement } from 'react'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RouteFallback from './components/RouteFallback.jsx'
import { trackPageview } from './lib/analytics.js'
import { lazyWithRetry } from './lazyWithRetry.js'
import { ROUTES } from './routes.js'
import ConsentBanner from './components/ConsentBanner.jsx'

// Built once from the shared route table. Home is marked eager there — it is
// the LCP route, so it stays in the main bundle instead of behind a chunk.
const routeElements = ROUTES.map((route) => ({
  path: route.path,
  element: createElement(route.eager ? Home : lazyWithRetry(route.load), route.props),
}))

// useLayoutEffect has no meaning during renderToString and React warns about it
// on every prerendered route. The scroll reset genuinely wants the layout phase
// in the browser, so keep it there and fall back to useEffect at build time,
// where neither one runs.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

// Resets scroll on navigation and reports the page view to analytics.
function RouteChange() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])
  useIsomorphicLayoutEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])
  useEffect(() => {
    trackPageview(`${pathname}${hash}`)
  }, [pathname, hash])
  return null
}

// The routed application, with no router around it.
//
// App supplies BrowserRouter for the browser; src/entry-prerender.jsx supplies a
// StaticRouter to render the same tree to HTML at build time. Keeping the router
// out of here is what lets one component serve both.
export function AppRoutes() {
  return (
    <>
      <RouteChange />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      {/* Skip-link target. Each routed page renders its own <main> landmark;
          this wrapper just gives the skip link a stable, focusable anchor. */}
      <div id="main" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {routeElements.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer />
      <ConsentBanner />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
