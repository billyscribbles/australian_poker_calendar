import { useState } from 'react'
import { Play } from 'lucide-react'
import { shorts } from '../content/shorts.js'
import { getRuntimeContent } from '../lib/runtimeContent.js'
import { formatDuration } from '../lib/dates.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import ShortPlayer from './ShortPlayer.jsx'
import './Shorts.css'

/** The face of a card: poster, duration badge, play ring and caption. */
function ShortFace({ poster, duration, title }) {
  return (
    <>
      <ImagePlaceholder className="short-card__poster" src={poster} width={180} height={320} />
      <span className="short-card__duration">{duration}</span>
      <span className="short-card__play" aria-hidden="true">
        <Play size={14} strokeWidth={1.5} fill="currentColor" />
      </span>
      <span className="short-card__caption">{title}</span>
    </>
  )
}

/** Shorts: published videos as buttons that open the player; demo cards until then. */
export default function Shorts() {
  const published = getRuntimeContent().shorts
  const items = published.length > 0 ? published.slice(0, shorts.homeLimit) : shorts.demo
  const [open, setOpen] = useState(null) // { short, opener: HTMLElement }

  function close() {
    const opener = open?.opener
    setOpen(null)
    opener?.focus()
  }

  return (
    <section aria-labelledby="shorts-heading">
      <SectionHeading id="shorts-heading">{shorts.heading}</SectionHeading>
      <div className="shorts__row scroll-row">
        {items.map((short) =>
          short.video ? (
            <button
              key={short.slug}
              type="button"
              className="short-card short-card--button"
              onClick={(e) => setOpen({ short, opener: e.currentTarget })}
            >
              <ShortFace
                poster={short.poster}
                duration={formatDuration(short.duration)}
                title={short.title}
              />
            </button>
          ) : (
            // No video behind a demo card, so it is an article, not a control.
            <article key={short.title} className="short-card">
              <ShortFace poster={short.posterSrc} duration={short.duration} title={short.title} />
            </article>
          ),
        )}
      </div>
      {open && <ShortPlayer short={open.short} onClose={close} />}
    </section>
  )
}
