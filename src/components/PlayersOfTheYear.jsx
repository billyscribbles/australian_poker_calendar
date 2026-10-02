import { Link } from 'react-router-dom'
import { playersOfTheYear } from '../content/playersOfTheYear.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import OutlineButton from './OutlineButton.jsx'
import ComingSoon from './ComingSoon.jsx'
import './PlayersOfTheYear.css'

/** @typedef {import('../content/playersOfTheYear.js').PlayerStanding} PlayerStanding */

/** @param {{ player: PlayerStanding, indexLabel: string }} props */
function StandingRow({ player, indexLabel }) {
  return (
    <li>
      <Link to={player.href} className="standing">
        <div className="standing__rank">#{player.rank}</div>
        <ImagePlaceholder
          variant="fine"
          className="standing__avatar"
          src={player.avatarSrc}
          width={56}
          height={56}
        />
        <div className="standing__body">
          <h3 className="standing__name">{player.name}</h3>
          <div className="standing__sub">
            {player.country} · {player.cashes} cashes
          </div>
        </div>
        <div className="standing__index">
          <div className="standing__index-label">{indexLabel}</div>
          <div className="standing__points">{player.points}</div>
          <div className="standing__earnings">{player.earnings}</div>
        </div>
      </Link>
    </li>
  )
}

/** Players of the Year sidebar: the top three standings, or the holding card until they exist. */
export default function PlayersOfTheYear() {
  const { heading, indexLabel, pending, cta, items } = playersOfTheYear
  return (
    <div className="poy" role="region" aria-labelledby="poy-heading">
      <SectionHeading id="poy-heading">{heading}</SectionHeading>
      {items.length ? (
        <ul className="poy__list">
          {items.map((player) => (
            <StandingRow key={player.href} player={player} indexLabel={indexLabel} />
          ))}
        </ul>
      ) : (
        <ComingSoon title={pending.title} body={pending.body} />
      )}
      <OutlineButton to={cta.to}>{cta.label}</OutlineButton>
    </div>
  )
}
