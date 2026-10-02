import { Link } from 'react-router-dom'
import './OutlineButton.css'

/**
 * Gold outline link-button used under every list section. Fills gold on hover.
 *
 * @param {object} props
 * @param {string} props.to        route path
 * @param {string} props.children  label
 */
export default function OutlineButton({ to, children }) {
  return (
    <Link to={to} className="outline-button">
      {children}
    </Link>
  )
}
