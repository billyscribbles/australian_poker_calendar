import { Link } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import { breadcrumbLd } from '../lib/structuredData.js'
import { whereToPlay } from '../content/whereToPlay.js'
import { cities, cityPage } from '../content/cities.js'
import VenueCard from '../components/VenueCard.jsx'
import './WhereToPlayPage.css'

const PATH = '/where-to-play'

/**
 * Where to play: one section per state, a card per venue, and the way in to
 * each city's own page. Everything comes from content/whereToPlay.js and
 * content/cities.js; the operator marks and colours from calendarPage.tours
 * and tourBrands.js through TourLogo.
 */
export default function WhereToPlayPage() {
  const { seo, eyebrow, title, intro, jumpLabel, countLabel, states } = whereToPlay
  return (
    <main>
      <SEO
        title={seo.title}
        description={seo.description}
        path={PATH}
        jsonLd={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: title, path: PATH },
        ])}
      />
      <section className="venues-hero">
        <div className="container">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className="venues-hero__title">{title}</h1>
          <p className="venues-hero__sub">{intro}</p>
          <nav className="venues-jump" aria-label={jumpLabel}>
            {states.map((state) => (
              <a key={state.code} className="venues-jump__link" href={`#${state.code}`}>
                {state.name}
                <span className="venues-jump__count">{state.venues.length}</span>
              </a>
            ))}
          </nav>
          <nav className="venues-jump venues-jump--cities" aria-label={cityPage.otherHeading}>
            {cities.map((city) => (
              <Link key={city.slug} className="venues-jump__link" to={city.path}>
                {city.heading}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {states.map((state) => (
        <section
          key={state.code}
          id={state.code}
          className="venues-state"
          aria-labelledby={`venues-${state.code}-heading`}
        >
          <div className="container">
            <div className="venues-state__head">
              <h2 id={`venues-${state.code}-heading`} className="venues-state__heading">
                {state.name}
              </h2>
              <span className="venues-state__count">{countLabel(state.venues.length)}</span>
            </div>
            <ul className="venues-grid">
              {state.venues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </ul>
          </div>
        </section>
      ))}
    </main>
  )
}
