// Pull every series on the Australian Poker Schedule events calendar and
// regenerate data/poker-series-timeline.{json,csv} and the generated sections
// of data/README.md.
//
//   node scripts/scrape-aps-events.mjs                 2026-01-01 .. 2027-12-31
//   node scripts/scrape-aps-events.mjs 2027-01-01 2028-12-31
//
// The site runs The Events Calendar (WordPress), whose REST API lists every
// event with exact ISO dates, organiser and venue, so no HTML paging is
// needed. Records already in the JSON keep the fields the API does not carry
// (poster facts, map coordinates, description copy read off the page); dates,
// organiser and venue are refreshed from the API on every run. Dependency-free
// so it runs on plain Node 20.
//
// src/content/festivals.js is the hand-curated slice the calendar draws; the
// status model (`yarn status`) lists every record here that it lacks.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://australianpokerschedule.com.au'
const API = `${SITE}/wp-json/tribe/events/v1/events`
const JSON_PATH = resolve(ROOT, 'data/poker-series-timeline.json')
const CSV_PATH = resolve(ROOT, 'data/poker-series-timeline.csv')
const README_PATH = resolve(ROOT, 'data/README.md')
const CACHE_PATH = resolve(ROOT, '.firecrawl/aps-events-api.json')

const [from = '2026-01-01', to = '2027-12-31'] = process.argv.slice(2)

// Operators the calendar does not list. Matched against organiser and venue
// names, so the same operator's next stop stays out on every re-scrape.
const EXCLUDE = [/noum[ée]a/i]
const excluded = (e) =>
  EXCLUDE.some((re) => re.test(e.organiser?.name || '') || re.test(e.venue.name || ''))
const today = new Date().toISOString().slice(0, 10)

const unescape = (s = '') =>
  s
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8220;|&ldquo;/g, '“')
    .replace(/&#8221;|&rdquo;/g, '”')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim()

const text = (html = '') =>
  unescape(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )

const links = (html = '') =>
  [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gis)].map((m) => ({
    text: text(m[2]),
    href: m[1],
  }))

/** The tour brand a record files under, from its organiser and title. */
function tourBrand(organiser, title) {
  const o = organiser.toLowerCase()
  if (o.includes('australian poker tour')) return 'Australian Poker Tour (APT)'
  if (o.includes('australian poker league'))
    return /aplpt/i.test(title) ? 'APL Poker Tour (APLPT)' : 'Australian Poker League (APL)'
  if (o.includes('kings poker newcastle')) return 'Kings Poker Newcastle'
  if (o.includes('kings poker')) return 'Kings Poker'
  if (o.includes('crown')) return 'Crown Poker'
  if (o.includes('aurum')) return 'Aurum Poker'
  if (o.includes('playlive')) return 'PlayLive Melbourne'
  if (o.includes('poker palace')) return 'Poker Palace'
  if (o.includes('empire')) return 'Empire Poker'
  if (o.includes('queen b')) return 'Queen B’s Poker'
  if (o.includes('star poker')) return 'The Star Poker'
  if (o.includes('stacked')) return 'Stacked Poker'
  if (o.includes('mixed games')) return 'Mixed Games Academy'
  if (o.includes('wpt league')) return 'WPT League'
  if (o.includes('gambier')) return 'Gambier Poker'
  if (o.includes('check raise')) return 'Check Raise Poker'
  return organiser || 'Unknown'
}

function region(title) {
  const m = title.match(/\(([^)]+)\)\s*$/)
  if (!m) return ''
  const r = m[1].toUpperCase()
  return /PACIFIC/.test(r) ? 'South Pacific' : r
}

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
const longDay = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`
const DAY_MS = 86400000
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS) + 1

function fromApi(e) {
  const title = unescape(e.title)
  const start = e.start_date.slice(0, 10)
  const end = e.end_date.slice(0, 10)
  const org = e.organizer?.[0] || {}
  const v = e.venue || {}
  const venueName = unescape(v.venue || '')
  const city = unescape(v.city || '')
  const state = v.province || v.stateprovince || ''
  const postcode = v.zip || ''
  const country = v.country || ''
  const street = unescape(v.address || '')
  const addressQuery = [street, city, state, postcode, country].filter(Boolean).join(' ')
  const fullAddress = [street, [city, state, postcode].filter(Boolean).join(' '), country]
    .filter(Boolean)
    .join(', ')
  const image = e.image?.url ? { alt: '', src: e.image.url } : null
  const organiser = org.organizer
    ? {
        name: unescape(org.organizer),
        phone: org.phone || '',
        email: org.email || '',
        website: org.website || '',
      }
    : null
  return {
    title,
    url: e.url,
    slug: e.slug,
    tour_brand: tourBrand(organiser?.name || '', title),
    region: region(title),
    start_date: start,
    end_date: end,
    duration_days: days(start, end),
    date_text: `${longDay(start)} - ${longDay(end)}`,
    month_label: `${MONTHS[Number(start.slice(5, 7)) - 1].slice(0, 3)} ${start.slice(0, 4)}`,
    organiser,
    venue: {
      name: venueName,
      street,
      google_maps_search_url: addressQuery
        ? `https://maps.google.com/maps?f=q&source=s_q&hl=en&geocode=&q=${encodeURIComponent(addressQuery).replace(/%20/g, '+')}`
        : '',
      address_query: addressQuery,
      full_address: fullAddress,
      city,
      state,
      postcode,
      country,
      website: v.website || '',
    },
    description: text(e.description || ''),
    description_links: links(e.description || ''),
    details: { start: longDay(start), end: longDay(end), website: e.website || '' },
    hero_image: image,
    images: image ? [image] : [],
    listing_image: image?.src || '',
    ical_url: `webcal://${e.url.replace(/^https?:\/\//, '')}?ical=1`,
    outlook_location: [venueName, street, city, state, postcode, country]
      .filter(Boolean)
      .join(', '),
    source_scraped: today,
    poster_facts: {},
  }
}

