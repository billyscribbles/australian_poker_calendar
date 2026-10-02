// Contract: each section's content file keeps the shape its component
// renders. Rewriting copy for a new client is fine; breaking the shape
// (a missing key, an object where an array is expected) fails here.
import { describe, it, expect } from 'vitest'
import { about } from '../content/about.js'
import { contact } from '../content/contact.js'
import { faq } from '../content/faq.js'
import { legal } from '../content/legal.js'
import { consent } from '../content/consent.js'

describe('content — section copy contract', () => {
  it('about has an intro and titled sections', () => {
    expect(about.intro).toBeTruthy()
    expect(about.sections.length).toBeGreaterThan(0)
    for (const section of about.sections) {
      expect(section.heading).toBeTruthy()
      expect(section.body).toBeTruthy()
    }
  })

  it('contact copy has a heading, labels for every field and both outcomes', () => {
    expect(contact.heading).toBeTruthy()
    for (const key of ['name', 'email', 'message']) expect(contact.fields[key]).toBeTruthy()
    expect(contact.submit).toBeTruthy()
    expect(contact.success).toBeTruthy()
    expect(contact.errorPrefix).toBeTruthy()
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
