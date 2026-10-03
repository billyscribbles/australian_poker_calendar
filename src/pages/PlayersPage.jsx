import { useDeferredValue, useState } from 'react'
import { Search } from 'lucide-react'
import SEO from '../lib/seo.jsx'
import { playersPage } from '../content/playersPage.js'
import OutlineButton from '../components/OutlineButton.jsx'
import GpiCredit from '../components/GpiCredit.jsx'
import GpiBoardTabs from '../components/GpiBoardTabs.jsx'
import PokerRooms from '../components/PokerRooms.jsx'
import './PlayersPage.css'

/** @typedef {import('../content/gpiRankings.js').GpiStanding} GpiStanding */

/** Lower-cased with accents stripped, so "jose" finds "José". */
const fold = (/** @type {string} */ s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Each board's rank by player, so a row can show where the player sits on the other board. */
const ranksOf = (/** @type {import('../content/gpiRankings.js').GpiBoard[]} */ boards) =>
  Object.fromEntries(boards.map((b) => [b.id, new Map(b.standings.map((p) => [p.href, p.rank]))]))
const allRanks = ranksOf(playersPage.boards)
const womenRanks = ranksOf(playersPage.womenBoards)

/** The Australian GPI standings, the GPI ranking and PoY 2026, with their source and last update. */
export default function PlayersPage() {
  const {
    seo,
    eyebrow,
    title,
    intro,
    credit,
    stats,
    tabsLabel,
    search,
    podium,
    table,
    how,
    womenOnly: womenToggle,
    cta,
  } = playersPage
  const { source, updated, updatedText } = playersPage
  const [query, setQuery] = useState('')
  const [womenOnly, setWomenOnly] = useState(false)
  const boards = womenOnly ? playersPage.womenBoards : playersPage.boards
  const rankOn = womenOnly ? womenRanks : allRanks
  const needle = fold(useDeferredValue(query))

  return (
    <main>
      <SEO title={seo.title} description={seo.description} path="/players" />
      <section className="players-hero">
        <div className="container players-hero__grid">
          <div>
            <span className="section-eyebrow">{eyebrow}</span>
            <h1 className="players-hero__title">{title}</h1>
            <p className="players-hero__sub">{intro}</p>
            <div className="players-hero__credit">
              <GpiCredit
                source={source}
                sourceLabel={credit.sourceLabel}
                updatedLabel={credit.updatedLabel}
                updated={updated}
                updatedText={updatedText}
              />
            </div>
          </div>
          <dl className="players-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="players-stats__item">
                <dt className="players-stats__label">{stat.label}</dt>
                <dd className="players-stats__value">{stat.value}</dd>
                <dd className="players-stats__detail">{stat.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section players-board" aria-label={tabsLabel}>
        <div className="container players-board__grid">
          <div className="players-board__main">
            <GpiBoardTabs
              boards={boards}
              idPrefix="players"
              label={tabsLabel}
              toolbar={
                <>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={womenOnly}
                    className="players-toggle"
                    onClick={() => setWomenOnly((on) => !on)}
                  >
                    <span className="players-toggle__track" aria-hidden="true">
                      <span className="players-toggle__thumb" />
                    </span>
                    {womenToggle.label}
                  </button>
                  <label className="players-search">
                    <span className="sr-only">{search.label}</span>
                    <Search className="players-search__icon" size={16} aria-hidden="true" />
                    <input
                      type="search"
                      className="players-search__input"
                      placeholder={search.placeholder}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                </>
              }
            >
              {(board) => {
                const other = boards.find((b) => b.id !== board.id) ?? board
                const shown = needle
                  ? board.standings.filter((p) => fold(p.name).includes(needle))
                  : board.standings
                return (
                  <>
                    <p className="players-board__count" aria-live="polite">
                      {search.count(shown.length, board.standings.length)}
                    </p>
                    {!needle && (
                      <ol className="players-podium" aria-label={podium.label(board.title)}>
                        {board.standings.slice(0, 3).map((player) => (
                          <li key={player.href} className="players-podium__card">
                            <span className="players-podium__rank" aria-hidden="true">
                              {player.rank}
                            </span>
                            <a
                              className="players-podium__name"
                              href={player.href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {player.name}
                            </a>
                            <span className="players-podium__points">
                              {player.points} {podium.points}
                            </span>
                            <span className="players-podium__global">
                              {board.globalRankLabel} #{player.globalRank}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {shown.length === 0 ? (
                      <p className="players-board__empty">{search.empty(query.trim())}</p>
                    ) : (
                      <table className="poy-table">
                        <caption className="sr-only">{table.caption(board.title)}</caption>
                        <thead>
                          <tr>
                            <th scope="col" className="poy-table__rank">
                              {table.columns.rank}
                            </th>
                            <th scope="col">{table.columns.player}</th>
                            <th scope="col" className="poy-table__num poy-table__other">
                              {table.otherRank(other.label)}
                            </th>
                            <th scope="col" className="poy-table__num">
                              {board.globalRankLabel}
                            </th>
                            <th scope="col" className="poy-table__num">
                              {table.columns.points}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {shown.map((player) => (
                            <tr
                              key={player.href}
                              className={player.rank <= 3 ? 'is-podium' : undefined}
                            >
                              <td className="poy-table__rank">{player.rank}</td>
                              <th scope="row" className="poy-table__player">
                                <a href={player.href} target="_blank" rel="noopener noreferrer">
                                  {player.name}
                                </a>
                              </th>
                              <td className="poy-table__num poy-table__other">
                                {rankOn[other.id].has(player.href) ? (
                                  `#${rankOn[other.id].get(player.href)}`
                                ) : (
                                  <>
                                    <span aria-hidden="true">—</span>
                                    <span className="sr-only">{table.unranked(other.label)}</span>
                                  </>
                                )}
                              </td>
                              <td className="poy-table__num poy-table__global">
                                #{player.globalRank}
                              </td>
                              <td className="poy-table__num poy-table__points">{player.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )
              }}
            </GpiBoardTabs>
          </div>

          <div className="players-how">
            <h2 id="players-how-heading" className="players-how__heading">
              {how.heading}
            </h2>
            <ol className="players-how__list">
              {how.items.map((item, i) => (
                <li key={item.title} className="players-how__item">
                  <span className="players-how__step" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="players-how__title">{item.title}</h3>
                  <p className="players-how__body">{item.body}</p>
                </li>
              ))}
            </ol>
            <div className="players-how__cta">
              <OutlineButton to={cta.to}>{cta.label}</OutlineButton>
            </div>
          </div>
        </div>
      </section>

      {/* The marquee bleeds past its container's padding to the page edge, so
          it needs a padded container to bleed out of. */}
      <div className="container">
        <PokerRooms />
      </div>
    </main>
  )
}
