import { site } from '../config/site.config.js'
import { venueForm } from '../content/contact.js'
import { useEnquiry } from '../lib/useEnquiry.js'
import UploadField from './UploadField.jsx'
import './VenueForm.css'

// The poker-room listing form, rendered by the page at venueForm.path. Same
// Formspree inbox as the contact page; the hidden topic and subject fields
// mark it as a listing request so it is easy to triage.
export default function VenueForm() {
  const { status, handleSubmit } = useEnquiry('venue', 'venue-form')

  return (
    <form className="venue-form" onSubmit={handleSubmit}>
      <input type="hidden" name="topic" value={venueForm.topic} />
      <input type="hidden" name="_subject" value={venueForm.subject} />

      <div className="venue-form__row">
        <label className="venue-form__field">
          <span>{venueForm.fields.venue}</span>
          <input type="text" name="venue" autoComplete="organization" required />
        </label>
        <label className="venue-form__field">
          <span>{venueForm.fields.email}</span>
          <input type="email" name="email" autoComplete="email" required />
        </label>
      </div>
      <label className="venue-form__field">
        <span>{venueForm.fields.message}</span>
        <textarea name="message" rows="5" required />
      </label>

      <fieldset className="venue-form__uploads">
        <legend className="venue-form__legend">{venueForm.uploads.heading}</legend>
        <p className="venue-form__uploads-sub">{venueForm.uploads.sub}</p>
        <div className="venue-form__uploads-grid">
          {venueForm.uploads.sections.map((section) => (
            <UploadField key={section.name} section={section} />
          ))}
        </div>
      </fieldset>

      {/* Honeypot — visually hidden, labelled for AT, ignored by Formspree
          when filled. Bots that fill every field get caught here. */}
      <label className="venue-form__honeypot">
        Leave this field empty
        <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="venue-form__actions">
        <button type="submit" className="venue-form__submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? venueForm.submitting : venueForm.submit}
        </button>
        {/* Always-present live region so success/error is announced to AT. */}
        <p className="venue-form__status" role="status" aria-live="polite">
          {status === 'success' && (
            <span className="venue-form__status--success">{venueForm.success}</span>
          )}
          {status === 'error' && (
            <span className="venue-form__status--error">
              {venueForm.errorPrefix} {site.contact.email}.
            </span>
          )}
        </p>
      </div>
    </form>
  )
}
