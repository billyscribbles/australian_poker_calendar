import { useState } from 'react'
import { site } from '../config/site.config.js'
import { trackConversion } from './analytics.js'

/**
 * Submit handling shared by every Formspree form on the site.
 *
 * Returns the form status and an onSubmit handler. The handler drops
 * submissions whose honeypot (`_gotcha`) is filled, reports an error when no
 * Formspree id is configured, posts the form's own fields, and counts the
 * conversion only once Formspree accepts it.
 *
 * @param {string} ctaLocation  where the form sits, for the GA4 event
 */
export function useFormspree(ctaLocation) {
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const formspreeId = site.integrations.formspreeId

  async function handleSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    // Honeypot: real users never see or fill this field — bots do.
    if (form.elements._gotcha?.value) return
    if (!formspreeId) {
      setStatus('error')
      return
    }
    setStatus('submitting')
    const data = new FormData(form)
    try {
      const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setStatus('success')
        // The conversion. Fired here rather than on click, so it only counts a
        // submission Formspree actually accepted. Mark `contact_form_submitted`
        // as a key event in GA4 to turn it into a goal — see trackConversion.
        trackConversion('contact_form_submitted', { cta_location: ctaLocation })
        form.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return { status, handleSubmit }
}
