import { Link } from 'react-router-dom'
import './OutlineButton.css'

/**
 * Gold outline link-button used under every list section. Fills gold on hover.
 * With `to` it is a route link; with `onClick` instead it is a plain button
 * (expand a list, for instance).
 *
 * @param {object} props
 * @param {string} [props.to]            route path
 * @param {() => void} [props.onClick]   handler, when it is a button
 * @param {string} props.children        label
 */
export default function OutlineButton({ to, onClick, children }) {
  if (to) {
    return (
      <Link to={to} className="outline-button">
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className="outline-button">
      {children}
    </button>
  )
}
