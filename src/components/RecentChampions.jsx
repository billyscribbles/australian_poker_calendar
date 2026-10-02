import { Link } from 'react-router-dom'
import { recentChampions } from '../content/recentChampions.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import OutlineButton from './OutlineButton.jsx'
import ComingSoon from './ComingSoon.jsx'
import './RecentChampions.css'

/** @typedef {import('../content/recentChampions.js').Champion} Champion */

/** @param {{ champion: Champion }} props */
function ChampionCard({ champion }) {
  return (
    <li>
      <Link to={champion.href} className="champion-card">
        <ImagePlaceholder
          label="portrait"
          labelAlign="top-left"
          className="champion-card__portrait"
          src={champion.portraitSrc}
          alt=""
          width={480}
          height={720}
        />
        <div className="champion-card__overlay">
          <div className="champion-card__event">
            {champion.series} · {champion.event}
          </div>
          <h3 className="champion-card__name">{champion.name}</h3>
          <div className="champion-card__meta">
            <span className="champion-card__prize">{champion.prize}</span>
            <span className="champion-card__date">{champion.date}</span>
          </div>
        </div>
      </Link>
    </li>
  )
}

/** Recent Champions: portrait cards with the title won and the prize, or the holding card until a result lands. */
export default function RecentChampions() {
  const { heading, pending, cta, items } = recentChampions
  return (
    <div className="champions" aria-labelledby="champions-heading" role="region">
      <SectionHeading id="champions-heading">{heading}</SectionHeading>
      {items.length ? (
        <ul className="champions__grid">
          {items.map((champion) => (
            <ChampionCard key={champion.href} champion={champion} />
          ))}
        </ul>
      ) : (
        <ComingSoon title={pending.title} body={pending.body} />
      )}
      <OutlineButton to={cta.to}>{cta.label}</OutlineButton>
    </div>
  )
}
