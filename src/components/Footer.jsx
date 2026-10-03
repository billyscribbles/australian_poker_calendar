import { Link } from 'react-router-dom'
import { Youtube, Facebook, Instagram, Twitter } from 'lucide-react'
import { site } from '../config/site.config.js'
import { consent } from '../content/consent.js'
import { cities } from '../content/cities.js'
import { tourPages } from '../content/tourPages.js'
import { openConsent } from '../lib/consent.js'
import Img from './Img.jsx'
import VenueCta from './VenueCta.jsx'
import './Footer.css'

// Social keys in site.config, in display order, with their icon and label.
const SOCIALS = [
  ['youtube', Youtube, 'YouTube'],
  ['facebook', Facebook, 'Facebook'],
  ['instagram', Instagram, 'Instagram'],
  ['twitter', Twitter, 'X'],
]

// A link list flows down then across, at most MAX_ROWS deep, so a long list
// (the tours) splits into even columns instead of one tall one: 7 links stay
// a single column, 11 become 6 and 5, 17 become 9 and 8.
const MAX_ROWS = 9
const rowsFor = (count) => Math.ceil(count / Math.ceil(count / MAX_ROWS))

export default function Footer() {
  const { brand, footer, social, contact } = site
  // The config's own columns, then one of city pages and one of tour pages,
  // generated so a new city or operator is linked from every page at once.
  const columns = [
    ...footer.columns,
    {
      title: footer.cityColumn,
      links: cities.map((city) => ({ label: city.heading, to: city.path })),
    },
    {
      title: footer.tourColumn,
      links: tourPages.map((tour) => ({ label: tour.name, to: tour.path })),
    },
  ]

  return (
    <footer className="footer">
      <VenueCta />
      <div className="footer__main">
        <div className="footer__brand">
          <Img
            src={brand.logoSrc}
            alt={brand.name}
            width={brand.logoWidth}
            height={brand.logoHeight}
            className="footer__logo-img"
          />
          <p className="footer__tagline">{brand.tagline}</p>
          <Link to={footer.about.to} className="footer__about">
            {footer.about.label} →
          </Link>

          <h2 className="footer__col-title footer__col-title--newsletter">
            {footer.newsletter.heading}
          </h2>
          <form className="footer__newsletter" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="footer-newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-newsletter-email"
              type="email"
              name="email"
              className="footer__input"
              placeholder={footer.newsletter.placeholder}
              autoComplete="email"
            />
            <button type="submit" className="footer__subscribe">
              {footer.newsletter.button}
            </button>
          </form>

          <h2 className="footer__col-title footer__col-title--follow">{footer.followHeading}</h2>
          <div className="footer__socials">
            {SOCIALS.map(([key, Icon, label]) =>
              social[key] ? (
                <a
                  key={key}
                  href={social[key]}
                  className="footer__social"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                </a>
              ) : null,
            )}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title} className="footer__group">
            <h2 className="footer__col-title">{col.title}</h2>
            <ul className="footer__links" style={{ '--footer-rows': rowsFor(col.links.length) }}>
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="footer__link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            {col === footer.columns[0] && (
              <div className="footer__contact">
                {contact.phone && (
                  // A real tel: link. The href strips spacing so the dialler gets
                  // a clean number while the label keeps its formatting.
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="footer__email">
                    {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="footer__email">
                    {contact.email}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="footer__bottom">
        <div className="footer__bottom-inner">
          <div className="footer__legal">
            <span>{footer.copyright}</span>
            {footer.legal.map((l) => (
              <Link key={l.to} to={l.to} className="footer__legal-btn">
                {l.label}
              </Link>
            ))}
            {site.integrations.consent && (
              // Reopens the cookie banner so a choice can be changed later —
              // withdrawing consent has to be as easy as giving it.
              <button type="button" className="footer__legal-btn" onClick={openConsent}>
                {consent.settingsLabel}
              </button>
            )}
            {/* Studio backlink. Plain https://onraistudio.com/ (no www, so it
                lands without a redirect) and an ordinary link — never add
                rel="nofollow". The prerender fails the build if this is missing
                from any route. */}
            <a
              href="https://onraistudio.com/"
              className="footer__legal-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Site by Onrai Studio
            </a>
          </div>
          <div className="footer__responsible">
            {footer.responsible.map((item) =>
              item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="footer__responsible-link"
                  {...(item.href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {item.label}
                </a>
              ) : (
                <span key={item.label}>{item.label}</span>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
