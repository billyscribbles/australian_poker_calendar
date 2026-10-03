import { useEffect, useState } from 'react'
import SEO from '../lib/seo.jsx'
import { breadcrumbLd } from '../lib/structuredData.js'
import { whereToPlay, STATES } from '../content/whereToPlay.js'
import VenueCard from '../components/VenueCard.jsx'
import LeagueCard from '../components/LeagueCard.jsx'
import MajorCard from '../components/MajorCard.jsx'
import './WhereToPlayPage.css'

const PATH = '/where-to-play'

/** Does a card or state belong to the picked states? None picked is every state. */
const inStates = (picked, codes) => picked.length === 0 || codes.some((c) => picked.includes(c))

/**
 * Where to play, in three tabs: all (the Majors on the calendar, then the
 * Local Circuit of rooms and leagues), poker rooms (one section per state, a
 * card per room or venue) and the pub
 * leagues by state. All is the default. Over the tabs, a state filter that
 * takes any number of states and narrows every tab and its count; with none
 * picked, as in the static HTML, every state shows. Every panel is in the
 * static HTML; the hidden ones carry `hidden`. `#rooms` opens the rooms tab,
 * a state's code (`#NSW`) the rooms tab filtered to it, and `#leagues` or
 * `#leagues-NSW` the leagues tab the same way, read after hydration so the
 * first client render matches the prerendered document. Everything comes from content/whereToPlay.js; the operator marks and colours from calendarPage.tours
 * and tourBrands.js through TourLogo.
 */
export default function WhereToPlayPage() {
  const { seo, eyebrow, title, intro, filter, countLabel, states, leagues, all, tabs } = whereToPlay
  const [tab, setTab] = useState('all')
  const [picked, setPicked] = useState(/** @type {string[]} */ ([]))

  useEffect(() => {
    // #leagues is the leagues tab and #leagues-NSW that tab filtered to NSW;
    // #rooms is the rooms tab and #NSW that tab filtered to NSW.
    const fromHash = () => {
      const hash = window.location.hash.slice(1)
      const code = hash.replace(`${leagues.id}-`, '')
      const state = STATES.some((s) => s.code === code) ? [code] : null
      if (hash.startsWith(leagues.id)) setTab('leagues')
      else if (hash === 'rooms' || state) setTab('rooms')
      else setTab('all')
      if (state) setPicked(state)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [leagues.id])

  const majors = all.majors.list.filter((major) => inStates(picked, major.states))
  const local = all.local.list.filter((item) =>
    inStates(picked, item.kind === 'room' ? [item.state] : item.states),
  )
  const roomStates = states.filter((state) => inStates(picked, [state.code]))
  const leagueStates = leagues.states.filter((state) => inStates(picked, [state.code]))
  // A league in two picked states is one league, not two.
  const leagueCount = leagues.list.filter((league) => inStates(picked, league.states)).length
  const leagueVenueCount = leagueStates.reduce((sum, state) => sum + state.venues.length, 0)

  const tabList = [
    { id: 'all', label: tabs.all, count: majors.length + local.length },
    {
      id: 'rooms',
      label: tabs.rooms,
      count: roomStates.reduce((sum, state) => sum + state.venues.length, 0),
    },
    { id: 'leagues', label: tabs.leagues, count: leagueCount + leagueVenueCount },
  ]

  /** @param {string} code */
  const toggle = (code) =>
    setPicked((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    )

  const empty = <p className="venues-empty">{filter.empty}</p>

  /** @param {string} id */
  const choose = (id) => {
    setTab(id)
    const hash = { all: '', rooms: '#rooms', leagues: `#${leagues.id}` }[id]
    window.history.replaceState(null, '', `${window.location.pathname}${hash}`)
  }

  /** Left and right arrows move between the tabs, as the ARIA tabs pattern expects. */
  const onKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const step = event.key === 'ArrowRight' ? 1 : tabList.length - 1
    const next = tabList[(tabList.findIndex((t) => t.id === tab) + step) % tabList.length].id
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
          <div className="venues-filter" role="group" aria-labelledby="venues-filter-heading">
            <div className="venues-filter__head">
              <span id="venues-filter-heading" className="venues-filter__label">
                {filter.heading}
              </span>
              <span className="venues-filter__status" aria-live="polite">
                {picked.length > 0 && filter.selectedLabel(picked.length)}
              </span>
            </div>
            <ul className="venues-states">
              <li>
                <button
                  type="button"
                  className="venues-states__tile venues-states__tile--all"
                  aria-pressed={picked.length === 0}
                  onClick={() => setPicked([])}
                >
                  <span className="venues-states__code">{filter.clear}</span>
                </button>
              </li>
              {STATES.map((state) => (
                <li key={state.code}>
                  <button
                    type="button"
                    className="venues-states__tile"
                    aria-pressed={picked.includes(state.code)}
                    onClick={() => toggle(state.code)}
                  >
                    <span className="venues-states__code" aria-hidden="true">
                      {state.code}
                    </span>
                    <span className="venues-states__name">{state.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
        id="venues-panel-all"
        role="tabpanel"
        aria-labelledby="venues-tab-all"
        hidden={tab !== 'all'}
      >
        {majors.length + local.length === 0 && <div className="container">{empty}</div>}
        {[
          { ...all.majors, list: majors },
          { ...all.local, list: local },
        ].map(
          (group, i) =>
            group.list.length > 0 && (
              <section
                key={group.heading}
                className="venues-state"
                aria-labelledby={`venues-all-${i}-heading`}
              >
                <div className="container">
                  <div className="venues-state__head">
                    <h2 id={`venues-all-${i}-heading`} className="venues-state__heading">
                      {group.heading}
                    </h2>
                    <span className="venues-state__count">
                      {group.countLabel(group.list.length)}
                    </span>
                  </div>
                  <p className="venues-state__intro">{group.intro}</p>
                  <ul className="venues-grid">
                    {i === 0
                      ? group.list.map((major) => <MajorCard key={major.code} major={major} />)
                      : group.list.map((item) =>
                          item.kind === 'room' ? (
                            <VenueCard key={item.id} venue={item} />
                          ) : (
                            <LeagueCard key={item.id} league={item} />
                          ),
                        )}
                  </ul>
                </div>
              </section>
            ),
        )}
      </div>

      <div
        id="venues-panel-rooms"
        role="tabpanel"
        aria-labelledby="venues-tab-rooms"
        hidden={tab !== 'rooms'}
      >
        {roomStates.length === 0 && <div className="container">{empty}</div>}
        {roomStates.map((state) => (
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
        </section>

        {leagueStates.length === 0 && <div className="container">{empty}</div>}
        {leagueStates.map((state) => (
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
                <span className="venues-state__count">{leagues.stateCountLabel(state)}</span>
              </div>
              <ul className="venues-grid">
                {state.leagues.map((league) => (
                  <LeagueCard key={league.id} league={league} />
                ))}
                {state.venues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
