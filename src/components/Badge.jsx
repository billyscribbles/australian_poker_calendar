import './Badge.css'

/**
 * Small uppercase label.
 *
 * @param {object} props
 * @param {'filled' | 'outline' | 'selected' | 'neutral'} [props.variant]
 *   filled: gold on near-black (article category)
 *   outline: gold text, gold border
 *   selected: gold text on the selected surface
 *   neutral: off-white on raised surface (Upcoming)
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Badge({ variant = 'filled', className = '', children }) {
  return <span className={`badge badge--${variant} ${className}`.trim()}>{children}</span>
}

/**
 * Green "LIVE" chip. The large size carries a pulsing dot.
 *
 * @param {object} props
 * @param {'lg' | 'sm'} [props.size]
 * @param {string} [props.className]
 */
export function LiveBadge({ size = 'lg', className = '' }) {
  return (
    <span className={`live-badge live-badge--${size} ${className}`.trim()}>
      {size === 'lg' && <span className="live-badge__dot" aria-hidden="true" />}
      LIVE
    </span>
  )
}
