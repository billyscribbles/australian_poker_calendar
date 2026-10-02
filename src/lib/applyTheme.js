import { theme } from '../config/theme.config.js'

// The groups in theme.config, and the CSS custom property prefix each one
// flattens to. One list, so the runtime path and the build-time path can never
// disagree about which tokens exist.
const GROUPS = [
  ['color', 'colors'],
  ['font', 'fonts'],
  ['gradient', 'gradients'],
  ['radius', 'radii'],
  ['shadow', 'shadows'],
  ['transition', 'transitions'],
  ['layout', 'layout'],
]

/** theme.config flattened to `--prefix-key` / value pairs. */
export function themeVariables() {
  const vars = {}
  for (const [prefix, key] of GROUPS) {
    for (const [name, value] of Object.entries(theme[key] || {})) {
      vars[`--${prefix}-${name}`] = value
    }
  }
  return vars
}

/**
 * The same tokens as a `:root { … }` stylesheet.
 *
 * scripts/prerender.mjs inlines this into every static document. Without it a
 * prerendered page would arrive with markup but no design tokens and paint
 * unstyled until the JS bundle ran — the exact flash prerendering removes.
 */
export function themeCss() {
  const body = Object.entries(themeVariables())
    .map(([name, value]) => `${name}:${value}`)
    .join(';')
  return `:root{${body}}`
}

/**
 * Writes the tokens onto :root at runtime.
 *
 * Still called from main.jsx: in `vite dev` there is no prerendered document to
 * carry the inlined stylesheet, so this is what puts the tokens on the page. In
 * production it re-applies values the inlined CSS already set, which costs
 * nothing and keeps the two paths honest.
 */
export function applyTheme() {
  const root = document.documentElement
  for (const [name, value] of Object.entries(themeVariables())) {
    root.style.setProperty(name, value)
  }
}
