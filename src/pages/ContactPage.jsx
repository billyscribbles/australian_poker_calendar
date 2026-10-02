import SEO from '../lib/seo.jsx'
import { site } from '../config/site.config.js'
import Contact from '../components/Contact.jsx'

export default function ContactPage() {
  return (
    <main>
      <SEO title="Contact" path="/contact" />
      {/* Page-level h1 — the Contact section's own heading is an h2 because
          that component is also reused as a section on the home page. */}
      <h1 className="sr-only">Contact {site.brand.name}</h1>
      <Contact />
    </main>
  )
}
