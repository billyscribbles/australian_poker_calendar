import { useState } from 'react'
import { site } from '../config/site.config.js'
import './Contact.css'
import { trackConversion } from '../lib/analytics.js'

export default function Contact() {
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
        trackConversion('contact_form_submitted', { cta_location: 'contact-form' })
        form.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="contact section section--dark" id="contact">
      <div className="container contact__inner">
        <div className="contact__head">
          <span className="section-eyebrow">Get in touch</span>
          <h2 className="section-label">Let's build something great.</h2>
          <p className="section-sub">
            Tell us about your project — we'll reply within one business day.
          </p>
        </div>

        <form className="contact__form" onSubmit={handleSubmit}>
          <div className="contact__row">
            <label className="contact__field">
              <span>Name</span>
              <input type="text" name="name" autoComplete="name" required />
            </label>
            <label className="contact__field">
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>
          </div>
          <label className="contact__field">
            <span>Message</span>
            <textarea name="message" rows="5" required />
          </label>

          {/* Honeypot — visually hidden, labelled for AT, ignored by Formspree
              when filled. Bots that fill every field get caught here. */}
          <label className="contact__honeypot">
            Leave this field empty
            <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
          </label>

          <button type="submit" className="contact__submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending…' : 'Send message →'}
          </button>

          {/* Always-present live region so success/error is announced to AT. */}
          <p className="contact__status" role="status" aria-live="polite">
            {status === 'success' && (
              <span className="contact__status--success">Thanks — we'll be in touch shortly.</span>
            )}
            {status === 'error' && (
              <span className="contact__status--error">
                Something went wrong. Email us directly at {site.contact.email}.
              </span>
            )}
          </p>
        </form>
      </div>
    </section>
  )
}
