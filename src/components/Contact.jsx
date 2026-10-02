import { site } from '../config/site.config.js'
import { contact } from '../content/contact.js'
import { useFormspree } from '../lib/useFormspree.js'
import './Contact.css'

export default function Contact() {
  const { status, handleSubmit } = useFormspree('contact-form')

  return (
    <section className="contact section section--dark" id="contact">
      <div className="container contact__inner">
        <div className="contact__head">
          <span className="section-eyebrow">{contact.eyebrow}</span>
          <h2 className="section-label">{contact.heading}</h2>
          <p className="section-sub">{contact.sub}</p>
        </div>

        <form className="contact__form" onSubmit={handleSubmit}>
          <div className="contact__row">
            <label className="contact__field">
              <span>{contact.fields.name}</span>
              <input type="text" name="name" autoComplete="name" required />
            </label>
            <label className="contact__field">
              <span>{contact.fields.email}</span>
              <input type="email" name="email" autoComplete="email" required />
            </label>
          </div>
          <label className="contact__field">
            <span>{contact.fields.message}</span>
            <textarea name="message" rows="5" required />
          </label>

          {/* Honeypot — visually hidden, labelled for AT, ignored by Formspree
              when filled. Bots that fill every field get caught here. */}
          <label className="contact__honeypot">
            Leave this field empty
            <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
          </label>

          <button type="submit" className="contact__submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? contact.submitting : contact.submit}
          </button>

          {/* Always-present live region so success/error is announced to AT. */}
          <p className="contact__status" role="status" aria-live="polite">
            {status === 'success' && (
              <span className="contact__status--success">{contact.success}</span>
            )}
            {status === 'error' && (
              <span className="contact__status--error">
                {contact.errorPrefix} {site.contact.email}.
              </span>
            )}
          </p>
        </form>
      </div>
    </section>
  )
}
