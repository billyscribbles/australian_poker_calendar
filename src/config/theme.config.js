// Single source of truth for design tokens.
// Swap a brand's look by editing this file — applyTheme.js writes these
// onto :root as CSS custom properties at app boot.
//
// Australian Poker Calendar — "Midnight & Gold". Near-black surfaces, warm
// off-white text, gold reserved for the logo, primary actions, links and
// selected/hover states. Values come from the design handoff
// (australian-poker-calendar-theme.css); keep them in sync with that file.

export const theme = {
  colors: {
    // Brand
    accent: '#DFA95A', // gold — primary accent
    champagne: '#FFDE8B', // highlight / link hover / focus ring
    'accent-hover': '#EEC773',
    'accent-pressed': '#CD8F38',
    'accent-glow': 'rgba(223, 169, 90, 0.25)',
    'on-accent': '#0E0E0E', // text on a gold fill

    // Surfaces
    bg: '#0E0E0E',
    'bg-footer': '#0A0A0A',
    'bg-inset': '#111111', // events banner, raised/inset panels
    'bg-card': '#181818',
    'bg-raised': '#222222', // placeholder stripe alt, neutral badge
    'bg-selected': '#2C251B',
    'bg-hero-end': '#0F0E0C', // far stop of the live hero radial
    'logo-backing': '#FFFFFF', // white card behind a dark partner mark (Crown, Aurum)

    // Content
    text: '#F5F2EB',
    muted: '#AAA7A1',
    'text-faint': '#7D786D', // footer bottom bar, placeholder labels

    // Boundaries
    border: '#36332D',
    'control-border': '#8C806C',
    'grid-line': '#1F1F1F', // calendar timeline day columns

    // Calendar timeline
    'bg-weekend': '#141414', // weekend cells in the day header

    // Functional — always paired with a visible label.
    live: '#5EBB8A',
    'live-bg': '#16261D',
    // Schedule rows that are satellites into another series — the red rows
    // on an operator's poster. Always paired with the feeding series' name.
    feeder: '#B3273A', // white text on it clears 6:1
    'on-feeder': '#FFFFFF',

    // Overlays behind text on imagery.
    overlay: 'rgba(14, 14, 14, 0.96)',
    'overlay-soft': 'rgba(14, 14, 14, 0.8)',

    // Legacy aliases read by components that are not on the home page
    // (Hero, Services, Stats, legal and 404 pages). Mapped onto the palette
    // above so those pages render in-theme without their own hex values.
    'bg-alt': '#111111',
    'text-soft': '#AAA7A1',
    'accent-dark': '#CD8F38',
    'accent-light': '#FFDE8B',
    'border-strong': '#8C806C',
    dark: '#0A0A0A',
  },
  fonts: {
    display: "'Barlow Condensed', 'Arial Narrow', sans-serif",
    body: "'Barlow', system-ui, sans-serif",
    mono: 'ui-monospace, Menlo, Consolas, monospace',
  },

  // Where the families named above are actually fetched from.
  //
  // WHY THIS EXISTS: `fonts` only declares a CSS stack. Nothing downloads a
  // webfont, so a family listed there that is not listed here silently falls
  // back to the next entry in the stack. Each entry is a Google Fonts v2
  // `family=` value; vite.config.js turns these into the preconnect +
  // stylesheet links in <head>, and src/test/config.test.js fails if a family
  // in `fonts` has no source here.
  googleFonts: ['Barlow:wght@400;500;600;700', 'Barlow+Condensed:wght@500;600;700;800'],

  // Decorative multi-stop fills. Only the gold text gradient needs raw stops;
  // stripes, rules and overlays are composed in CSS from the colours above.
  gradients: {
    gold: 'linear-gradient(120deg, #DFA95A 0%, #FFDE8B 52%, #DFA95A 100%)',
    // Calendar timeline festival bars, at rest and on hover.
    bar: 'linear-gradient(90deg, #2C251B 0%, #181818 55%, #1F1A12 100%)',
    'bar-hover': 'linear-gradient(90deg, #3A2F1E 0%, #1F1A12 55%, #2C251B 100%)',
  },
  radii: {
    xs: '4px', // badges
    sm: '6px', // buttons, thumbs
    md: '8px', // partner boxes, live badge
    lg: '10px', // nav tabs, list cards, ticker chips
    xl: '12px', // story / short / promo / guide cards
    '2xl': '14px', // event cards, featured article
    full: '999px', // pills
  },
  shadows: {
    glow: '0 0 0 1px #DFA95A, 0 0 30px rgba(223, 169, 90, 0.25)',
    // Legacy aliases for off-home components.
    sm: 'none',
    md: 'none',
    lg: 'none',
    accent: 'none',
  },
  transitions: {
    fast: '150ms ease',
    base: '220ms ease',
    slow: '350ms ease',
  },
  // Page width. `.container`, the events banner and the footer all read this,
  // so widening the site is one number here.
  //
  // The cap lets a 1440px laptop fill its screen while a 1920px+ monitor still
  // gets a bounded line. The gutter is fluid: ~24px on a small tablet, ~36px
  // on a laptop, 40px at the cap — enough breathing room that content never
  // kisses the bezel. On a phone it bottoms out at 16px. The footer, the
  // events banner and the poker-rooms bleed read this same token, so no
  // component can disagree with the page gutter at any width.
  layout: {
    'container-max': '1560px',
    'container-pad': 'clamp(16px, 2.5vw, 40px)',
  },
}
