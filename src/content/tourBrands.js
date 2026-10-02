// Poker room brand profiles: the colours each operator uses for itself, so a
// festival bar, logo box or card can be dressed in the tour's own identity
// instead of the site's gold. Keyed by the same `code` as calendarPage.tours.
//
// Sampled 2026-10-03 from each operator's live site (computed colours of the
// nav, buttons and hero) and from the logo file we ship. When a room rebrands,
// update the row here and every surface that reads it follows.
//
// `primary` is the colour the room is known by — it drives the bar gradient and
// border tint. `secondary` is the supporting colour (a logo gradient's second
// stop, or the site's accent) and becomes the soft glow behind the logo. `logo`
// says whether the shipped mark is light or dark so a surface can pick a
// backing that keeps it legible.

/**
 * @typedef {object} TourBrand
 * @property {string} primary    hex
 * @property {string} secondary  hex
 * @property {'light' | 'dark'} logo  tone of the wordmark in public/images/tours
 * @property {string} iconBg     backing for the circle icon, so a dark mark (Kings'
 *                               black crown) or one with its own art stays legible
 * @property {string} source     where the colours were read from
 */

/** @type {Record<string, TourBrand>} */
export const tourBrands = {
  // Australian Poker Tour: strict black-and-white identity. Site is #0A0A0A
  // with iOS-grey steps (#1C1C1E, #3A3A3C, #8E8E93, #E5E5EA); logo is white.
  APT: {
    primary: '#8E8E93',
    secondary: '#E5E5EA',
    logo: 'light',
    iconBg: '#0A0A0A',
    source: 'https://australianpokertour.com.au/ — nav, cards and grey scale',
  },
  // APL: green on navy. Buttons and pins are #0BA244; the logo runs green to
  // lime (#40B040 → #8EE437); page chrome is #0D1C2D.
  APL: {
    primary: '#0BA244',
    secondary: '#8EE437',
    logo: 'light',
    iconBg: '#0D1C2D',
    source: 'https://playapl.com/ — nav/buttons, map pins, apl.png',
  },
  // APLPT: the APL tour brand. Same green family; the tour mark leans lime
  // (#BFEA63) and its CTA is the deeper #078737.
  APLPT: {
    primary: '#078737',
    secondary: '#BFEA63',
    logo: 'light',
    iconBg: '#0D1C2D',
    source: 'https://www.playapl.com/aplpt — hero CTA, pills, aplpt.png',
  },
  // Kings Poker: red bars on a black wordmark; the site's accent is a brass gold
  // (#B8952F) used for prize figures and the active tab.
  KINGS: {
    primary: '#C8102E',
    secondary: '#B8952F',
    logo: 'light',
    iconBg: '#FFFFFF',
    source: 'https://kingspoker.com.au/ — kings.png red bars, site accent gold',
  },
  // Crown Melbourne: near-black (#0E0909), the muted gold of the crown mark in
  // their own logo SVG (#B4A169) and a cream lockup (#FCF8EA). crown.png is
  // that lockup in its own tones — gold crown, cream CROWN — recoloured from
  // the near-black original, which vanished into the dark end of the bar.
  CROWN: {
    primary: '#B4A169',
    secondary: '#FCF8EA',
    logo: 'light',
    iconBg: '#0E0909',
    source: 'https://www.crownmelbourne.com.au/ — page chrome, crown.png',
  },
  // Aurum Poker Grand: royal blue spade (#2B3990, lighter #2080C0 in the mark)
  // with a gold inner triangle (#A37844).
  AURUM: {
    primary: '#2B3990',
    secondary: '#A37844',
    logo: 'dark',
    iconBg: '#F5F2EB',
    source: 'https://aurumpoker.com.au/ — nav/buttons, aurum.png',
  },
  // PlayLive Melbourne: the "LIVE" red of the wordmark and REGISTER button
  // (#E51B21, #FF4A50 on dark) with the gold of their series cards (#C69D42).
  // The mark is white-on-black, so the circle gets a white backing.
  PLAYLIVE: {
    primary: '#E51B21',
    secondary: '#C69D42',
    logo: 'light',
    iconBg: '#FFFFFF',
    source:
      'https://playlive.melbourne/ — theme tokens (--color-accent), series cards, logo-light.png',
  },
}

/**
 * Inline-style custom properties for a tour, for any element whose CSS reads
 * `--tour-primary` / `--tour-secondary` / `--tour-icon-bg`. Empty for an unknown
 * code, so the stylesheet's fallbacks apply.
 *
 * @param {string} code
 * @returns {Record<string, string>}
 */
export function tourBrandStyle(code) {
  const brand = tourBrands[code]
  if (!brand) return {}
  return {
    '--tour-primary': brand.primary,
    '--tour-secondary': brand.secondary,
    '--tour-icon-bg': brand.iconBg,
  }
}
