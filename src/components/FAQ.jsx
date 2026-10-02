import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { faq } from '../content/faq.js'
import './FAQ.css'

/** @typedef {import('../content/faq.js').FaqItem} FaqItem */

/**
 * @param {object} props
 * @param {FaqItem} props.item
 * @param {number} props.index
 * @param {boolean} props.open
 * @param {(index: number) => void} props.onToggle
 */
function FaqRow({ item, index, open, onToggle }) {
  const panelId = `faq-panel-${index}`
  const buttonId = `faq-button-${index}`
  return (
    <li className="faq__item">
      <h3 className="faq__q">
        <button
          type="button"
          id={buttonId}
          className="faq__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(index)}
        >
          <span>{item.q}</span>
          {open ? (
            <Minus className="faq__icon" size={22} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Plus className="faq__icon" size={22} strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </h3>
      {open && (
        <p id={panelId} className="faq__answer" role="region" aria-labelledby={buttonId}>
          {item.a}
        </p>
      )}
    </li>
  )
}

/**
 * FAQ: three-line display heading beside a single-open accordion.
 * `openFaq` holds the expanded index, or -1 for none; the first item starts
 * open and clicking the open item closes it.
 *
 * @param {object} props
 * @param {FaqItem[]} [props.items]  a page's own questions; defaults to the
 *   home page copy in src/content/faq.js. The heading is shared.
 */
export default function FAQ({ items = faq.items }) {
  const [openFaq, setOpenFaq] = useState(0)
  const toggle = (index) => setOpenFaq((current) => (current === index ? -1 : index))
  const lines = faq.headingLines

  return (
    <section className="faq" aria-labelledby="faq-heading">
      <h2 className="faq__heading" id="faq-heading">
        {lines.map((line, i) => (
          <span key={line} className={i === lines.length - 1 ? 'faq__heading-accent' : undefined}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </h2>
      <ul className="faq__list">
        {items.map((item, i) => (
          <FaqRow key={item.q} item={item} index={i} open={openFaq === i} onToggle={toggle} />
        ))}
      </ul>
    </section>
  )
}
