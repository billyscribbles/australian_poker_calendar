import { motion } from 'framer-motion'
import { howItWorks } from '../content/howItWorks.js'
import { useScrollIn } from '../lib/motion.js'
import './HowItWorks.css'

export default function HowItWorks() {
  const scrollIn = useScrollIn()
  return (
    <section className="hiw section section--dark">
      <div className="container">
        <div className="hiw__head">
          {howItWorks.eyebrow && <span className="section-eyebrow">{howItWorks.eyebrow}</span>}
          <h2 className="section-label">{howItWorks.heading}</h2>
          {howItWorks.sub && <p className="section-sub">{howItWorks.sub}</p>}
        </div>

        <div className="hiw__grid">
          {howItWorks.steps.map((step, i) => (
            <motion.div key={step.number} className="hiw__step" {...scrollIn(i)}>
              <div className="hiw__number">{step.number}</div>
              <h3 className="hiw__title">{step.title}</h3>
              <p className="hiw__body">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
