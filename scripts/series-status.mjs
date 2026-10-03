// Series status: where every series on the calendar stands and what the site
// still needs for it. The model behind the admin dashboard (admin/) and the
// `yarn status` terminal summary.
//
//   yarn status                      print the open jobs
//   yarn status --json               print the full model as JSON
//   yarn status --today=2026-10-20   pretend it is another day
//
// Reads the same content files the site renders from (festivals, event pages,
// the home events banner, the calendar page) plus the series records in data/, and
// derives per series: phase (done / live / upcoming), whether a schedule is up,
// whether the data file and key art exist, where it is placed on the home and
// calendar pages, and whether the row still matches its record. From those it
// lists the jobs: rotate a finished hero, chase an operator for a schedule,
// refresh Up Next, and so on. Nothing here is hand-maintained; change the
// content and re-run.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { festivals } from '../src/content/festivals.js'
import { eventPages } from '../src/content/eventPages.js'
import { heroEvent, sideEvents, ticker } from '../src/content/events.js'
import { calendarPage } from '../src/content/calendarPage.js'
import { tourBrands } from '../src/content/tourBrands.js'
import { tourPages } from '../src/content/tourPages.js'
import { pokerRooms } from '../src/content/pokerRooms.js'
import { formatRange, toStamp } from '../src/lib/calendar.js'

// Vitest runs this under jsdom, where import.meta.url is not a file: URL; the
// test runner's cwd is the project root, so fall back to it.
const ROOT = (() => {
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), '..')
  } catch {
    return process.cwd()
  }
})()
const DAY_MS = 86400000

// Within this many days of the start, a missing schedule is a job to chase.
export const CHASE_WINDOW = 30
// Within this many days of the start, a series belongs in the Up Next cards.
export const UP_NEXT_WINDOW = 45
// Beyond this many days out, a missing schedule is normal and not listed as a job.
export const WATCH_WINDOW = 60

export const LEVELS = ['now', 'soon', 'later']

const daysBetween = (a, b) => Math.round((toStamp(b) - toStamp(a)) / DAY_MS)

/** Case-insensitive "every word of `name` appears in `text`". */
function mentions(text, name) {
  const haystack = (text || '').toLowerCase()
  return name
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}

const publicFile = (src) => Boolean(src) && existsSync(resolve(ROOT, 'public', src.slice(1)))

/** Today in Melbourne, as YYYY-MM-DD. */
export function melbourneToday(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
}

/**
 * The whole model for one day. `today` is YYYY-MM-DD.
 */
