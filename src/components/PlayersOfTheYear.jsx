import { playersOfTheYear } from '../content/playersOfTheYear.js'
import SectionHeading from './SectionHeading.jsx'
import OutlineButton from './OutlineButton.jsx'
import ComingSoon from './ComingSoon.jsx'
import GpiCredit from './GpiCredit.jsx'
import GpiBoardTabs from './GpiBoardTabs.jsx'
import './PlayersOfTheYear.css'

/** @typedef {import('../content/gpiRankings.js').GpiStanding} GpiStanding */

/** @param {{ player: GpiStanding, globalRankLabel: string }} props */
function StandingRow({ player, globalRankLabel }) {
  return (
    <li>
      <a href={player.href} className="standing" target="_blank" rel="noopener noreferrer">
        <div className="standing__rank">#{player.rank}</div>
        <div className="standing__body">
          <h3 className="standing__name">{player.name}</h3>
          <div className="standing__sub">
            {globalRankLabel} #{player.globalRank}
          </div>
        </div>
        <div className="standing__index">
          <div className="standing__index-label">{playersOfTheYear.pointsLabel}</div>
          <div className="standing__points">{player.points}</div>
        </div>
      </a>
    </li>
  )
}

/** GPI standings sidebar: the top Australians on the GPI ranking and PoY 2026, or the holding card. */
export default function PlayersOfTheYear() {
  const { heading, tabsLabel, pending, cta, boards } = playersOfTheYear
  const { source, sourceLabel, updatedLabel, updated, updatedText } = playersOfTheYear
  return (
    <div className="poy" role="region" aria-labelledby="poy-heading">
      <SectionHeading id="poy-heading">{heading}</SectionHeading>
      {boards.length ? (
        <>
          <GpiBoardTabs boards={boards} idPrefix="poy" label={tabsLabel}>
            {(board) => (
              <ul className="poy__list">
                {board.standings.map((player) => (
                  <StandingRow
                    key={player.href}
                    player={player}
                    globalRankLabel={board.globalRankLabel}
                  />
                ))}
              </ul>
            )}
          </GpiBoardTabs>
          <GpiCredit
            source={source}
            sourceLabel={sourceLabel}
            updatedLabel={updatedLabel}
            updated={updated}
            updatedText={updatedText}
          />
        </>
      ) : (
        <ComingSoon title={pending.title} body={pending.body} />
      )}
      <OutlineButton to={cta.to}>{cta.label}</OutlineButton>
    </div>
  )
}
