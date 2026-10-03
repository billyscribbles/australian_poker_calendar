import { Link } from 'react-router-dom'
import { stories } from '../content/stories.js'
import { getRuntimeContent } from '../lib/runtimeContent.js'
import { formatShortDate } from '../lib/dates.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import './Stories.css'

/**
 * One card. A published story (it has an `href`) links to its page; a demo
 * card from the content file has no page and stays an article.
 *
 * @param {{ story: object }} props
 */
export function StoryCard({ story }) {
  if (!story.href) {
    return (
      <li>
        <article className="story-card">
          <ImagePlaceholder
            label="story image"
            className="story-card__image"
            src={story.imageSrc}
            width={540}
            height={300}
          />
          <div className="story-card__body">
            <div className="story-card__date">{story.date}</div>
            <h3 className="story-card__title">{story.title}</h3>
          </div>
        </article>
      </li>
    )
  }
  return (
    <li>
      <Link to={story.href} className="story-card story-card--link">
        {/* The title beside it names the story; the picture is decoration here. */}
        <ImagePlaceholder
          className="story-card__image"
          src={story.heroThumb || story.heroImage}
          alt=""
          width={800}
          height={450}
        />
        <div className="story-card__body">
          <div className="story-card__date">{formatShortDate(story.date)}</div>
          <h3 className="story-card__title">{story.title}</h3>
        </div>
      </Link>
    </li>
  )
}

/** Stories: published articles when there are any, the demo cards until then. */
export default function Stories() {
  const published = getRuntimeContent().stories
  const live = published.length > 0
  const items = live ? published.slice(0, stories.homeLimit) : stories.demo
  return (
    <section aria-labelledby="stories-heading">
      <div className="stories__head">
        <SectionHeading id="stories-heading">{stories.heading}</SectionHeading>
        {live && (
          <Link to={stories.path} className="stories__all">
            {stories.allLink}
          </Link>
        )}
      </div>
      <ul className="stories__grid">
        {items.map((story) => (
          <StoryCard key={story.slug || story.title} story={story} />
        ))}
      </ul>
    </section>
  )
}
