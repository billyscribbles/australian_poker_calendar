import Img from './Img.jsx'
import './GpiCredit.css'

/**
 * Where the Player of the Year standings come from: the GPI logo, a link to
 * the source table, and GPI's last weekly update.
 *
 * @param {object} props
 * @param {{ name: string, href: string, logoSrc: string, logoWidth: number, logoHeight: number }} props.source
 * @param {string} props.sourceLabel   e.g. "Rankings by"
 * @param {string} props.updatedLabel  e.g. "Updated"
 * @param {string} props.updated       ISO date
 * @param {string} props.updatedText   the date as shown
 */
export default function GpiCredit({ source, sourceLabel, updatedLabel, updated, updatedText }) {
  return (
    <p className="gpi-credit">
      <a className="gpi-credit__link" href={source.href} target="_blank" rel="noopener noreferrer">
        <Img
          className="gpi-credit__logo"
          src={source.logoSrc}
          alt=""
          width={source.logoWidth}
          height={source.logoHeight}
        />
        <span>
          {sourceLabel} <span className="gpi-credit__name">{source.name}</span>
        </span>
      </a>
      <span className="gpi-credit__updated">
        {updatedLabel} <time dateTime={updated}>{updatedText}</time>
      </span>
    </p>
  )
}
