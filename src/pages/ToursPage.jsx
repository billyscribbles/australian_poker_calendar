import { Link } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import { breadcrumbLd } from '../lib/structuredData.js'
import { tourPages, tourPage, toursPath } from '../content/tourPages.js'
import { listNames } from '../content/cities.js'
import { tourBrandStyle } from '../content/tourBrands.js'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import TourLogo from '../components/TourLogo.jsx'
import './HubPage.css'

/** /tours: every operator on the calendar, one card each, through to its page. */
export default function ToursPage() {
  const { index } = tourPage
  const trail = [
    { name: 'Home', path: '/' },
    { name: index.heading, path: toursPath },
  ]
  return (
    <main className="hub-page">
      <SEO
        title={index.seo.title}
        description={index.seo.description}
        path={toursPath}
        jsonLd={breadcrumbLd(trail)}
      />

      <header className="hub-hero">
        <div className="container">
          <Breadcrumbs items={trail} />
          <span className="section-eyebrow">{index.eyebrow}</span>
          <h1 className="hub-hero__title">{index.heading}</h1>
          <p className="hub-hero__intro">{index.intro}</p>
        </div>
      </header>

      <section className="container hub-section" aria-label={index.heading}>
        <ul className="tour-grid">
          {tourPages.map((tour) => (
            <li key={tour.code}>
              <Link
                to={tour.path}
                className="tour-card glow-card"
                style={tourBrandStyle(tour.code)}
              >
                <span className="tour-card__mark">
                  <TourLogo code={tour.code} variant="wordmark" size={48} />
                </span>
                <h2 className="tour-card__name">{tour.name}</h2>
                <p className="tour-card__meta">
                  {index.seriesLabel(tour.series.length)}
                  {tour.cities.length > 0 &&
                    ` · ${listNames(tour.cities.map((city) => city.name))}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
