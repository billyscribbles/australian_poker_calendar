import { calendarPage } from '../content/calendarPage.js'
import { tourBrandStyle } from '../content/tourBrands.js'
import Img from './Img.jsx'
import './TourLogo.css'

const tourByCode = new Map(calendarPage.tours.map((tour) => [tour.code, tour]))

/**
 * A tour's mark, in one of the two shapes every operator has an asset for
 * (calendarPage.tours), coloured from content/tourBrands.js:
 *
 *   - `icon`     the square mark in a small circle on the brand's backing colour —
 *                beside a festival name, in list rows and Up Next cards
 *   - `wordmark` the full logo, large and unboxed, laid over a timeline bar's
 *                brand gradient
 *
 * Until a tour has its files, a striped placeholder with the tour code.
 * Decorative either way — the festival name beside it already says which tour it is.
 *
 * @param {object} props
 * @param {string} props.code
 * @param {'icon' | 'wordmark'} props.variant
 * @param {number} [props.size]  icon diameter in px (default 44); wordmark height (default 56)
 */
export default function TourLogo({ code, variant, size }) {
  const tour = tourByCode.get(code)
  const isIcon = variant === 'icon'
  const px = size ?? (isIcon ? 44 : 56)
  const src = isIcon ? tour?.iconSrc : tour?.logoSrc
  const className = `tour-logo tour-logo--${variant}`
  const style = { ...tourBrandStyle(code), '--tour-logo-size': `${px}px` }
  if (src) {
    return (
      <span className={className} style={style} aria-hidden="true">
        <Img src={src} alt="" width={isIcon ? px : px * 3} height={px} className="tour-logo__img" />
      </span>
    )
  }
  return (
    <span className={`${className} tour-logo--placeholder`} style={style} aria-hidden="true">
      {code}
    </span>
  )
}
