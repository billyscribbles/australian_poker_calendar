import { useRef, useState } from 'react'
import './GpiBoardTabs.css'

/** @typedef {import('../content/gpiRankings.js').GpiBoard} GpiBoard */

/**
 * Tabs between the GPI boards (PoY and the GPI ranking). Every panel is in the
 * markup, the inactive ones `hidden`, so the prerendered HTML carries both
 * lists and the first board shows without JavaScript.
 *
 * @param {object} props
 * @param {GpiBoard[]} props.boards
 * @param {string} props.idPrefix  keeps tab ids unique when two of these share a page
 * @param {string} props.label     accessible name for the tab list
 * @param {import('react').ReactNode} [props.toolbar]  controls shown beside the tabs
 * @param {(board: GpiBoard) => import('react').ReactNode} props.children  a board's panel
 */
export default function GpiBoardTabs({ boards, idPrefix, label, toolbar, children }) {
  const [active, setActive] = useState(boards[0].id)
  const tabs = useRef(/** @type {(HTMLButtonElement | null)[]} */ ([]))

  /** Arrow keys move between tabs, as the ARIA tabs pattern expects. */
  const onKeyDown = (/** @type {import('react').KeyboardEvent} */ e, /** @type {number} */ i) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = (i + step + boards.length) % boards.length
    setActive(boards[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <div className="gpi-tabs">
      <div className="gpi-tabs__bar">
        <div className="gpi-tabs__list" role="tablist" aria-label={label}>
          {boards.map((board, i) => (
            <button
              key={board.id}
              ref={(el) => {
                tabs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${board.id}`}
              aria-controls={`${idPrefix}-panel-${board.id}`}
              aria-selected={board.id === active}
              tabIndex={board.id === active ? 0 : -1}
              className="gpi-tabs__tab"
              onClick={() => setActive(board.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {board.label}
            </button>
          ))}
        </div>
        {toolbar}
      </div>
      {boards.map((board) => (
        <div
          key={board.id}
          role="tabpanel"
          id={`${idPrefix}-panel-${board.id}`}
          aria-labelledby={`${idPrefix}-tab-${board.id}`}
          hidden={board.id !== active}
          className="gpi-tabs__panel"
        >
          {children(board)}
        </div>
      ))}
    </div>
  )
}
