import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Newspaper, CalendarDays, Users, BookOpen } from 'lucide-react'
import { site } from '../config/site.config.js'
import Img from './Img.jsx'
import './Navbar.css'

// Glyph for each `icon` key a nav tab can name in site.config. Adding a tab
// with a new key means adding a Lucide import here, nothing else.
const NAV_ICONS = {
  news: Newspaper,
  calendar: CalendarDays,
  players: Users,
  learn: BookOpen,
}

/**
 * Site header: logo, then the four section tabs.
 *
 * Tabs and brand come from site.config. The tab whose `to` matches the current
 * route is drawn in the active (gold border, champagne text) state.
 */
export default function Navbar() {
  const { pathname } = useLocation()
  const { brand, nav } = site

  return (
    <header className="site-header">
      <div className="site-header__top container">
        <Link to="/" className="site-header__logo" aria-label={brand.name}>
          <Img
            src={brand.logoSrc}
            alt={brand.name}
            width={brand.logoWidth}
            height={brand.logoHeight}
            priority
            className="site-header__logo-img"
          />
        </Link>
      </div>

      <nav className="site-header__tabs container" aria-label="Main navigation">
        {nav.map((tab) => {
          const active = tab.to === pathname
          const Icon = NAV_ICONS[tab.icon]
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`nav-tab${active ? ' nav-tab--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {Icon && (
                <Icon size={20} strokeWidth={1.75} className="nav-tab__icon" aria-hidden="true" />
              )}
              {tab.label}
              <ChevronDown
                size={10}
                strokeWidth={2.5}
                className="nav-tab__chevron"
                aria-hidden="true"
              />
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
