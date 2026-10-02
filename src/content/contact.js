// Contact section copy, shared by the /contact page and the foot of /about.

export const contact = {
  seo: {
    title: 'Contact: Submit a Poker Schedule, Result or Tip',
    description:
      'Contact the Australian Poker Calendar. Operators: send us your poker tournament schedule to list. Players and venues: a result, a room or a story we should cover.',
  },
  eyebrow: 'Get in touch',
  heading: 'Send us a schedule, a result or a tip.',
  sub: 'Operators, venues and players: we read everything and reply within two business days.',
  fields: { name: 'Name', email: 'Email', message: 'Message' },
  submit: 'Send message →',
  submitting: 'Sending…',
  success: 'Thanks — we have it and will be in touch.',
  errorPrefix: 'Something went wrong. Email us directly at',
}

// The poker-room listing page and the short call-to-action that points at it
// from the footer of every page. The hidden `topic` field and subject line
// tell the inbox which form the message came from.
export const venueForm = {
  path: '/list-your-venue',
  seo: {
    title: 'List Your Poker Room, Series or Regular Game',
    description:
      'Run a poker room or tournament series in Australia or the Asia-Pacific? Tell the Australian Poker Calendar about your venue, series or regular games and we will feature them on the calendar.',
  },
  eyebrow: 'Poker rooms & operators',
  heading: 'Run a poker room? Get your games listed.',
  sub: 'Tell us about your venue, series or regular games and we will feature them on the calendar.',
  // The footer band: a heading, one line and a button to the page.
  cta: {
    heading: 'Run a poker room? Get your games listed.',
    sub: 'Venues, series and regular games, featured on the calendar for free.',
    button: 'Request a listing →',
  },
  topic: 'venue-listing',
  subject: 'Poker room listing request',
  fields: {
    venue: 'Venue or series',
    email: 'Email',
    message: 'What would you like featured?',
  },
  // The upload sections under the fields. Each `name` is the field the file
  // lands in on the Formspree submission. Files are checked in the browser
  // before they leave it — see src/lib/uploadCheck.js.
  uploads: {
    heading: 'Artwork and files',
    sub: 'Optional. PDF or image, up to 10 MB each. Click a box or drop a file on it.',
    sections: [
      { name: 'poster', label: 'Poster', hint: 'The series or event key art' },
      { name: 'schedule', label: 'Schedule', hint: 'The tournament schedule, PDF or image' },
      { name: 'banner', label: 'Banner', hint: 'Wide artwork for the calendar banner' },
      { name: 'logos', label: 'Logos', hint: 'Venue and operator logos', multiple: true },
    ],
    accept: 'application/pdf,image/*',
    prompt: 'Drop a file here or click to choose',
    promptMultiple: 'Drop files here or click to choose',
    remove: 'Remove',
    errors: {
      type: 'is not a PDF or an image, so it was not added.',
      size: 'is over 10 MB, so it was not added.',
      unsafe: 'contains active content we cannot accept, so it was not added.',
    },
  },
  submit: 'Request a listing →',
  submitting: 'Sending…',
  success: 'Thanks — we have it and will be in touch about your listing.',
  errorPrefix: 'Something went wrong. Email us directly at',
}
