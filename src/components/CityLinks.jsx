import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { calendarPage } from '../content/calendarPage.js'
import { cities } from '../content/cities.js'
import SectionHeading from './SectionHeading.jsx'
import './CityLinks.css'

/** "Poker by city" on the calendar page: a link to each city's own page, from content/cities.js. */
export default function CityLinks() {
  return (
    <section className="city-links" aria-labelledby="city-links-heading">
      <SectionHeading id="city-links-heading">{calendarPage.cityLinks.heading}</SectionHeading>
      <ul className="city-links__list">
        {cities.map((city) => (
          <li key={city.slug}>
            <Link className="city-links__link" to={city.path}>
              {city.heading}
              <ArrowUpRight className="city-links__icon" size={16} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
