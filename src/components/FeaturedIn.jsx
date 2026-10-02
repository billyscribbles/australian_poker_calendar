import { partners } from '../content/partners.js'
import Img from './Img.jsx'
import './FeaturedIn.css'

/** @typedef {import('../content/partners.js').Partner} Partner */

/** @param {{ partner: Partner }} props */
function PartnerBox({ partner }) {
  return (
    <li className="partner-box">
      {partner.logoSrc ? (
        <Img
          src={partner.logoSrc}
          alt={partner.name}
          width={150}
          height={56}
          className="partner-box__logo"
        />
      ) : (
        partner.name
      )}
    </li>
  )
}

/** "Featured in": a centred, wrapping row of partner logo boxes. */
export default function FeaturedIn() {
  return (
    <section className="featured-in" aria-labelledby="featured-in-heading">
      <h2 className="featured-in__label" id="featured-in-heading">
        {partners.heading}
      </h2>
      <ul className="featured-in__row">
        {partners.items.map((partner) => (
          <PartnerBox key={partner.name} partner={partner} />
        ))}
      </ul>
    </section>
  )
}
