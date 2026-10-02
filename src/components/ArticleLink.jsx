import { Link } from 'react-router-dom'

/**
 * A route link, or a new-tab anchor when the article lives on another site
 * (syndicated news, for instance).
 *
 * @param {object} props
 * @param {string} props.href
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export default function ArticleLink({ href, className, children }) {
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  )
}
