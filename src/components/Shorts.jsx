import { Play } from 'lucide-react'
import { shorts } from '../content/shorts.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import './Shorts.css'

/** @typedef {import('../content/shorts.js').Short} Short */

/** @param {{ short: Short }} props */
function ShortCard({ short }) {
  // No page or video behind these yet, so the card is an article, not a link.
  return (
    <article className="short-card">
      <ImagePlaceholder
        className="short-card__poster"
        src={short.posterSrc}
        width={180}
        height={320}
      />
      <span className="short-card__duration">{short.duration}</span>
      <span className="short-card__play" aria-hidden="true">
        <Play size={14} strokeWidth={1.5} fill="currentColor" />
      </span>
      <span className="short-card__caption">{short.title}</span>
    </article>
  )
}

/** Shorts: vertical video cards in a horizontal scroll row. */
export default function Shorts() {
  return (
    <section aria-labelledby="shorts-heading">
      <SectionHeading id="shorts-heading">{shorts.heading}</SectionHeading>
      <div className="shorts__row scroll-row">
        {shorts.items.map((short) => (
          <ShortCard key={short.title} short={short} />
        ))}
      </div>
    </section>
  )
}
