// Vitest global setup — extends expect() with jest-dom matchers
// (toBeInTheDocument, toHaveAttribute, ...) and wires up auto-cleanup.
import '@testing-library/jest-dom/vitest'

// jsdom ships neither of these browser APIs, but Framer Motion needs both
// (matchMedia for useReducedMotion, IntersectionObserver for whileInView).
// Stub them so section components render in tests.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}
