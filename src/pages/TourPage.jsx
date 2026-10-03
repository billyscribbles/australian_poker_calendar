import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import { breadcrumbLd, seriesListLd, tourLd } from '../lib/structuredData.js'
import { useToday } from '../lib/useToday.js'
import { toStamp } from '../lib/calendar.js'
import { tourFor, tourPages, tourPage, toursPath } from '../content/tourPages.js'
import { tourBrandStyle } from '../content/tourBrands.js'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import SeriesList from '../components/SeriesList.jsx'
import VenueCard from '../components/VenueCard.jsx'
import TourLogo from '../components/TourLogo.jsx'
import './HubPage.css'

/**
 * /series/<slug>: an operator's series on the calendar, upcoming then past,
 * the rooms it deals at, the cities it visits and the other tours. `path` is
 * the route's own path; content/tourPages.js resolves it.
 */
export default function TourPage({ path }) {
  const tour = tourFor(path)
  const today = useToday()
  if (!tour) return null
  const upcoming = tour.series.filter((festival) => toStamp(festival.end) >= today)
  const past = tour.series.filter((festival) => toStamp(festival.end) < today)
  const trail = [
    { name: 'Home', path: '/' },
    { name: tourPage.index.heading, path: toursPath },
    { name: tour.name, path: tour.path },
  ]
  const others = tourPages.filter((other) => other.code !== tour.code)

  return (
    <main className="hub-page">
      <SEO
        title={tour.seo.title}
        description={tour.seo.description}
        path={tour.path}
        jsonLd={[breadcrumbLd(trail), tourLd(tour), seriesListLd(tour.series, tour)]}
      />

      <header className="hub-hero hub-hero--tour" style={tourBrandStyle(tour.code)}>
        <div className="container">
          <Breadcrumbs items={trail} />
          <div className="hub-hero__mark">
            <TourLogo code={tour.code} variant="wordmark" size={64} priority />
          </div>
          <span className="section-eyebrow">{tourPage.eyebrow}</span>
          <h1 className="hub-hero__title">{tour.heading}</h1>
          <p className="hub-hero__intro">{tour.intro}</p>
          <div className="hub-hero__actions">
            <a
              href={tour.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hub-hero__action"
            >
              {tourPage.officialSite}
              <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <section className="container hub-section" aria-labelledby="tour-upcoming">
        <SectionHeading id="tour-upcoming">{tourPage.upcomingHeading}</SectionHeading>
        {upcoming.length > 0 ? (
          <SeriesList festivals={upcoming} label={tourPage.upcomingHeading} />
        ) : (
          <p className="hub-empty">{tourPage.noUpcoming(tour)}</p>
        )}
      </section>

      {past.length > 0 && (
        <section className="container hub-section" aria-labelledby="tour-past">
          <SectionHeading id="tour-past">{tourPage.pastHeading}</SectionHeading>
          <SeriesList festivals={[...past].reverse()} label={tourPage.pastHeading} />
        </section>
      )}

      {tour.venues.length > 0 && (
        <section className="container hub-section" aria-labelledby="tour-venues">
          <SectionHeading id="tour-venues">{tourPage.venuesHeading(tour)}</SectionHeading>
          <ul className="venues-grid">
            {tour.venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </ul>
        </section>
      )}

      {tour.cities.length > 0 && (
        <section className="container hub-section" aria-labelledby="tour-cities">
          <SectionHeading id="tour-cities">{tourPage.citiesHeading}</SectionHeading>
          <ul className="hub-chips">
            {tour.cities.map((city) => (
              <li key={city.slug}>
                <Link to={city.path} className="hub-chip hub-chip--plain">
                  {city.heading}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="container hub-section" aria-labelledby="tour-others">
        <SectionHeading id="tour-others">{tourPage.otherHeading}</SectionHeading>
        <ul className="hub-chips">
          {others.map((other) => (
            <li key={other.code}>
              <Link to={other.path} className="hub-chip">
                <TourLogo code={other.code} variant="icon" size={32} />
                {other.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
