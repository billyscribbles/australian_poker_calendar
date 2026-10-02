import './SectionHeading.css'

/**
 * Section title with the gold-to-transparent rule flexed after it.
 *
 * @param {object} props
 * @param {string} props.children  heading text
 * @param {string} [props.id]      anchor for aria-labelledby on the section
 */
export default function SectionHeading({ children, id }) {
  return (
    <h2 className="section-heading" id={id}>
      {children}
      <span className="section-heading__rule" aria-hidden="true" />
    </h2>
  )
}
