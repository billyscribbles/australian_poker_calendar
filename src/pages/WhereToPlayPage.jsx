import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import { breadcrumbLd } from '../lib/structuredData.js'
import { whereToPlay } from '../content/whereToPlay.js'
import { cities, cityPage } from '../content/cities.js'
import VenueCard from '../components/VenueCard.jsx'
import LeagueCard from '../components/LeagueCard.jsx'
import './WhereToPlayPage.css'

const PATH = '/where-to-play'

/**
 * Where to play, in two tabs: poker rooms (one section per state, a card per
 * room or venue, and the way in to each city's own page) and the pub leagues.
 * Rooms is the default. Both panels are in the static HTML; the hidden one
 * carries `hidden`. `#leagues` in the URL opens the leagues tab, read after
 * hydration so the first client render matches the prerendered document. Everything comes from content/whereToPlay.js and
 * content/cities.js; the operator marks and colours from calendarPage.tours
 * and tourBrands.js through TourLogo.
 */
export default function WhereToPlayPage() {
  const {
    seo,
    eyebrow,
    title,
    intro,
    jumpLabel,
    stateNavHeading,
    cityNavHeading,
    countLabel,
    states,
    leagues,
    tabs,
  } = whereToPlay
  const [tab, setTab] = useState('rooms')

  useEffect(() => {
    // #leagues, or a state's section on it (#leagues-NSW), is the leagues tab.
    const fromHash = () =>
      setTab(window.location.hash.startsWith(`#${leagues.id}`) ? 'leagues' : 'rooms')
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [leagues.id])

  const roomCount = states.reduce((sum, state) => sum + state.venues.length, 0)
  const tabList = [
    { id: 'rooms', label: tabs.rooms, count: roomCount },
    { id: 'leagues', label: tabs.leagues, count: leagues.list.length },
  ]

  /** @param {string} id */
  const choose = (id) => {
    setTab(id)
    const hash = id === 'leagues' ? `#${leagues.id}` : ''
    window.history.replaceState(null, '', `${window.location.pathname}${hash}`)
  }

  /** Left and right arrows move between the two tabs, as the ARIA tabs pattern expects. */
  const onKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const next = tabList[(tabList.findIndex((t) => t.id === tab) + 1) % tabList.length].id
    choose(next)
    document.getElementById(`venues-tab-${next}`)?.focus()
  }

  return (
    <main>
      <SEO
        title={seo.title}
        description={seo.description}
        path={PATH}
        jsonLd={breadcrumbLd([
          { name: 'Home', path: '/' },
          { name: title, path: PATH },
        ])}
      />
      <section className="venues-hero">
        <div className="container">
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className="venues-hero__title">{title}</h1>
          <p className="venues-hero__sub">{intro}</p>
          <div className="venues-tabs" role="tablist" aria-label={tabs.label}>
            {tabList.map((t) => (
              <button
                key={t.id}
                id={`venues-tab-${t.id}`}
                type="button"
                role="tab"
                className="venues-tabs__tab"
                aria-selected={tab === t.id}
                aria-controls={`venues-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => choose(t.id)}
                onKeyDown={onKeyDown}
              >
                {t.label}
                <span className="venues-tabs__count">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div
        id="venues-panel-rooms"
        role="tabpanel"
        aria-labelledby="venues-tab-rooms"
        hidden={tab !== 'rooms'}
      >
        <div className="container venues-browse">
          <div className="venues-browse__group">
            <span className="venues-browse__label" aria-hidden="true">
              {stateNavHeading}
            </span>
            <nav aria-label={jumpLabel}>
              <ul className="venues-states">
                {states.map((state) => (
                  <li key={state.code}>
                    <a className="venues-states__tile" href={`#${state.code}`}>
                      <span className="venues-states__code" aria-hidden="true">
                        {state.code}
                      </span>
                      <span className="venues-states__name">{state.name}</span>
                      <span className="venues-states__count">
                        {countLabel(state.venues.length)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="venues-browse__group">
            <span className="venues-browse__label" aria-hidden="true">
              {cityNavHeading}
            </span>
            <nav aria-label={cityPage.otherHeading}>
              <ul className="venues-cities">
                {cities.map((city) => (
                  <li key={city.slug}>
                    <Link className="venues-cities__link" to={city.path}>
                      {city.heading}
                      <ArrowUpRight className="venues-cities__icon" size={16} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {states.map((state) => (
          <section
            key={state.code}
            id={state.code}
            className="venues-state"
            aria-labelledby={`venues-${state.code}-heading`}
          >
            <div className="container">
              <div className="venues-state__head">
                <h2 id={`venues-${state.code}-heading`} className="venues-state__heading">
                  {state.name}
                </h2>
                <span className="venues-state__count">{countLabel(state.venues.length)}</span>
              </div>
              <ul className="venues-grid">
                {state.venues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <div
        id="venues-panel-leagues"
        role="tabpanel"
        aria-labelledby="venues-tab-leagues"
        hidden={tab !== 'leagues'}
      >
        <section id={leagues.id} className="venues-state" aria-labelledby="venues-leagues-heading">
          <div className="container">
            <div className="venues-state__head">
              <h2 id="venues-leagues-heading" className="venues-state__heading">
                {leagues.heading}
              </h2>
              <span className="venues-state__count">{leagues.countLabel(leagues.list.length)}</span>
            </div>
            <p className="venues-state__intro">{leagues.intro}</p>
            <div className="venues-explainer">
              <h3 className="venues-explainer__heading">{leagues.explainer.heading}</h3>
              {leagues.explainer.points.map((point) => (
                <p key={point} className="venues-explainer__text">
                  {point}
                </p>
              ))}
            </div>
          </div>
          <div className="container venues-browse">
            <div className="venues-browse__group">
              <span className="venues-browse__label" aria-hidden="true">
                {stateNavHeading}
              </span>
              <nav aria-label={leagues.jumpLabel}>
                <ul className="venues-states">
                  {leagues.states.map((state) => (
                    <li key={state.code}>
                      <a className="venues-states__tile" href={`#leagues-${state.code}`}>
                        <span className="venues-states__code" aria-hidden="true">
                          {state.code}
                        </span>
                        <span className="venues-states__name">{state.name}</span>
                        <span className="venues-states__count">
                          {leagues.countLabel(state.leagues.length)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </section>

        {leagues.states.map((state) => (
          <section
            key={state.code}
            id={`leagues-${state.code}`}
            className="venues-state"
            aria-labelledby={`leagues-${state.code}-heading`}
          >
            <div className="container">
              <div className="venues-state__head">
                <h2 id={`leagues-${state.code}-heading`} className="venues-state__heading">
                  {leagues.stateHeading(state)}
                </h2>
                <span className="venues-state__count">
                  {leagues.countLabel(state.leagues.length)}
                </span>
              </div>
              <ul className="venues-grid">
                {state.leagues.map((league) => (
                  <LeagueCard key={league.id} league={league} />
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
