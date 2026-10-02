import SEO from '../lib/seo.jsx'
import { site } from '../config/site.config.js'
import { about } from '../content/about.js'
import Contact from '../components/Contact.jsx'
import './AboutPage.css'

export default function AboutPage() {
  return (
    <main>
      <SEO title="About" path="/about" />
      <section className="about-hero">
        <div className="container">
          <span className="section-eyebrow">{about.eyebrow}</span>
          <h1 className="about-hero__title">{site.brand.name}</h1>
          <p className="about-hero__sub">{about.intro}</p>
        </div>
      </section>
      <section className="about-body section">
        <div className="container about-body__inner">
          {about.sections.map((item) => (
            <article key={item.heading} className="about-body__item">
              <h2 className="about-body__heading">{item.heading}</h2>
              <p className="about-body__text">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
      <Contact />
    </main>
  )
}
