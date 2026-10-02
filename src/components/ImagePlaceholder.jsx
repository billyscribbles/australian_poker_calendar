import Img from './Img.jsx'
import './ImagePlaceholder.css'

/**
 * A striped grey block standing in for imagery that has not landed yet.
 *
 * Every image slot on the home page renders through this so that swapping in
 * the real asset is a data change: give the item a `src` (plus `alt`, `width`
 * and `height`) and the same box renders an <Img> instead of the stripes.
 * Layout — size, radius, position — belongs to the caller's class, exactly as
 * it would for the eventual <img>.
 *
 * @param {object} props
 * @param {string} [props.label]     monospace caption drawn in the box, e.g. "story image"
 * @param {'default' | 'fine' | 'bold'} [props.variant]  stripe scale (8px / 6px / 10px)
 * @param {'center' | 'top-left'} [props.labelAlign]
 * @param {string} [props.className]
 * @param {string} [props.src]       when set, renders the real image instead
 * @param {string} [props.alt]
 * @param {number} [props.width]
 * @param {number} [props.height]
 * @param {boolean} [props.priority]  pass through to <Img> for the LCP image
 */
export default function ImagePlaceholder({
  label,
  variant = 'default',
  labelAlign = 'center',
  className = '',
  src,
  alt = '',
  width,
  height,
  priority,
}) {
  if (src) {
    return (
      <Img
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`image-placeholder__img ${className}`.trim()}
      />
    )
  }
  return (
    <div
      className={`image-placeholder image-placeholder--${variant} image-placeholder--${labelAlign} ${className}`.trim()}
      aria-hidden="true"
    >
      {label && <span className="image-placeholder__label">[ {label} ]</span>}
    </div>
  )
}
