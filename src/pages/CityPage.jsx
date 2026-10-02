import { Link } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import { breadcrumbLd, seriesListLd } from '../lib/structuredData.js'
import { useToday } from '../lib/useToday.js'
import { toStamp } from '../lib/calendar.js'
import { cityFor, cities, cityPage } from '../content/cities.js'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import SeriesList from '../components/SeriesList.jsx'
import VenueCard from '../components/VenueCard.jsx'
import TourLogo from '../components/TourLogo.jsx'
import './HubPage.css'

const CALENDAR_PATH = '/poker-calendar/2026'
const WHERE_PATH = '/where-to-play'

/**
 * /poker/<city>: the city's series, split into upcoming and past, the rooms
 * it is dealt in, the operators that run there, and the other cities.
 * `path` is the route's own path; content/cities.js resolves it.
 */
export default function CityPage({ path }) {
  const city = cityFor(path)
  const today = useToday()
  if (!city) return null
  const upcoming = city.series.filter((festival) => toStamp(festival.end) >= today)
  const past = city.series.filter((festival) => toStamp(festival.end) < today)
  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Where to Play', path: WHERE_PATH },
    { name: city.heading, path: city.path },
  ]
  const others = cities.filter((other) => other.slug !== city.slug)

  return (
    <main className="hub-page">
      <SEO
        title={city.seo.title}
        description={city.seo.description}
        path={city.path}
        jsonLd={[breadcrumbLd(trail), seriesListLd(city.series, city)]}
      />

      <header className="hub-hero">
        <div className="container">
          <Breadcrumbs items={trail} />
          <span className="section-eyebrow">{cityPage.eyebrow(city)}</span>
          <h1 className="hub-hero__title">{city.heading}</h1>
          <p className="hub-hero__intro">{city.intro}</p>
          <div className="hub-hero__actions">
            <Link to={CALENDAR_PATH} className="hub-hero__action">
              {cityPage.calendarLink}
            </Link>
          </div>
        </div>
      </header>

      <section className="container hub-section" aria-labelledby="city-upcoming">
        <SectionHeading id="city-upcoming">{cityPage.upcomingHeading(city)}</SectionHeading>
        {upcoming.length > 0 ? (
          <SeriesList festivals={upcoming} label={cityPage.upcomingHeading(city)} />
        ) : (
          <p className="hub-empty">{cityPage.noUpcoming(city)}</p>
        )}
      </section>

      {past.length > 0 && (
        <section className="container hub-section" aria-labelledby="city-past">
          <SectionHeading id="city-past">{cityPage.pastHeading(city)}</SectionHeading>
          <SeriesList festivals={[...past].reverse()} label={cityPage.pastHeading(city)} />
        </section>
      )}

      {city.venues.length > 0 && (
        <section className="container hub-section" aria-labelledby="city-venues">
          <SectionHeading id="city-venues">{cityPage.venuesHeading(city)}</SectionHeading>
          <ul className="venues-grid">
            {city.venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </ul>
        </section>
      )}

      {city.operators.length > 0 && (
        <section className="container hub-section" aria-labelledby="city-operators">
          <SectionHeading id="city-operators">{cityPage.operatorsHeading(city)}</SectionHeading>
          <ul className="hub-chips">
            {city.operators.map((tour) => (
              <li key={tour.code}>
                <Link to={tour.href} className="hub-chip">
                  <TourLogo code={tour.code} variant="icon" size={32} />
                  {tour.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="container hub-section" aria-labelledby="city-others">
        <SectionHeading id="city-others">{cityPage.otherHeading}</SectionHeading>
        <ul className="hub-chips">
          {others.map((other) => (
            <li key={other.slug}>
              <Link to={other.path} className="hub-chip hub-chip--plain">
                {other.heading}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
