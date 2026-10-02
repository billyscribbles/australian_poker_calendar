import { Link } from 'react-router-dom'
import { playerNews } from '../content/playerNews.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import OutlineButton from './OutlineButton.jsx'
import './PlayerNews.css'

/** @typedef {import('../content/playerNews.js').PlayerNewsItem} PlayerNewsItem */

/** @param {{ item: PlayerNewsItem }} props */
function PlayerNewsCard({ item }) {
  return (
    <li>
      <Link to={item.href} className="player-card">
        <ImagePlaceholder
          label="portrait"
          labelAlign="top-left"
          className="player-card__portrait"
          src={item.portraitSrc}
          width={180}
          height={260}
        />
        <div className="player-card__overlay">
          <div className="player-card__date">{item.date}</div>
          <h3 className="player-card__title">{item.title}</h3>
        </div>
      </Link>
    </li>
  )
}

/** Player Related News: portrait cards with a bottom caption. */
export default function PlayerNews() {
  return (
    <div className="player-news" aria-labelledby="player-news-heading" role="region">
      <SectionHeading id="player-news-heading">{playerNews.heading}</SectionHeading>
      <ul className="player-news__grid">
        {playerNews.items.map((item) => (
          <PlayerNewsCard key={item.href} item={item} />
        ))}
      </ul>
      <OutlineButton to={playerNews.cta.to}>{playerNews.cta.label}</OutlineButton>
    </div>
  )
}
