import { useState } from 'react'
import { trackConversion } from './analytics.js'

/** Where every form on the site posts. server/api.mjs answers it. */
export const ENQUIRY_ENDPOINT = '/api/enquiry'

/**
 * Submit handling shared by the contact and venue forms.
 *
 * Returns the form status and an onSubmit handler. The handler drops
 * submissions whose honeypot (`_gotcha`) is filled, posts the form's own
 * fields to the site's own /api/enquiry (which saves the enquiry for the
 * admin dashboard, files and all), and counts the
 * conversion only once the server accepts it.
 *
 * @param {'contact'|'venue'} form  which form this is; the dashboard files it under that
 * @param {string} ctaLocation  where the form sits, for the GA4 event
 */
export function useEnquiry(form, ctaLocation) {
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  async function handleSubmit(e) {
    e.preventDefault()
    const el = e.currentTarget
    // Honeypot: real users never see or fill this field — bots do.
    if (el.elements._gotcha?.value) return
    setStatus('submitting')
    const data = new FormData(el)
    data.set('form', form)
    try {
      const res = await fetch(ENQUIRY_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setStatus('success')
        // The conversion. Fired here rather than on click, so it only counts a
        // submission the server actually saved. Mark `contact_form_submitted`
        // as a key event in GA4 to turn it into a goal — see trackConversion.
        trackConversion('contact_form_submitted', { cta_location: ctaLocation })
        el.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return { status, handleSubmit }
}
