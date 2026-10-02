import SEO from '../lib/seo.jsx'
import { venueForm } from '../content/contact.js'
import VenueForm from '../components/VenueForm.jsx'
import './ListVenuePage.css'

// The poker-room listing page: the pitch on the left, the form on the right.
// The footer's VenueCta band links here from every page.
export default function ListVenuePage() {
  return (
    <main>
      <SEO
        title={venueForm.seo.title}
        description={venueForm.seo.description}
        path={venueForm.path}
      />
      <section className="list-venue">
        <div className="container list-venue__inner">
          <div className="list-venue__copy">
            <span className="section-eyebrow">{venueForm.eyebrow}</span>
            <h1 className="list-venue__title">{venueForm.heading}</h1>
            <p className="list-venue__sub">{venueForm.sub}</p>
          </div>
          <VenueForm />
        </div>
      </section>
    </main>
  )
}
