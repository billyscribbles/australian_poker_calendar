// Date and duration labels for published content. Hand-rolled on purpose:
// the server renders these and the browser re-renders them during hydration,
// and toLocaleDateString can disagree between the two ("Oct" vs "Oct."),
// which React treats as a mismatch and answers by throwing the markup away.

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function parts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return null
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return { year: m[1], month: MONTHS[month - 1], day: Number(m[3]) }
}

/** '2026-10-02' → '2 Oct' */
export function formatShortDate(iso) {
  const p = parts(iso)
  return p ? `${p.day} ${p.month.slice(0, 3)}` : ''
}

/** '2026-10-02' → '2 October 2026' */
export function formatLongDate(iso) {
  const p = parts(iso)
  return p ? `${p.day} ${p.month} ${p.year}` : ''
}

/** 95 → '1:35' */
export function formatDuration(seconds) {
  const total = Math.round(Number(seconds))
  if (!Number.isFinite(total) || total < 0) return ''
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
