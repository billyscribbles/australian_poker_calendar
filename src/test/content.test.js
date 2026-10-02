// Contract: each section's content file keeps the shape its component
// renders. Rewriting copy for a new client is fine; breaking the shape
// (a missing key, an object where an array is expected) fails here.
import { describe, it, expect } from 'vitest'
import { hero } from '../content/hero.js'
import { stats } from '../content/stats.js'
import { services } from '../content/services.js'
import { howItWorks } from '../content/howItWorks.js'
import { testimonials } from '../content/testimonials.js'
import { faq } from '../content/faq.js'
import { legal } from '../content/legal.js'
import { consent } from '../content/consent.js'

describe('content — section copy contract', () => {
  it('hero has a headline and a primary CTA', () => {
    expect(hero.headline).toBeTruthy()
    expect(hero.primaryCta.label).toBeTruthy()
    expect(hero.primaryCta.to).toBeTruthy()
  })

  it('stats is a non-empty array of { value, label }', () => {
    expect(stats.length).toBeGreaterThan(0)
    for (const stat of stats) {
      expect(stat.value).toBeTruthy()
      expect(stat.label).toBeTruthy()
    }
  })

  it('services has items with icon, title and body', () => {
    expect(services.items.length).toBeGreaterThan(0)
    for (const item of services.items) {
      expect(item.icon).toBeTruthy()
      expect(item.title).toBeTruthy()
      expect(item.body).toBeTruthy()
    }
  })

  it('howItWorks has numbered, titled steps', () => {
    expect(howItWorks.steps.length).toBeGreaterThan(0)
    for (const step of howItWorks.steps) {
      expect(step.number).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.body).toBeTruthy()
    }
  })

  it('testimonials has quotes with an author', () => {
    expect(testimonials.items.length).toBeGreaterThan(0)
    for (const item of testimonials.items) {
      expect(item.quote).toBeTruthy()
      expect(item.author).toBeTruthy()
    }
  })

  it('faq has question / answer pairs', () => {
    expect(faq.items.length).toBeGreaterThan(0)
    for (const item of faq.items) {
      expect(item.q).toBeTruthy()
      expect(item.a).toBeTruthy()
    }
  })

  it('consent banner copy has text and both button labels', () => {
    expect(consent.text).toBeTruthy()
    expect(consent.accept).toBeTruthy()
    expect(consent.decline).toBeTruthy()
  })

  it('legal has privacy and terms, each with sections', () => {
    for (const doc of [legal.privacy, legal.terms]) {
      expect(doc.title).toBeTruthy()
      expect(doc.sections.length).toBeGreaterThan(0)
      for (const section of doc.sections) {
        expect(section.heading).toBeTruthy()
        expect(section.body).toBeTruthy()
      }
    }
  })
})
