// Cookie banner copy. Rendered by src/components/ConsentBanner.jsx and the
// "Cookie settings" control in the footer. Only shown when
// `integrations.consent` is on in site.config.js.
//
// Keep `text` honest about what the cookies actually do: the only cookies this
// site sets are the visitor's own consent choice and, after they accept,
// Google Analytics' `_ga` cookies. The full list lives in the Cookies section
// of src/content/legal.js — keep the two in step.

export const consent = {
  text: 'We use cookies to improve your experience, remember your preferences and understand how visitors use the site. No tracking starts until you choose.',
  accept: 'Accept cookies',
  decline: 'Decline',
  privacyLabel: 'Privacy policy',
  // Footer control that reopens the banner so a choice can be changed later.
  settingsLabel: 'Cookie settings',
}