export function buildStatus(today = melbourneToday()) {
  const todayStamp = toStamp(today)
  const timeline = JSON.parse(
    readFileSync(resolve(ROOT, 'data/poker-series-timeline.json'), 'utf8'),
  )
  const scheduleFiles = readdirSync(resolve(ROOT, 'data')).filter((f) =>
    f.endsWith('-schedule.json'),
  )
  // Poster pages, keyed by path, each with the content file it comes from.
  const posters = new Map(
    Object.entries(eventPages).map(([key, event]) => [
      event.path,
      { event, file: `src/content/event${key[0].toUpperCase()}${key.slice(1)}.js` },
    ]),
  )

  /** The data/*-schedule.json that belongs to a series, found by its slug. */
  function scheduleFileFor(slug, tour, year) {
    const bare = slug.replace(new RegExp(`^${tour.toLowerCase()}-`), '')
    const stems = new Set([slug, bare, `${slug}-${year}`, `${bare}-${year}`])
    return scheduleFiles.find((file) => stems.has(file.replace(/-schedule\.json$/, '')))
  }

  function phaseOf(festival) {
    const start = toStamp(festival.start)
    const end = toStamp(festival.end)
    const length = daysBetween(festival.start, festival.end) + 1
    if (todayStamp > end) {
      const ago = daysBetween(festival.end, today)
      return { key: 'done', label: ago === 1 ? 'Finished yesterday' : `Finished ${ago}d ago`, ago }
    }
    if (todayStamp >= start) {
      const day = daysBetween(festival.start, today) + 1
      return { key: 'live', label: `Live · day ${day} of ${length}`, day, length }
    }
    const until = daysBetween(today, festival.start)
    return {
      key: 'upcoming',
      label: until === 1 ? 'Starts tomorrow' : `Starts in ${until}d`,
      until,
    }
  }

  function describe(festival) {
    const slug = festival.href.split('/').pop()
    const year = festival.start.slice(0, 4)
    const phase = phaseOf(festival)
    const poster = posters.get(festival.href)
    const schedule = poster?.event.schedule ?? null
    const scheduleRows = schedule?.length ?? 0
    const featuredRows = schedule?.filter((row) => row.featured).length ?? 0
    const dataFile = scheduleFileFor(slug, festival.tour, year) || ''

    const side = sideEvents.find((item) => item.href === festival.href) || null
    const isHero = heroEvent.href === festival.href
    const tickerRows = ticker.filter((row) => row.href === festival.href).length
    const upNext = calendarPage.upNext.items.find((item) => item.href === festival.href) || null
    const banner = calendarPage.banner
    const onBanner = Boolean(banner.src && mentions(banner.alt, festival.name))

    const imageSrc =
      poster?.event.image?.src || (isHero ? heroEvent.imageSrc : side?.imageSrc) || ''
    const imageExists = publicFile(imageSrc)

    const scrapedFull = timeline.events.find((event) => event.href === festival.href)
    const scraped = scrapedFull
      ? {
          title: scrapedFull.title,
          href: scrapedFull.href,
          start: scrapedFull.start_date,
          end: scrapedFull.end_date,
          region: scrapedFull.region,
          venue: scrapedFull.venue?.name || '',
          address: scrapedFull.venue?.full_address || '',
          mapUrl: scrapedFull.venue?.google_maps_search_url || '',
          posterFacts: scrapedFull.poster_facts || null,
          description: scrapedFull.description || '',
        }
      : null
    const scrapeDatesMatch = scraped
      ? scraped.start === festival.start && scraped.end === festival.end
      : null
    // "Australian Poker League (inferred from …)" reads as the name alone.
    const organiser = scrapedFull?.organiser
      ? { ...scrapedFull.organiser, name: scrapedFull.organiser.name.replace(/\s*\(.*\)$/, '') }
      : null
    const tourOk =
      Boolean(tourBrands[festival.tour]) && calendarPage.tours.some((t) => t.code === festival.tour)

    const jobs = []
    const job = (level, text) => jobs.push({ level, text })
    const contact = organiser
      ? [organiser.name, organiser.email, organiser.phone, !organiser.email && festival.website]
          .filter(Boolean)
          .join(', ')
      : `operator site ${festival.website}`

    if (phase.key === 'done') {
      if (isHero) job('now', 'Finished but still the home hero. Rotate the hero to a live series.')
      if (side) job('now', 'Finished but still a home side card. Replace it.')
      if (tickerRows) job('now', `Finished but the ticker still lists ${tickerRows} of its events.`)
      if (upNext) job('now', 'Finished but still in Up Next on the calendar page.')
      if (onBanner) job('now', 'Finished but still the calendar promo banner. Replace the artwork.')
    }
    if (phase.key === 'live') {
      if (!isHero && !side)
        job('soon', 'Live but not on the home events banner (hero or side card).')
      if (upNext) job('soon', 'Already running; drop it from Up Next.')
    }
    if (phase.key !== 'done') {
      if (!poster) {
        if (phase.key === 'live') {
          job('now', `No schedule on the site and it is running. Chase: ${contact}.`)
        } else if (phase.until <= 14) {
          job('now', `Starts in ${phase.until}d with no schedule. Chase: ${contact}.`)
        } else if (phase.until <= CHASE_WINDOW) {
          job('soon', `No schedule yet. Ask for it: ${contact}.`)
        } else if (phase.until <= WATCH_WINDOW) {
          job('later', `Schedule not published. Check ${festival.website} nearer the date.`)
        }
      }
      if (poster && !dataFile)
        job('soon', 'Schedule rows have no data/*-schedule.json copy. Add it.')
      if (poster && !imageSrc) job('soon', 'Poster page has no key art. Add an image.')
      if (imageSrc && !imageExists) job('now', `Key art is missing from public: ${imageSrc}.`)
      if (phase.key === 'upcoming' && phase.until <= UP_NEXT_WINDOW && !upNext) {
        job('later', 'Starts soon and is not in Up Next on the calendar page.')
      }
    }
    if (scraped && !scrapeDatesMatch) {
      job(
        'now',
        `Dates differ from the series record (${scraped.start} to ${scraped.end}). Resolve.`,
      )
    }
    if (!tourOk) job('now', `Tour code ${festival.tour} has no brand profile or tour tile.`)

    const { event } = poster || {}
    return {
      ...festival,
      facebook: calendarPage.tours.find((t) => t.code === festival.tour)?.facebook || '',
      slug,
      phase,
      dates: formatRange(festival.start, festival.end),
      days: daysBetween(festival.start, festival.end) + 1,
      poster: Boolean(poster),
      contentFile: poster?.file || 'src/content/festivals.js',
      posterMeta: event
        ? {
            title: event.title,
            presentedBy: event.presentedBy,
            venue: event.venue,
            venueDetail: event.venueDetail,
            city: event.city,
            website: event.website,
            buyInSub: event.buyInSub || '',
            seo: event.seo,
            stats: event.stats,
            notes: event.notes,
            sponsors: event.sponsors,
          }
        : null,
      schedule,
      scheduleRows,
      featuredRows,
      dataFile,
      imageSrc,
      imageExists,
      isHero,
      side: side ? { dates: side.dates } : null,
      home: isHero ? 'Hero' : side ? 'Side card' : '',
      tickerRows,
      upNext: upNext ? { dates: upNext.dates, prize: upNext.prize || '' } : null,
      onBanner,
      scraped,
      scrapeDatesMatch,
      organiser,
      jobs,
    }
  }

  const series = festivals.map(describe).sort((a, b) => toStamp(a.start) - toStamp(b.start))
  const bySlug = Object.fromEntries(series.map((s) => [s.href, s]))

  // Series the records list that the calendar does not.
  const onCalendar = new Set(festivals.map((f) => f.href))
  const unlisted = timeline.events
    .filter((event) => !onCalendar.has(event.href))
    .map((event) => ({
      title: event.title,
      href: event.href,
      start: event.start_date,
      end: event.end_date,
      organiser: event.organiser?.name || '',
      venue: event.venue?.name || '',
    }))

  // The site's fixed slots and what fills them today.
  const banner = calendarPage.banner
  const bannerFileOk = banner.src ? publicFile(banner.src) : true
  const bannerMobileOk = banner.mobileSrc ? publicFile(banner.mobileSrc) : true
  const slotState = (s) => {
    if (!s) return { tone: 'neutral', label: 'not a series' }
    if (s.phase.key === 'done') return { tone: 'critical', label: 'stale: finished' }
    return { tone: s.phase.key === 'live' ? 'good' : 'neutral', label: s.phase.label }
  }
  const slots = [
    { slot: 'Home hero', holder: heroEvent.name, href: heroEvent.href },
    ...sideEvents.map((s, i) => ({
      slot: `Home side card ${i + 1}`,
      holder: `${s.name} (${s.status})`,
      href: s.href,
    })),
    {
      slot: 'Home ticker',
      holder: `${ticker.length} rows · ${bySlug[ticker[0]?.href]?.name || '?'}`,
      href: ticker[0]?.href,
    },
    ...calendarPage.upNext.items.map((u, i) => ({
      slot: `Up Next ${i + 1}`,
      holder: u.name,
      href: u.href,
    })),
    {
      slot: 'Calendar promo banner',
      holder: banner.src ? banner.alt : 'striped placeholder',
      href: series.find((s) => s.onBanner)?.href,
    },
  ].map((entry) => {
    const s = bySlug[entry.href]
    return { ...entry, slug: s?.slug || '', state: slotState(s) }
  })

  const globalJobs = []
  if (!bannerFileOk || !bannerMobileOk) {
    globalJobs.push({
      level: 'now',
      text: `Calendar promo banner file is missing: ${!bannerFileOk ? banner.src : banner.mobileSrc}.`,
    })
  }
  if (!banner.src) {
    globalJobs.push({ level: 'soon', text: 'Calendar promo banner is the striped placeholder.' })
  }
  for (const event of unlisted) {
    globalJobs.push({
      level: 'later',
      text: `In the series records but not on the calendar: ${event.title} (${event.start} to ${event.end}).`,
    })
  }

  const jobs = [
    ...series.flatMap((s) => s.jobs.map((j) => ({ ...j, slug: s.slug, series: s.name }))),
    ...globalJobs.map((j) => ({ ...j, slug: '', series: '' })),
  ].sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))

  // One profile per poker room: the operator behind a tour code, with its
  // identity (content/tourBrands.js, calendarPage.tours), the strip tile
  // (content/pokerRooms.js), the rooms it deals at (content/whereToPlay.js, via
  // the tour page) and the organiser blocks its series are filed under.
  const organisers = timeline.organisers || []
  const uniq = (list) => [...new Set(list.filter(Boolean))]
  const rooms = tourPages.map((page) => {
    const mine = series.filter((s) => s.tour === page.code)
    const brands = new Set(
      mine.map((s) => timeline.events.find((e) => e.href === s.href)?.tour_brand).filter(Boolean),
    )
    const records = organisers.filter((o) => brands.has(o.brand))
    const tile = pokerRooms.rooms.find((r) => r.code === page.code) || null
    const brand = tourBrands[page.code] || null
    const mark = (src) => ({ src: src || '', ok: publicFile(src) })
    const slugs = (phase) => mine.filter((s) => s.phase.key === phase).map((s) => s.slug)
    const roomJobs = jobs.filter((j) => j.slug && mine.some((s) => s.slug === j.slug))
    const next =
      mine.find((s) => s.phase.key === 'live') || mine.find((s) => s.phase.key === 'upcoming')
    return {
      code: page.code,
      label: page.label,
      name: page.name,
      fullName: tile?.name || page.name,
      slug: page.slug,
      // The organiser brands this room's series are filed under, so the
      // dashboard's Contacts page can put the room's logo on each organiser.
      brands: [...brands],
      path: page.path,
      website: page.website,
      brand,
      logo: {
        wordmark: mark(page.logoSrc),
        icon: mark(page.iconSrc),
        mono: mark(page.monoSrc),
        tile: mark(tile?.logoSrc),
        tone: tile?.tone || brand?.logo || 'light',
      },
      contact: {
        organisers: uniq(records.flatMap((o) => o.organiser_names || [])).map((n) =>
          n.replace(/\s*\(.*\)$/, ''),
        ),
        emails: uniq(records.flatMap((o) => o.email || [])),
        phones: uniq(records.flatMap((o) => o.phone || [])),
        websites: uniq([page.website, ...records.flatMap((o) => o.websites || [])]),
      },
      venues: page.venues.map((v) => ({
        id: v.id,
        name: v.name,
        address: v.address,
        state: v.state,
        website: v.website,
        shared: v.tours.filter((code) => code !== page.code),
      })),
      cities: page.cities.map((c) => c.name),
      live: slugs('live'),
      upcoming: slugs('upcoming'),
      done: slugs('done'),
      next: next?.slug || '',
      jobs: roomJobs,
      counts: {
        series: mine.length,
        withSchedule: mine.filter((s) => s.poster).length,
        venues: page.venues.length,
        jobs: roomJobs.length,
      },
    }
  })

  const counts = {
    series: series.length,
    live: series.filter((s) => s.phase.key === 'live').length,
    upcoming: series.filter((s) => s.phase.key === 'upcoming').length,
    soon: series.filter((s) => s.phase.key === 'upcoming' && s.phase.until <= CHASE_WINDOW).length,
    done: series.filter((s) => s.phase.key === 'done').length,
    withSchedule: series.filter((s) => s.poster).length,
    jobs: Object.fromEntries(LEVELS.map((l) => [l, jobs.filter((j) => j.level === l).length])),
  }

  return {
    today,
    generatedAt: new Date().toISOString(),
    scrapedAt: timeline.scraped_at || '',
    windows: { chase: CHASE_WINDOW, watch: WATCH_WINDOW, upNext: UP_NEXT_WINDOW },
    counts,
    series,
    jobs,
    slots,
    unlisted,
    home: {
      hero: { ...heroEvent, imageExists: publicFile(heroEvent.imageSrc) },
      sideEvents: sideEvents.map((s) => ({ ...s, imageExists: publicFile(s.imageSrc) })),
      ticker,
    },
    calendar: {
      upNext: calendarPage.upNext.items,
      banner: { ...banner, fileOk: bannerFileOk, mobileFileOk: bannerMobileOk },
      tours: calendarPage.tours.map((t) => ({
        ...t,
        brand: tourBrands[t.code] || null,
        logoOk: publicFile(t.logoSrc),
        iconOk: publicFile(t.iconSrc),
        monoOk: publicFile(t.monoSrc),
        series: series.filter((s) => s.tour === t.code).length,
      })),
    },
    rooms,
    brands: tourBrands,
    organisers,
    dataFiles: scheduleFiles,
  }
}

// ---------------------------------------------------------------------------
// CLI

const isMain = (() => {
  try {
    return resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)
  } catch {
    return false
  }
})()

if (isMain) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value = true] = arg.replace(/^--/, '').split('=')
      return [key, value]
    }),
  )
  const status = buildStatus(typeof args.today === 'string' ? args.today : melbourneToday())

  if (args.json) {
    process.stdout.write(JSON.stringify(status))
  } else {
    const { counts } = status
    console.log(
      `Series status as of ${status.today}: ${counts.series} series, ${counts.live} live, ${counts.upcoming} upcoming, ${counts.done} finished; ${counts.withSchedule} with a schedule.`,
    )
    for (const level of LEVELS) {
      const jobs = status.jobs.filter((j) => j.level === level)
      if (!jobs.length) continue
      console.log(`\n${level.toUpperCase()} (${jobs.length})`)
      for (const j of jobs) console.log(`  - ${j.series ? `${j.series}: ` : ''}${j.text}`)
    }
    console.log('\nDashboard: yarn admin')
  }
}
