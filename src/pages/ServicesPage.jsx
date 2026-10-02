import SEO from '../lib/seo.jsx'
import { site } from '../config/site.config.js'
import Services from '../components/Services.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import Contact from '../components/Contact.jsx'

export default function ServicesPage() {
  return (
    <main>
      <SEO title="Services" path="/services" />
      {/* Page-level h1 — the section components below carry their own h2s. */}
      <h1 className="sr-only">{site.brand.name} Services</h1>
      <div style={{ paddingTop: 64 }} />
      <Services />
      <HowItWorks />
      <Contact />
    </main>
  )
}