/** The API record, keeping what an earlier page scrape read that the API lacks. */
function merge(fresh, old) {
  if (!old) return fresh
  const organiser = fresh.organiser || old.organiser || null
  return {
    ...old,
    ...fresh,
    organiser,
    tour_brand: fresh.organiser ? fresh.tour_brand : tourBrand(organiser?.name || '', fresh.title),
    venue: {
      ...fresh.venue,
      ...pick(old.venue, ['google_place_cid', 'lat', 'lng', 'google_formatted_address']),
    },
    description: fresh.description || old.description || '',
    description_links: fresh.description_links.length
      ? fresh.description_links
      : old.description_links || [],
    details: {
      ...old.details,
      ...fresh.details,
      website: fresh.details.website || old.details?.website || '',
    },
    hero_image: old.hero_image || fresh.hero_image,
    images: old.images?.length ? old.images : fresh.images,
    listing_image: old.listing_image || fresh.listing_image,
    listing_date_text: old.listing_date_text,
    poster_facts: old.poster_facts || {},
    source_scraped: today,
  }
}

const pick = (obj = {}, keys) =>
  Object.fromEntries(keys.filter((k) => obj?.[k] != null).map((k) => [k, obj[k]]))

async function fetchAll() {
  const events = []
  for (let page = 1; ; page++) {
    const url = `${API}?start_date=${from}&end_date=${to}&per_page=50&page=${page}`
    const res = await fetch(url, { headers: { 'User-Agent': 'australian-poker-calendar/1.0' } })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
    const body = await res.json()
    events.push(...body.events)
    console.log(`[scrape-aps] page ${page}/${body.total_pages}: ${body.events.length} events`)
    if (page >= Number(body.total_pages || 1)) break
  }
  return events
}

