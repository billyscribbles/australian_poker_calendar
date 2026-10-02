import { Link } from 'react-router-dom'
import { guides } from '../content/guides.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import OutlineButton from './OutlineButton.jsx'
import './Guides.css'

/** @typedef {import('../content/guides.js').Guide} Guide */

/** @param {{ guide: Guide, rows: { key: string, label: string }[] }} props */
function GuideCard({ guide, rows }) {
  return (
    <li>
      <Link to={guide.href} className="guide-card">
        <ImagePlaceholder
          variant="fine"
          className="guide-card__image"
          src={guide.imageSrc}
          width={180}
          height={80}
        />
        <h3 className="guide-card__country">{guide.country}</h3>
        <dl className="guide-card__facts">
          {rows.map((row) => (
            <div key={row.key} className="guide-card__fact">
              <dt>{row.label}</dt>
              <dd>{guide[row.key]}</dd>
            </div>
          ))}
        </dl>
      </Link>
    </li>
  )
}

/** Live Poker Guides: one card per country with capital, currency and timezone. */
export default function Guides() {
  return (
    <section aria-labelledby="guides-heading">
      <SectionHeading id="guides-heading">{guides.heading}</SectionHeading>
      <ul className="guides__grid">
        {guides.items.map((guide) => (
          <GuideCard key={guide.href} guide={guide} rows={guides.rows} />
        ))}
      </ul>
      <OutlineButton to={guides.cta.to}>{guides.cta.label}</OutlineButton>
    </section>
  )
}
