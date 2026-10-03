// The content the dashboard publishes (stories, shorts), as the site reads it.
//
// It is not in the bundle: server/render.mjs sets it before rendering a page
// and writes the same JSON into the document as an inline block; main.jsx
// reads that block and sets it again before hydrating, so React's first
// client render matches the server's markup. At build time (the prerender)
// and under `yarn dev` without the block it stays empty, and the home page
// sections show their demo items from the content files instead.

export const RUNTIME_SCRIPT_ID = 'apc-runtime'

const EMPTY = Object.freeze({ stories: Object.freeze([]), shorts: Object.freeze([]) })
let content = EMPTY

/** @param {{ stories?: object[], shorts?: object[] } | null | undefined} next */
export function setRuntimeContent(next) {
  content = next ? { stories: next.stories ?? [], shorts: next.shorts ?? [] } : EMPTY
}

/** @returns {{ stories: object[], shorts: object[] }} */
export function getRuntimeContent() {
  return content
}

/** The inline JSON block the server wrote, parsed, or null when absent or broken. */
export function readRuntimeContent(doc = typeof document === 'undefined' ? null : document) {
  const el = doc?.getElementById(RUNTIME_SCRIPT_ID)
  if (!el) return null
  try {
    return JSON.parse(el.textContent)
  } catch {
    return null
  }
}
