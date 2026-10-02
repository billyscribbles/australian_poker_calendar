import './ComingSoon.css'

/**
 * Holding card for a home section whose data has not landed yet, drawn in the
 * same frame as the rows it stands in for.
 *
 * @param {object} props
 * @param {string} props.title  short status, e.g. "Coming soon"
 * @param {string} props.body   one line on when the real content arrives
 */
export default function ComingSoon({ title, body }) {
  return (
    <div className="coming-soon">
      <p className="coming-soon__title">{title}</p>
      <p className="coming-soon__body">{body}</p>
    </div>
  )
}
