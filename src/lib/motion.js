// Scroll-in props for section grids — deliberately inert.
//
// Call once per component; the returned function builds per-item props,
// staggered by index. It currently returns the same inert props for every
// item, and that is the point.
//
// WHY INERT. This scaffold prerenders every route to static HTML
// (scripts/prerender.mjs). framer-motion renders a motion element's `initial`
// styles during renderToString, so an entrance written
// `initial={{ opacity: 0 }}` is written into the static document as
// `style="opacity:0"`. Measured on this template before the change: 17 such
// elements on the prerendered home page alone. That is bad twice over.
//
//   1. Crawlers. The whole reason the build prerenders is so a crawler that
//      skips JavaScript reads a real page. Shipping it most of that page at
//      opacity 0 is the hidden-text pattern search engines discount — it
//      undoes the thing the prerender is for.
//   2. Visitors. The static HTML paints first, then React hydrates over it.
//      With entrances live, sections that were painted go invisible again and
//      fade back in as the visitor scrolls. The page appears to flicker under
//      its own scroll. onrai_studio shipped exactly this bug, diagnosed it
//      three times, and settled it on 12 Sep 2026: no entrances, no scroll
//      reveals — content is simply there, and a page is complete from first
//      paint.
//
// `initial: false` is the documented switch behind `<AnimatePresence
// initial={false}>`: the element mounts at its target instead of its `initial`
// one, so it renders with no inline opacity at all — identical in the static
// document and after hydration, which is also what keeps React from throwing
// the prerendered markup away over a mismatch.
//
// Gestures (whileHover / whileTap) and state-driven `animate` changes —
// accordions, toggles, drawers — are unaffected and still animate. Only the
// mount is.
//
// The hook is kept, rather than deleted from every call site, so components
// keep one obvious place to opt back in if a specific site ever needs it. If
// you do reintroduce an entrance, gate it so it cannot reach the prerender,
// and expect scripts/prerender.mjs to fail the build the moment an
// `opacity:0` lands in a static document.
const AT_REST = { initial: false }

export function useScrollIn() {
  return function scrollIn() {
    return AT_REST
  }
}
