import { Link } from 'react-router-dom'
import { promotions } from '../content/promotions.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import './Promotions.css'

/** @typedef {import('../content/promotions.js').Promotion} Promotion */

/** @param {{ promo: Promotion, label: string }} props */
function PromoCard({ promo, label }) {
  return (
    <li>
      <Link to={promo.href} className="promo-card">
        <ImagePlaceholder
          label="promo banner"
          className="promo-card__banner"
          src={promo.bannerSrc}
          width={300}
          height={170}
        />
        <div className="promo-card__body">
          <div className="promo-card__label">
            {label} · <span className="promo-card__date">{promo.date}</span>
          </div>
          <h3 className="promo-card__title">{promo.title}</h3>
        </div>
      </Link>
    </li>
  )
}

/** Promotions: banner cards in an auto-fill grid. */
export default function Promotions() {
  return (
    <section aria-labelledby="promotions-heading">
      <SectionHeading id="promotions-heading">{promotions.heading}</SectionHeading>
      <ul className="promotions__grid">
        {promotions.items.map((promo) => (
          <PromoCard key={promo.href} promo={promo} label={promotions.label} />
        ))}
      </ul>
    </section>
  )
}
