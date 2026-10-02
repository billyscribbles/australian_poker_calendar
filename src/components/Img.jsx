/**
 * An <img> with the three attributes people forget, and no opinions about looks.
 *
 * WHY THIS EXISTS: the template shipped no image pattern at all, so every site
 * built from it wrote its own <img> tags and rediscovered the same two bugs.
 *
 *   - No width/height (or aspect-ratio) means the browser does not know how much
 *     room to leave, so text below jumps when the image finally decodes. That is
 *     Cumulative Layout Shift, and it is the easiest Core Web Vital to fail by
 *     accident — it is also why `width` and `height` are required here rather
 *     than optional.
 *   - Everything loading eagerly means the hero competes with images three
 *     screens down for the same connection, which delays the LCP element.
 *
 * It sets those, and nothing else: no wrapper div, no object-fit, no rounding,
 * no fixed sizing. Styling stays with the page, so two sites using this can look
 * nothing alike.
 *
 * Above-the-fold images pass `priority` — that is the one image per page that
 * should NOT be lazy, because lazy-loading the LCP element delays it.
 *
 * @param {object} props
 * @param {string} props.src
 * @param {string} props.alt           '' for decorative images, never omitted
 * @param {number} props.width         intrinsic width, in pixels
 * @param {number} props.height        intrinsic height, in pixels
 * @param {boolean} [props.priority]   true for the LCP image (hero) only
 * @param {string} [props.srcSet]      e.g. "/hero-800.webp 800w, /hero-1600.webp 1600w"
 * @param {string} [props.sizes]       e.g. "(max-width: 700px) 100vw, 700px"
 */
export default function Img({ src, alt, width, height, priority = false, srcSet, sizes, ...rest }) {
  if (import.meta.env.DEV) {
    // Loud in dev, absent in production. An image with no alt is an
    // accessibility failure that a11y linting cannot catch through a wrapper
    // component, and one with no dimensions is a layout shift nobody notices
    // until Lighthouse does.
    if (alt === undefined) {
      console.error(`<Img src="${src}"> has no alt. Use alt="" if it is decorative.`)
    }
    if (!width || !height) {
      console.error(
        `<Img src="${src}"> has no width/height — it will shift the layout as it loads.`,
      )
    }
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      srcSet={srcSet}
      sizes={sizes}
      // The LCP image must not be lazy; everything else must be.
      loading={priority ? 'eager' : 'lazy'}
      // Lowercase on purpose: React 18 does not know the camelCase prop and
      // warns on every server render; the lowercase spelling passes straight
      // through as the HTML attribute the browser reads.
      fetchpriority={priority ? 'high' : undefined}
      // Decode off the main thread so a large image cannot stall interaction.
      decoding="async"
      {...rest}
    />
  )
}
