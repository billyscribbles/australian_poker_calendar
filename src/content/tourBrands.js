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
    iconBg: '#000000',
    source:
      'https://www.playapl.com/aplpt — hero CTA, pills, aplpt.png; icon: the same lockup fitted in the circle on black',
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
  // that lockup in cream throughout, recoloured from the near-black original,
  // which vanished into the dark end of the bar. The crown itself is not kept
  // gold: the bar fades into the same gold, and a gold crown on it read as a
  // faint stain. The circle icon keeps the gold crown on near-black.
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
  // National Poker League: the navy (#0D387C) and red (#CE2B2E) of the round
  // NPL badge, white lettering. Their site's chrome is a darker red (#8E0000)
  // and a blue (#153E80) from the same family. The badge is a solid disc, so
  // the circle gets a white backing and the disc keeps its own colours.
  NPL: {
    primary: '#0D387C',
    secondary: '#CE2B2E',
    logo: 'light',
    iconBg: '#FFFFFF',
    source: 'https://www.npl.com.au/ — NPL_2D_Logo_500.png, custom.css and unify-globals.css',
  },
  // Empire Poker (Brisbane): gold phoenix lockup on a black site. The mark's
  // own gold (#C9A94F) with its pale highlight; "POKER" is white, so dark only.
  EMPIRE: {
    primary: '#C9A94F',
    secondary: '#F0E0A0',
    logo: 'light',
    iconBg: '#0A0A0A',
    source: 'https://empirepoker.com.au/ — phoenix lockup PNG, black page chrome',
  },
  // Poker Palace (Western Sydney): red-and-white spade, "POKER" red and
  // "PALACE" white; the site's accent is a tan gold (#DD9933).
  PALACE: {
    primary: '#B0000F',
    secondary: '#DD9933',
    logo: 'light',
    iconBg: '#141414',
    source: 'https://pokerpalace.com.au/ — Poker-Palace-logo-alt.png, site accent',
  },
  // Queen B's Poker (Beenleigh): a single antique gold for bee and lettering,
  // on the site's near-black navy (#030F27).
  QUEENBS: {
    primary: '#C4AC58',
    secondary: '#E6D28A',
    logo: 'light',
    iconBg: '#030F27',
    source: 'https://www.queenbs.poker/ — QBP Website Header Logo Gold.png, page background',
  },
  // WPT League: white wordmark with the WPT card mark in blue and red. The
  // shipped PNG is the lockup keyed out of the league's share card.
  WPTL: {
    primary: '#0080C8',
    secondary: '#D62828',
    logo: 'light',
    iconBg: '#121212',
    source: 'https://www.wptleague.com/au/ — og.jpg card mark',
  },
  // Stacked Poker (Adelaide): navy page chrome (#1B2D42) with an orange
  // accent (#F58220); the script wordmark ships in white as the site serves it.
  STACKED: {
    primary: '#1B2D42',
    secondary: '#F58220',
    logo: 'light',
    iconBg: '#1B2D42',
    source: 'https://stackedpoker.com.au/ — theme CSS, stacked_poker_logo.png',
  },
  // Mixed Games Academy (Melbourne): the gold of the spade-and-mortarboard
  // mark (#C89A32, highlight #E4CC75) on the site's near-black (#111214).
  MGA: {
    primary: '#C89A32',
    secondary: '#E4CC75',
    logo: 'light',
    iconBg: '#111214',
    source: 'https://mixedgamesacademy.au/ — theme CSS, A4-png.png',
  },
  // The Star Poker (Sydney and Gold Coast): the lockup is navy (#102E4E) on
  // white; star.png is that vector in white so it reads on the dark bars, with
  // the navy as the backing and the site's link blue as the glow.
  STAR: {
    primary: '#102E4E',
    secondary: '#439DD7',
    logo: 'light',
    iconBg: '#102E4E',
    source: 'https://www.starpoker.com.au/sydney — PokerLogo.svg fill, site link colour',
  },
  // Gambier Poker (Mount Gambier): red "GAMBIER" over gold "POKER", keyed out
  // of the black lockup the site serves.
  GAMBIER: {
    primary: '#C81018',
    secondary: '#D0B838',
    logo: 'light',
    iconBg: '#000000',
    source: 'https://gambierpoker.com.au/ — Gambier Poker / XDL Poker lockup',
  },
  // Check Raise Poker (Springfield Lakes): black wordmark on white; shipped in
  // white for the dark bars. The site's accents are reds.
  CHECKRAISE: {
    primary: '#BD0000',
    secondary: '#E99292',
    logo: 'light',
    iconBg: '#0E0E0E',
    source: 'https://www.checkraisepoker.com.au/ — site CSS accents, CRP Logo Black PNG',
  },
  // World Pro Poker (Melbourne league): white wordmark over red and black card
  // suits on black. The site's CSS is a stock Joomla template, so both come from the logo.
  WPP: {
    primary: '#D80808',
    secondary: '#080808',
    logo: 'light',
    iconBg: '#000000',
    source:
      'https://www.worldpropoker.com.au/ — images/img/Logo175x175.jpg (suits, red and black) and templates/ijoomla06/images/logo.png (wordmark)',
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
