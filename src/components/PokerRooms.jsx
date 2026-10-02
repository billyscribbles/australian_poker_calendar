import { pokerRooms } from '../content/pokerRooms.js'
import { tourBrandStyle } from '../content/tourBrands.js'
import Img from './Img.jsx'
import './PokerRooms.css'

/** @typedef {import('../content/pokerRooms.js').PokerRoom} PokerRoom */

/**
 * One wordmark tile. Brand colours arrive as custom properties from
 * tourBrands.js; `data-logo` is the mark's tone from content/pokerRooms.js,
 * and a dark mark gets a white card.
 *
 * @param {{ room: PokerRoom, clone?: boolean }} props
 */
function RoomTile({ room, clone = false }) {
  return (
    <li className="poker-rooms__item">
      <a
        className="poker-rooms__tile"
        href={room.website}
        target="_blank"
        rel="noopener noreferrer"
        data-tour={room.code}
        data-logo={room.tone}
        style={tourBrandStyle(room.code)}
        // The clone exists only to make the loop seamless; it is hidden from
        // assistive tech, so it must not be a tab stop either.
        tabIndex={clone ? -1 : undefined}
      >
        {/* Eager on purpose: the strip slides tiles in from off-screen, where a
            lazy image never starts loading, and a marquee of empty boxes sails
            past. Eight small marks are cheap; `priority` is not used because that
            also asks the browser to fetch them before the hero. */}
        <Img
          src={room.logoSrc}
          alt={room.name}
          width={150}
          height={56}
          loading="eager"
          className="poker-rooms__logo"
        />
      </a>
    </li>
  )
}

/**
 * "Poker rooms across Australia": a slow, seamless marquee of every room's
 * wordmark, each tile lighting up in the room's own colours on hover.
 *
 * Two copies of the track sit side by side and the pair slides left by half
 * its width, so the second copy arrives exactly where the first began. The
 * second copy is aria-hidden: a screen reader hears each room once. With
 * `prefers-reduced-motion`, PokerRooms.css parks the strip as a static,
 * centred, wrapping grid of the first copy only.
 *
 * Pure CSS motion — no framer entrance, nothing at opacity 0 — so the
 * prerendered document paints the same markup the client hydrates.
 */
export default function PokerRooms() {
  return (
    <section className="poker-rooms" aria-labelledby="poker-rooms-heading">
      <h2 className="poker-rooms__label" id="poker-rooms-heading">
        {pokerRooms.heading}
      </h2>
      <div className="poker-rooms__viewport">
        <div className="poker-rooms__belt">
          <ul className="poker-rooms__track">
            {pokerRooms.rooms.map((room) => (
              <RoomTile key={room.code} room={room} />
            ))}
          </ul>
          <ul className="poker-rooms__track" aria-hidden="true">
            {pokerRooms.rooms.map((room) => (
              <RoomTile key={room.code} room={room} clone />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
