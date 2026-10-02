import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import { eventListLd } from '../lib/structuredData.js'
import { calendarPage } from '../content/calendarPage.js'
import { festivals, YEAR, YEARS } from '../content/festivals.js'
import { calendarPath } from '../routes.js'
import ImagePlaceholder from '../components/ImagePlaceholder.jsx'
import Img from '../components/Img.jsx'
import { festivalsInYear } from '../lib/calendar.js'
import FestivalCalendar from '../components/FestivalCalendar.jsx'
import UpNext from '../components/UpNext.jsx'
import FAQ from '../components/FAQ.jsx'
import PokerRooms from '../components/PokerRooms.jsx'
import './CalendarPage.css'

// The box a tour wordmark is contained in inside a tile (see .tour-tile__logo).
const TILE_LOGO_W = 100
const TILE_LOGO_H = 40

/**
 * The 1080×135 promo slot under the tour strip. The box keeps the artwork's
 * own proportions (see .calendar-page__banner), and a phone-sized cut swaps in
 * below 600px when the content provides one.
 */
function Banner({ banner }) {
  if (!banner.src) {
    return <ImagePlaceholder label={banner.label} className="calendar-page__banner" />
  }
  const img = (
    <picture>
      {banner.mobileSrc && <source media="(max-width: 600px)" srcSet={banner.mobileSrc} />}
      <Img
        src={banner.src}
        alt={banner.alt}
        width={1080}
        height={135}
        // Above the fold on a phone and the page's LCP element there, so it
        // must not be lazy; the hero title above it is text.
        priority
        className="calendar-page__banner-img"
      />
    </picture>
  )
  return banner.href ? (
    <Link to={banner.href} className="calendar-page__banner">
      {img}
    </Link>
  ) : (
    <div className="calendar-page__banner">{img}</div>
  )
}

/**
 * /poker-calendar/<year>: the year's festivals, browsed month by month.
 *
 * @param {object} props
 * @param {number} [props.year]  from src/routes.js
 */
export default function CalendarPage({ year = YEAR }) {
  const { tours, allTours, banner, years } = calendarPage
  const seo = calendarPage.seo(year)
  const title = calendarPage.title(year)
  const yearFestivals = festivalsInYear(festivals, year)
  const prevYear = YEARS[YEARS.indexOf(year) - 1]
  const nextYear = YEARS[YEARS.indexOf(year) + 1]
  // Small steps to the neighbouring years, drawn inside the calendar's frame
  // under the grid.
  const yearSteps = (prevYear || nextYear) && (
    <nav className="year-steps" aria-label={years.footLabel}>
      {prevYear && (
        <Link to={calendarPath(prevYear)} className="year-step">
          <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          {years.prev} <strong>{prevYear}</strong>
        </Link>
      )}
      {nextYear && (
        <Link to={calendarPath(nextYear)} className="year-step year-step--next">
          {years.next} <strong>{nextYear}</strong>
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </nav>
  )

  return (
    <main className="calendar-page container">
      <SEO
        title={seo.title}
        description={seo.description}
        path={calendarPath(year)}
        jsonLd={eventListLd(yearFestivals, year, seo)}
      />

      <section className="calendar-page__head">
        <h1 className="calendar-page__title">{title}</h1>
        <nav className="tour-strip scroll-row" aria-label="Tours">
          {tours.map((tour) => (
            <Link key={tour.code} to={tour.href} className="tour-tile">
              {tour.monoSrc ? (
                // Grey at rest, the operator's colours on hover. Both marks are
                // decorative: the label is the link's name, read but not shown.
                <>
                  <Img
                    src={tour.monoSrc}
                    alt=""
                    width={TILE_LOGO_W}
                    height={TILE_LOGO_H}
                    className="tour-tile__logo"
                  />
                  <Img
                    src={tour.logoSrc}
                    alt=""
                    width={TILE_LOGO_W}
                    height={TILE_LOGO_H}
                    className="tour-tile__logo tour-tile__logo--colour"
                  />
                  <span className="sr-only">{tour.label}</span>
                </>
              ) : (
                tour.label
              )}
            </Link>
          ))}
          <Link to={allTours.href} className="tour-tile tour-tile--all">
            {allTours.label}
          </Link>
        </nav>
      </section>

      <Banner banner={banner} />

      <FestivalCalendar festivals={yearFestivals} year={year} foot={yearSteps} />

      {/* A plain wrapper: UpNext is already the "Up Next" region, and a second
          landmark with the same name fails axe's landmark-unique. */}
      <div className="calendar-page__up-next">
        <UpNext />
      </div>

      <FAQ items={calendarPage.faq} />
      <PokerRooms />
    </main>
  )
}
