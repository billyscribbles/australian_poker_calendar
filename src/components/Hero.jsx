import { Link } from 'react-router-dom'
import { hero } from '../content/hero.js'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__inner">
        <div className="hero__content">
          {hero.eyebrow && (
            <span className="hero__eyebrow hero__fade-up" style={{ animationDelay: '0s' }}>
              {hero.eyebrow}
            </span>
          )}

          <h1 className="hero__headline hero__fade-up" style={{ animationDelay: '0s' }}>
            {hero.headline}
            {hero.headlineAccent && (
              <>
                <br />
                <span className="hero__headline-accent">{hero.headlineAccent}</span>
              </>
            )}
          </h1>

          <p className="hero__subheadline hero__fade-up" style={{ animationDelay: '0.1s' }}>
            {hero.subheadline}
          </p>

          <div className="hero__ctas hero__fade-up" style={{ animationDelay: '0.2s' }}>
            {hero.primaryCta && (
              <Link to={hero.primaryCta.to} className="hero__cta-primary">
                {hero.primaryCta.label} →
              </Link>
            )}
            {hero.secondaryCta && (
              <Link to={hero.secondaryCta.to} className="hero__cta-secondary">
                {hero.secondaryCta.label}
              </Link>
            )}
          </div>

          {hero.trust?.length > 0 && (
            <div className="hero__trust-row hero__fade-up" style={{ animationDelay: '0.4s' }}>
              {hero.trust.map((t) => (
                <span key={t} className="hero__trust-item">
                  ✓ {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
