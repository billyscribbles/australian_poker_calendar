import SEO from '../lib/seo.jsx'
import { playersPage } from '../content/playersPage.js'
import OutlineButton from '../components/OutlineButton.jsx'
import './PlayersPage.css'

/** Holding page for player rankings until the first series' results are in. */
export default function PlayersPage() {
  const { seo, eyebrow, title, intro, how, source, cta } = playersPage
  return (
    <main>
      {/* noindex: a holding page with no standings is thin content; drop the
          flag in src/routes.js when the rankings table lands. */}
      <SEO title={seo.title} description={seo.description} path="/players" noindex />
      <section className="players-hero">
        <div className="container">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className="players-hero__title">{title}</h1>
          <p className="players-hero__sub">{intro}</p>
        </div>
      </section>

      <section className="section players-how" aria-labelledby="players-how-heading">
        <div className="container">
          <h2 id="players-how-heading" className="players-how__heading">
            {how.heading}
          </h2>
          <ol className="players-how__list">
            {how.items.map((item, i) => (
              <li key={item.title} className="players-how__item glow-card">
                <span className="players-how__step" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="players-how__title">{item.title}</h3>
                <p className="players-how__body">{item.body}</p>
              </li>
            ))}
          </ol>
          <p className="players-how__source">
            {source.label}:{' '}
            <a href={source.href} target="_blank" rel="noopener noreferrer">
              {source.name}
            </a>
          </p>
          <div className="players-how__cta">
            <OutlineButton to={cta.to}>{cta.label}</OutlineButton>
          </div>
        </div>
      </section>
    </main>
  )
}
