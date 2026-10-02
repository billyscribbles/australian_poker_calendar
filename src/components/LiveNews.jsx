import { useState } from 'react'
import { liveNews } from '../content/liveNews.js'
import ArticleLink from './ArticleLink.jsx'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import OutlineButton from './OutlineButton.jsx'
import './LiveNews.css'

/** @typedef {import('../content/liveNews.js').LiveNewsItem} LiveNewsItem */

/** @param {{ item: LiveNewsItem }} props */
function LiveNewsRow({ item }) {
  return (
    <li>
      <ArticleLink href={item.href} className="live-news-row">
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
      </ArticleLink>
    </li>
  )
}

/**
 * Live Poker News: tournament reports as a list. It starts at `initialCount`
 * rows and a button reveals the rest.
 */
export default function LiveNews() {
  const [expanded, setExpanded] = useState(false)
  const { items, initialCount } = liveNews
  const shown = expanded ? items : items.slice(0, initialCount)
  return (
    <div className="live-news" aria-labelledby="live-news-heading" role="region">
      <SectionHeading id="live-news-heading">{liveNews.heading}</SectionHeading>
      <ul className="live-news__list">
        {shown.map((item) => (
          <LiveNewsRow key={item.href} item={item} />
        ))}
      </ul>
      {!expanded && items.length > initialCount && (
        <OutlineButton onClick={() => setExpanded(true)}>{liveNews.showMore}</OutlineButton>
      )}
    </div>
  )
}
