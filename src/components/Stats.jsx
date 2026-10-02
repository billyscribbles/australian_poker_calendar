import { motion } from 'framer-motion'
import { stats } from '../content/stats.js'
import { useScrollIn } from '../lib/motion.js'
import './Stats.css'

export default function Stats() {
  const scrollIn = useScrollIn()
  return (
    <section className="stats">
      <div className="container">
        <div className="stats__grid">
          {stats.map((s, i) => (
            <motion.div key={s.label} className="stats__item" {...scrollIn(i)}>
              <div className="stats__value">{s.value}</div>
              <div className="stats__label">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
