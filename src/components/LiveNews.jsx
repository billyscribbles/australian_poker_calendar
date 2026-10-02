import { Link } from 'react-router-dom'
import { liveNews } from '../content/liveNews.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import OutlineButton from './OutlineButton.jsx'
import './LiveNews.css'

/** @typedef {import('../content/liveNews.js').LiveNewsItem} LiveNewsItem */

/** @param {{ item: LiveNewsItem }} props */
function LiveNewsRow({ item }) {
  return (
    <li>
      <Link to={item.href} className="live-news-row">
        <ImagePlaceholder
          variant="fine"
          className="live-news-row__thumb"
          src={item.thumbSrc}
          width={120}
          height={72}
        />
        <div className="live-news-row__body">
          <div className="live-news-row__meta">
            {item.date} · <span className="live-news-row__event">{item.event}</span>
          </div>
          <h3 className="live-news-row__title">{item.title}</h3>
        </div>
      </Link>
    </li>
  )
}

/** Live Poker News: tournament reports as a list, with a "read more" button. */
export default function LiveNews() {
  return (
    <div className="live-news" aria-labelledby="live-news-heading" role="region">
      <SectionHeading id="live-news-heading">{liveNews.heading}</SectionHeading>
      <ul className="live-news__list">
        {liveNews.items.map((item) => (
          <LiveNewsRow key={item.href} item={item} />
        ))}
      </ul>
      <OutlineButton to={liveNews.cta.to}>{liveNews.cta.label}</OutlineButton>
    </div>
  )
}