function organisers(events) {
  const byBrand = new Map()
  for (const e of events) {
    const brand = e.tour_brand
    const row = byBrand.get(brand) || {
      brand,
      organiser_names: [],
      phone: [],
      email: [],
      websites: [],
      series: [],
    }
    const add = (list, v) => v && !list.includes(v) && list.push(v)
    add(row.organiser_names, e.organiser?.name)
    add(row.phone, e.organiser?.phone)
    add(row.email, e.organiser?.email)
    add(row.websites, e.organiser?.website)
    add(row.websites, e.details?.website)
    row.series.push({
      title: e.title,
      dates: `${e.start_date} to ${e.end_date}`,
      venue: e.venue.name,
      city: e.venue.city,
      state: e.venue.state,
    })
    byBrand.set(brand, row)
  }
  return [...byBrand.values()].sort((a, b) => b.series.length - a.series.length)
}

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csv(events) {
  const cols = [
    'title',
    'tour_brand',
    'region',
    'start_date',
    'end_date',
    'duration_days',
    'organiser',
    'organiser_phone',
    'organiser_email',
    'organiser_website',
    'venue',
    'street',
    'city',
    'state',
    'postcode',
    'country',
    'event_website',
    'url',
  ]
  const rows = events.map((e) => [
    e.title,
    e.tour_brand,
    e.region,
    e.start_date,
    e.end_date,
    e.duration_days,
    e.organiser?.name || '',
    e.organiser?.phone || '',
    e.organiser?.email || '',
    e.organiser?.website || '',
    e.venue.name,
    e.venue.street,
    e.venue.city,
    e.venue.state,
    e.venue.postcode,
    e.venue.country,
    e.details?.website || '',
    e.url,
  ])
  return [cols, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
}

const label = (key) => key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

function readme(events, orgs) {
  const out = []
  out.push('## Timeline at a glance', '')
  out.push(
    '| Start | End | Days | Series | Organiser | Venue | Location | Guarantee / notes |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  )
  for (const e of events) {
    const notes = [e.poster_facts?.guarantee, e.poster_facts?.main_event].filter(Boolean).join('; ')
    out.push(
      `| ${e.start_date} | ${e.end_date} | ${e.duration_days} | [${e.title}](${e.url}) | ${e.organiser?.name || ''} | ${e.venue.name} | ${[e.venue.city, e.venue.state, e.venue.postcode].filter(Boolean).join(', ')} | ${notes} |`,
    )
  }
  out.push('', '## Organisers / companies', '')
  for (const o of orgs) {
    out.push(`### ${o.brand}`, '')
    out.push(`- Listed as: ${o.organiser_names.join(', ') || '—'}`)
    if (o.phone.length) out.push(`- Phone: ${o.phone.join(', ')}`)
    if (o.email.length) out.push(`- Email: ${o.email.join(', ')}`)
    if (o.websites.length) out.push(`- Websites: ${o.websites.join(', ')}`)
    out.push(`- Series on the calendar (${o.series.length}):`)
    for (const s of o.series)
      out.push(
        `  - ${s.dates} — ${s.title} — ${[s.venue, [s.city, s.state].filter(Boolean).join(' ')].filter(Boolean).join(', ')}`,
      )
    out.push('')
  }
  out.push('## Event details', '')
  for (const e of events) {
    out.push(`### ${e.title}`, '')
    out.push(`- URL: ${e.url}`)
    out.push(
      `- Dates: ${e.start_date} to ${e.end_date} (${e.duration_days} days) — listed as “${e.date_text}”`,
    )
    out.push(`- Tour / brand: ${e.tour_brand}`)
    if (e.organiser)
      out.push(
        `- Organiser: ${[e.organiser.name, e.organiser.phone, e.organiser.email, e.organiser.website].filter(Boolean).join(' · ')}`,
      )
    if (e.details?.website) out.push(`- Event website: ${e.details.website}`)
    out.push(`- Venue: ${[e.venue.name, e.venue.full_address].filter(Boolean).join(', ')}`)
    if (e.venue.lat != null)
      out.push(
        `- Coordinates: ${e.venue.lat}, ${e.venue.lng} · Google Maps: ${e.venue.google_maps_search_url}`,
      )
    for (const [k, v] of Object.entries(e.poster_facts || {}))
      out.push(`- ${label(k)}: ${Array.isArray(v) ? JSON.stringify(v) : v}`)
    if (e.description)
      out.push(`- Description: ${e.description.replace(/\n+/g, ' ').slice(0, 600)}`)
    if (e.hero_image?.src) out.push(`- Hero image: ${e.hero_image.src}`)
    const extra = (e.images || []).map((i) => i.src).filter((s) => s !== e.hero_image?.src)
    if (extra.length) out.push(`- Additional images: ${extra.join(', ')}`)
    out.push(`- iCal: ${e.ical_url}`, '')
  }
  return out.join('\n')
}

const raw = await fetchAll()
mkdirSync(dirname(CACHE_PATH), { recursive: true })
writeFileSync(CACHE_PATH, JSON.stringify(raw, null, 1))

let existing = { events: [], notes: [] }
try {
  existing = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
} catch {
  /* first run */
}
const oldByUrl = new Map(existing.events.map((e) => [e.url, e]))

const events = raw
  .map((e) => merge(fromApi(e), oldByUrl.get(e.url)))
  .filter((e) => !excluded(e))
  .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.title.localeCompare(b.title))
const orgs = organisers(events)

const notes = [
  `Regenerated ${today} by scripts/scrape-aps-events.mjs from the site's Events Calendar REST API (${API}), every event from ${from} to ${to}.`,
  'Dates are exact ISO dates from the API. duration_days is inclusive.',
  'Records first scraped from the Series Timeline pages on 2026-10-02 keep their poster_facts, venue coordinates and description copy; the API does not carry those.',
  'tour_brand is derived from the organiser name (and the title, for APL vs APLPT).',
]

writeFileSync(
  JSON_PATH,
  JSON.stringify(
    {
      source: `${SITE}/events/`,
      site: 'Australian Poker Schedule (AustralianPokerSchedule.com.au)',
      scraped_at: today,
      range: { from, to },
      event_count: events.length,
      events,
      organisers: orgs,
      notes,
    },
    null,
    1,
  ) + '\n',
)
writeFileSync(CSV_PATH, csv(events))

const md = readFileSync(README_PATH, 'utf8')
const head = md.slice(0, md.indexOf('## Timeline at a glance'))
const tailAt = md.indexOf('## Site navigation captured')
const tail = tailAt === -1 ? '' : md.slice(tailAt)
const lastEnd = events
  .map((e) => e.end_date)
  .sort()
  .at(-1)
const span = `${events.length} series listed, running ${events[0].start_date} to ${lastEnd}.`
const newHead = head.replace(/\d+ series listed, running \S+ to \S+\./, span)
writeFileSync(README_PATH, `${newHead}${readme(events, orgs)}\n${tail}`)

console.log(
  `[scrape-aps] ${events.length} events (${events.filter((e) => !oldByUrl.has(e.url)).length} new), ${orgs.length} organisers → data/`,
)
