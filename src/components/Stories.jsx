import { stories } from '../content/stories.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import './Stories.css'

/** @typedef {import('../content/stories.js').Story} Story */

/** @param {{ story: Story }} props */
function StoryCard({ story }) {
  // No page behind these yet, so the card is an article, not a link.
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

/** Stories: in-house features in an auto-fill card grid. */
export default function Stories() {
  return (
    <section aria-labelledby="stories-heading">
      <SectionHeading id="stories-heading">{stories.heading}</SectionHeading>
      <ul className="stories__grid">
        {stories.items.map((story) => (
          <StoryCard key={story.title} story={story} />
        ))}
      </ul>
    </section>
  )
}
