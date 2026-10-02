import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import './Breadcrumbs.css'

/**
 * The trail above a page, home first, the page itself last and unlinked.
 * Pair it with breadcrumbLd() from lib/structuredData.js so the visible trail
 * and the rich-result markup are the same list.
 *
 * @param {object} props
 * @param {{ name: string, path: string }[]} props.items
 */
export default function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={item.path} className="breadcrumbs__item">
              {last ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link to={item.path}>{item.name}</Link>
              )}
              {!last && <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
