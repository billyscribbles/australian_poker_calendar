import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Newspaper, CalendarDays, Trophy, MapPin, Users, BookOpen, Menu, X } from 'lucide-react'
import { site } from '../config/site.config.js'
import Img from './Img.jsx'
import './Navbar.css'

// Glyph for each `icon` key a nav tab can name in site.config. Adding a tab
// with a new key means adding a Lucide import here, nothing else.
const NAV_ICONS = {
  news: Newspaper,
  calendar: CalendarDays,
  tours: Trophy,
  map: MapPin,
  players: Users,
  learn: BookOpen,
}

const NAV_ID = 'site-nav'

/**
 * Site header: logo, then the section tabs.
 *
 * Tabs and brand come from site.config. The tab whose `to` matches the current
 * route is drawn in the active (gold border, champagne text) state.
 *
 * On a phone the tabs fold away behind a hamburger in the logo row. The nav is
 * always in the markup (and so in the prerendered document); the CSS hides it
 * below the phone breakpoint until `open`. The menu closes on navigation and
 * on Escape.
 */
export default function Navbar() {
  const { pathname } = useLocation()
  const { brand, nav, navMenu } = site
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="site-header">
      <div className="site-header__top container">
        <Link to="/" className="site-header__logo" aria-label={brand.name}>
          <Img
            src={brand.logoSrc}
            alt={brand.name}
            width={brand.logoWidth}
            height={brand.logoHeight}
            // Eager, since it is above the fold, but not `priority`: a second
            // fetchpriority=high image splits the phone's bandwidth with the
            // hero, which is the page's LCP element.
            loading="eager"
            className="site-header__logo-img"
          />
        </Link>
        <button
          type="button"
          className="site-header__menu"
          aria-expanded={open}
          aria-controls={NAV_ID}
          aria-label={open ? navMenu.close : navMenu.open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X size={24} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Menu size={24} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      <nav
        id={NAV_ID}
        className={`site-header__tabs container${open ? ' site-header__tabs--open' : ''}`}
        aria-label={navMenu.label}
      >
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
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
