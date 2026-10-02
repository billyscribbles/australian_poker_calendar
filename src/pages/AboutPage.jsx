import SEO from '../lib/seo.jsx'
import { site } from '../config/site.config.js'
import Stats from '../components/Stats.jsx'
import Testimonials from '../components/Testimonials.jsx'
import Contact from '../components/Contact.jsx'
import './AboutPage.css'

export default function AboutPage() {
  return (
    <main>
      <SEO title="About" path="/about" />
      <section className="about-hero">
        <div className="container">
          <span className="section-eyebrow">About</span>
          <h1 className="about-hero__title">{site.brand.name}</h1>
          <p className="about-hero__sub">{site.brand.tagline}</p>
        </div>
      </section>
      <Stats />
      <Testimonials />
      <Contact />
    </main>
  )
}
