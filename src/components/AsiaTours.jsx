import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { asiaTours } from '../content/asiaTours.js'
import { roughAud } from '../lib/currency.js'
import Img from './Img.jsx'
import SectionHeading from './SectionHeading.jsx'
import './AsiaTours.css'

/** @typedef {import('../content/asiaTours.js').AsiaTour} AsiaTour */

/** "5B KRW (~$5.3m)": the local guarantee with a rough AUD figure beside it */
function withAud(prize) {
  const aud = roughAud(prize, asiaTours.audRates)
  return aud ? `${prize} (~${aud})` : prize
}

/** @param {{ tour: AsiaTour, rows: { key: string, label: string }[] }} props */
function TourCard({ tour, rows }) {
  return (
    <li className="asia-tour">
      <div className="asia-tour__top">
        <Img src={tour.logoSrc} alt="" width={300} height={300} className="asia-tour__logo" />
        <p className="asia-tour__country">
          <Img
            src={asiaTours.flags[tour.country]}
            alt=""
            width={20}
            height={15}
            className="asia-tour__flag"
          />
          {tour.country}
        </p>
      </div>
      <h3 className="asia-tour__name">{tour.name}</h3>
      <dl className="asia-tour__facts">
        {rows
          .filter((row) => tour[row.key])
          .map((row) => (
            <div key={row.key} className="asia-tour__fact">
              <dt>{row.label}</dt>
              <dd>{row.key === 'prize' ? withAud(tour.prize) : tour[row.key]}</dd>
            </div>
          ))}
      </dl>
    </li>
  )
}

/**
 * Poker Tours in Asia: one row of series cards. The row scrolls natively
 * (swipe, trackpad, the scrollbar) and the two arrows page it by most of a
 * viewport so a click walks through the whole list.
 */
export default function AsiaTours() {
  const rowRef = useRef(null)

  const page = (direction) => {
    const row = rowRef.current
    if (!row) return
    row.scrollBy({ left: direction * row.clientWidth * 0.85, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="asia-tours-heading">
      <div className="asia-tours__head">
        <SectionHeading id="asia-tours-heading">{asiaTours.heading}</SectionHeading>
        <div className="asia-tours__arrows">
          <button
            type="button"
            className="asia-tours__arrow"
            aria-label={asiaTours.prevLabel}
            onClick={() => page(-1)}
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="asia-tours__arrow"
            aria-label={asiaTours.nextLabel}
            onClick={() => page(1)}
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
      <ul className="asia-tours__row scroll-row" ref={rowRef}>
        {asiaTours.items.map((tour) => (
          <TourCard key={tour.name} tour={tour} rows={asiaTours.rows} />
        ))}
      </ul>
    </section>
  )
}
