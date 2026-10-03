/* global publishView, bindPublish, loadPublish, leaveEditor, mayLeaveEditor, editorOpen, draftBadge */
// The dashboard. Fetches api/status, api/enquiries, api/traffic and (through
// publish.js, loaded before this file) api/stories and api/shorts, rendered
// by hash route:
//
//   #overview  #todo  #calendar  #series  #series/<slug>  #rooms  #rooms/<code>
//   #stories  #stories/<id>  #shorts  #shorts/<id>
//   #enquiries  #traffic  #home  #calendar-page  #data  #contacts
//
// Plain DOM and template strings; nothing to build. Each view is one function
// that returns HTML; bind*() wires up the controls it drew.

// The calendar scrolls itself to the current month once the data is in; a
// reload must not then drag the page back to wherever it was.
history.scrollRestoration = 'manual'

const state = {
  data: null, // api/status
  inbox: [], // api/enquiries
  traffic: null, // api/traffic
  error: '',
  filters: { q: '', tour: '', phase: 'open', needs: '' }, // Series; finished hidden by default
  rooms: { q: '', show: '' }, // Poker rooms
  months: { tour: '', finished: false }, // Calendar
  enquiries: { q: '', show: 'open', form: '' }, // Enquiries
  trafficDays: 30, // Traffic
}

const NAV = [
  {
    items: [
      ['overview', 'Overview'],
      ['todo', 'To do'],
      ['calendar', 'Calendar'],
      ['series', 'Series'],
      ['rooms', 'Poker rooms'],
    ],
  },
  {
    title: 'Publish',
    items: [
      ['stories', 'Stories'],
      ['shorts', 'Shorts'],
    ],
  },
  {
    title: 'Inbox',
    items: [
      ['enquiries', 'Enquiries'],
      ['traffic', 'Traffic'],
    ],
  },
  {
    title: 'Website',
    items: [
      ['home', 'Home page'],
      ['calendar-page', 'Calendar page'],
      ['data', 'Schedules & data'],
      ['contacts', 'Contacts'],
    ],
  },
]

const LEVEL = {
  now: { tone: 'critical', label: 'Do now' },
  soon: { tone: 'warning', label: 'This week' },
  later: { tone: 'neutral', label: 'Later' },
}
const PHASE_TONE = { live: 'good', upcoming: 'neutral', done: 'muted' }
const DAY = 86400000
const CHART = { views: '#b98230', visitors: '#4a86d8' } // validated on the card surface

// ---------------------------------------------------------------------------
// Helpers

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
const pill = (tone, text) => `<span class="pill pill--${tone}">${esc(text)}</span>`
const levelPill = (level) => pill(LEVEL[level].tone, level)
const phasePill = (s) => pill(PHASE_TONE[s.phase.key], s.phase.label)
const tour = (code) => {
  const brand = state.data.brands[code] || {}
  return `<a class="tour" href="#rooms/${esc(code)}" style="--tour:${esc(brand.primary || '')}" title="${esc(roomOf(code)?.name || code)}">${esc(code)}</a>`
}
const roomOf = (code) => state.data.rooms.find((r) => r.code === code)
// Backing for a room's wordmark. iconBg is chosen for the circle icon, and a
// white one (PlayLive, Kings, NPL) swallows a light wordmark, so the brand
// backing is used only when it suits the wordmark's tone.
const isLightHex = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return false
  const n = parseInt(m[1], 16)
  return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 140
}
const markBg = (r) => {
  const wantLight = r.logo.tone === 'dark'
  const bg = r.brand?.iconBg
  return bg && isLightHex(bg) === wantLight ? bg : wantLight ? '#ffffff' : '#0a0a0a'
}
const check = (ok, text, badText = text) =>
  ok ? `<span class="ok">✓ ${esc(text)}</span>` : `<span class="no">✗ ${esc(badText)}</span>`
const seriesLink = (s) => `<a href="#series/${esc(s.slug)}">${esc(s.name)}</a>`
const bySlug = (slug) => state.data.series.find((s) => s.slug === slug)
const siteUrl = (href) => `${state.data.site}${href}`
const external = (href, text) =>
  `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`
const host = (url) => url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
const stamp = (iso) => Date.parse(`${iso}T00:00:00Z`)
const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-AU', { timeZone: 'UTC', ...opts })
const fmtWhen = (isoTime) => {
  const d = new Date(isoTime)
  return d.toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
const ago = (isoTime) => {
  const mins = Math.round((Date.now() - Date.parse(isoTime)) / 60000)
  if (mins < 60) return `${Math.max(mins, 0)} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
const n = (v) => Number(v || 0).toLocaleString('en-AU')
const opt = (value, label, current) =>
  `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`
const openEnquiries = () => state.inbox.filter((e) => !e.handled)

function pageHead(title, sub, crumbs = '') {
  return `<header class="page-head"><div>${crumbs ? `<p class="crumbs">${crumbs}</p>` : ''}<h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div></header>`
}

/** A one-line "where this lives" note for whoever edits the code. */
const editNote = (file) => `<p class="edit-note">Edit <code>${esc(file)}</code></p>`

function jobsCards(jobs, { withSeries = true } = {}) {
  const groups = Object.keys(LEVEL)
    .map((level) => ({ level, jobs: jobs.filter((j) => j.level === level) }))
    .filter((g) => g.jobs.length)
  if (!groups.length) return '<p class="ok">✓ Nothing to do.</p>'
  return `<div class="grid grid--3">${groups
    .map(
      ({ level, jobs }) => `
      <section class="card card--accent card--${LEVEL[level].tone}">
        <h2>${esc(LEVEL[level].label)} <span class="count">${jobs.length}</span></h2>
        <ul>${jobs
          .map(
            (j) =>
              `<li>${withSeries && j.slug ? `<strong>${seriesLink(bySlug(j.slug))}</strong> ` : ''}${esc(j.text)}</li>`,
          )
          .join('')}</ul>
      </section>`,
    )
    .join('')}</div>`
}

// ---------------------------------------------------------------------------
// Overview

function overview() {
  const d = state.data
  const c = d.counts
  const t = state.traffic
  const week = t ? t.days.slice(-7).reduce((sum, day) => sum + day.views, 0) : null
  const p = d.publishing
  const drafts = p ? p.stories.total - p.stories.published : 0
  const stat = (label, value, tone = '', sub = '', href = '') =>
    `<a class="stat ${tone ? `stat--${tone}` : ''}" href="${esc(href)}"><dt>${esc(label)}</dt><dd>${esc(value)}${sub ? `<small>${esc(sub)}</small>` : ''}</dd></a>`
  const open = openEnquiries()
  return `
    ${pageHead('Overview', `${c.series} series on the calendar · today is ${esc(fmtDate(d.today))}`)}
    <dl class="stats">
      ${stat('Running now', c.live, c.live ? 'good' : '', '', '#series')}
      ${stat('Starting soon', c.soon, '', 'next 30 days', '#calendar')}
      ${stat('To do now', c.jobs.now, c.jobs.now ? 'critical' : '', '', '#todo')}
      ${stat('This week', c.jobs.soon, c.jobs.soon ? 'warning' : '', '', '#todo')}
      ${stat('New enquiries', open.length, open.length ? 'warning' : '', '', '#enquiries')}
      ${stat('Views, 7 days', week === null ? '–' : n(week), '', '', '#traffic')}
      ${stat('Stories live', p ? p.stories.published : '–', '', drafts ? `${drafts} draft${drafts === 1 ? '' : 's'}` : '', '#stories')}
      ${stat('Shorts live', p ? p.shorts.published : '–', '', '', '#shorts')}
    </dl>
    ${
      p?.renderer === 'error'
        ? `<section class="card card--accent card--critical"><h2>Publishing is not reaching the site</h2><p>The server could not load the built pages, so published stories and shorts are not showing and story pages 404.</p><p class="sub">${esc(p.rendererError)} Run <code>yarn build</code> and restart the server.</p></section>`
        : ''
    }
    <section class="section"><h2>To do</h2>${jobsCards(d.jobs)}</section>
    <section class="section"><h2>Next 120 days</h2>${timeline(120)}</section>
    <section class="section"><h2>Latest enquiries</h2>${
      state.inbox.length
        ? `<div class="grid grid--3">${state.inbox.slice(0, 3).map(enquiryCard).join('')}</div><p class="meta" style="margin-top:8px"><a href="#enquiries">All enquiries</a></p>`
        : '<p class="muted">Nothing has come in through the forms yet.</p>'
    }</section>
    <section class="section"><h2>Site slots</h2>${slotsTable()}</section>`
}

function timeline(daysAhead) {
  const d = state.data
  const t0 = stamp(d.today) - 7 * DAY
  const t1 = t0 + (daysAhead + 7) * DAY
  const span = t1 - t0
  const pct = (ms) => (Math.min(Math.max(ms, t0), t1) - t0) / span
  const rows = d.series.filter((s) => stamp(s.end) >= t0 && stamp(s.start) <= t1)
  const months = []
  for (let t = t0; t <= t1; t += DAY) {
    const dt = new Date(t)
    if (dt.getUTCDate() === 1) {
      months.push(
        `<span style="left:${(pct(t) * 100).toFixed(2)}%">${dt.toLocaleDateString('en-AU', { timeZone: 'UTC', month: 'short' })}</span>`,
      )
    }
  }
  return `<div class="timeline">
    <div class="timeline__axis">${months.join('')}</div>
    <div class="timeline__rows">
      <div class="timeline__today" style="left:${(pct(t0 + 7 * DAY) * 100).toFixed(2)}%"></div>
      ${rows
        .map((s) => {
          const left = pct(stamp(s.start)) * 100
          const right = pct(stamp(s.end) + DAY) * 100
          const brand = d.brands[s.tour] || {}
          const dark = brand.logo === 'dark' || /^#[c-fC-F]/.test(brand.primary || '')
          return `<div class="timeline__row"><a class="timeline__bar ${s.poster ? '' : 'timeline__bar--pending'} ${dark && s.poster ? 'timeline__bar--dark' : ''}" style="--tour:${esc(brand.primary || '#8e8e93')};left:${left.toFixed(2)}%;width:${(right - left).toFixed(2)}%" href="#series/${esc(s.slug)}" title="${esc(`${s.name} · ${s.dates}${s.poster ? '' : ' · no schedule yet'}`)}">${esc(s.name)}</a></div>`
        })
        .join('')}
    </div>
    <p class="meta" style="margin-top:8px">Solid bars have a schedule on the site; dashed bars still say "Coming soon". The gold line is today.</p>
  </div>`
}

function slotsTable() {
  return `<div class="table-wrap"><table>
    <thead><tr><th>Slot</th><th>Currently</th><th>State</th></tr></thead>
    <tbody>${state.data.slots
      .map(
        (e) =>
          `<tr><th scope="row">${esc(e.slot)}</th><td>${e.slug ? seriesLink(bySlug(e.slug)) : esc(e.holder)}${e.slug && e.holder !== bySlug(e.slug).name ? ` <span class="muted">${esc(e.holder.replace(bySlug(e.slug).name, '').trim())}</span>` : ''}</td><td>${pill(e.state.tone, e.state.label)}</td></tr>`,
      )
      .join('')}</tbody></table></div>`
}

// ---------------------------------------------------------------------------
// To do

function todoView() {
  const d = state.data
  const total = d.jobs.length
  return `
    ${pageHead('To do', `${total} open. A schedule is chased within ${d.windows.chase} days of the start, watched for within ${d.windows.watch}, and Up Next looks ${d.windows.upNext} days ahead.`)}
    ${jobsCards(d.jobs)}
    <section class="section"><h2>By series</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Series</th><th>Status</th><th>To do</th></tr></thead>
      <tbody>${
        d.series
          .filter((s) => s.jobs.length)
          .map(
            (s) => `<tr class="row--${s.phase.key}">
            <td><div class="name">${tour(s.tour)} ${seriesLink(s)}</div><div class="sub">${esc(s.dates)}</div></td>
            <td>${phasePill(s)}</td>
            <td><ul class="plain" style="margin:0;padding:0;list-style:none;display:grid;gap:4px">${s.jobs.map((j) => `<li>${levelPill(j.level)} ${esc(j.text)}</li>`).join('')}</ul></td>
          </tr>`,
          )
          .join('') || '<tr><td colspan="3" class="empty">Nothing to do.</td></tr>'
      }</tbody></table></div></section>`
}

// ---------------------------------------------------------------------------
// Calendar: one full grid per month

function monthsView() {
  const d = state.data
  const f = state.months
  const tours = [...new Set(d.series.map((s) => s.tour))]
  const rows = d.series.filter(
    (s) => (!f.tour || s.tour === f.tour) && (f.finished || s.phase.key !== 'done'),
  )
  const today = new Date(stamp(d.today))
  const first = rows.length ? new Date(stamp(rows[0].start)) : today
  const lastEnd = rows.reduce((max, s) => Math.max(max, stamp(s.end)), stamp(d.today))
  const from = new Date(Date.UTC(Math.min(first.getUTCFullYear(), today.getUTCFullYear()), 0, 1))
  // Up to the later of: the last series' month, and the end of next year.
  const to = new Date(
    Math.max(
      Date.UTC(today.getUTCFullYear() + 1, 11, 1),
      Date.UTC(new Date(lastEnd).getUTCFullYear(), new Date(lastEnd).getUTCMonth(), 1),
    ),
  )
  const months = []
  for (
    let m = new Date(from);
    m <= to;
    m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))
  )
    months.push(m)
  const id = (m) => `m-${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`
  const current = id(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)))

  return `
    ${pageHead('Calendar', `${rows.length} series laid out month by month. Click a bar to open the series.`)}
    <div class="filters filters--sticky">
      <label class="field"><span>Poker room</span><select id="m-tour">${opt('', 'All rooms', f.tour)}${tours.map((t) => opt(t, roomOf(t)?.name || t, f.tour)).join('')}</select></label>
      <label class="field field--check"><input type="checkbox" id="m-finished" ${f.finished ? 'checked' : ''}> Show finished series</label>
      <nav class="month-jump" aria-label="Jump to month">${months
        .map((m) => {
          const year =
            m.getUTCMonth() === 0 || m === months[0] ? `<small>${m.getUTCFullYear()}</small>` : ''
          return `<button type="button" class="${id(m) === current ? 'is-current' : ''}" data-jump="${id(m)}">${year}${m.toLocaleDateString('en-AU', { timeZone: 'UTC', month: 'short' })}</button>`
        })
        .join('')}</nav>
    </div>
    ${months.map((m) => monthGrid(m, rows, id(m), id(m) === current)).join('')}
    <p class="meta" style="margin-top:12px">Solid bars have a schedule on the site; hatched bars still say "Coming soon". Finished series are grey.</p>`
}

function monthGrid(month, rows, anchor, isCurrent) {
  const d = state.data
  const year = month.getUTCFullYear()
  const mi = month.getUTCMonth()
  const firstDay = Date.UTC(year, mi, 1)
  const daysInMonth = new Date(Date.UTC(year, mi + 1, 0)).getUTCDate()
  const startDow = (new Date(firstDay).getUTCDay() + 6) % 7 // Monday = 0
  const gridStart = firstDay - startDow * DAY
  const weeks = Math.ceil((startDow + daysInMonth) / 7)
  const todayStamp = stamp(d.today)
  const inMonth = rows.filter(
    (s) => stamp(s.start) <= firstDay + daysInMonth * DAY - DAY && stamp(s.end) >= firstDay,
  )

  const weekHtml = []
  for (let w = 0; w < weeks; w += 1) {
    const weekStart = gridStart + w * 7 * DAY
    const weekEnd = weekStart + 6 * DAY
    const segments = inMonth
      .filter((s) => stamp(s.start) <= weekEnd && stamp(s.end) >= weekStart)
      .map((s) => {
        const a = Math.max(stamp(s.start), weekStart)
        const b = Math.min(stamp(s.end), weekEnd)
        return {
          s,
          col: Math.round((a - weekStart) / DAY) + 1,
          end: Math.round((b - weekStart) / DAY) + 2,
          starts: stamp(s.start) >= weekStart,
          ends: stamp(s.end) <= weekEnd,
        }
      })
      .sort(
        (x, y) =>
          x.col - y.col || y.end - y.col - (x.end - x.col) || x.s.name.localeCompare(y.s.name),
      )
    // Lanes: a bar takes the first row whose last bar ended before it starts.
    const laneEnds = []
    for (const seg of segments) {
      let lane = laneEnds.findIndex((end) => end <= seg.col)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = seg.end
      seg.lane = lane
    }
    const lanes = Math.max(laneEnds.length, 1)
    const days = []
    for (let i = 0; i < 7; i += 1) {
      const t = weekStart + i * DAY
      const dt = new Date(t)
      const off = dt.getUTCMonth() !== mi
      const isToday = t === todayStamp
      days.push(
        `<div class="month__day ${off ? 'is-off' : ''} ${isToday ? 'is-today' : ''}" style="grid-column:${i + 1};grid-row:1 / ${lanes + 2}"><span>${dt.getUTCDate()}</span></div>`,
      )
    }
    const bars = segments.map(({ s, col, end, starts, ends, lane }) => {
      const brand = d.brands[s.tour] || {}
      const dark = brand.logo === 'dark' || /^#[c-fC-F]/.test(brand.primary || '')
      const cls = [
        'month__bar',
        starts ? 'starts' : '',
        ends ? 'ends' : '',
        s.poster ? '' : 'is-pending',
        s.phase.key === 'done' ? 'is-done' : '',
        dark && s.poster && s.phase.key !== 'done' ? 'is-dark' : '',
      ].join(' ')
      return `<a class="${cls}" style="--tour:${esc(brand.primary || '#8e8e93')};grid-column:${col} / ${end};grid-row:${lane + 2}" href="#series/${esc(s.slug)}" title="${esc(`${s.name} · ${s.dates} · ${s.place}${s.poster ? '' : ' · no schedule yet'}`)}">${starts || col === 1 ? `<b>${esc(s.tour)}</b> ${esc(s.name)}` : ''}</a>`
    })
    weekHtml.push(`<div class="month__week">${days.join('')}${bars.join('')}</div>`)
  }

  return `<section class="month ${isCurrent ? 'is-current' : ''}" id="${anchor}">
    <h2 class="month__title">${month.toLocaleDateString('en-AU', { timeZone: 'UTC', month: 'long', year: 'numeric' })} <span class="count">${inMonth.length} series</span></h2>
    <div class="month__head">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => `<span>${w}</span>`).join('')}</div>
    ${weekHtml.join('')}
  </section>`
}

function bindMonths() {
  document.getElementById('m-tour').addEventListener('change', (e) => {
    state.months.tour = e.target.value
    render()
  })
  document.getElementById('m-finished').addEventListener('change', (e) => {
    state.months.finished = e.target.checked
    render()
  })
  // Land each month's title just under the sticky filter bar.
  const bar = document.querySelector('.filters--sticky')
  const jump = (el, behavior) => {
    const top = el.getBoundingClientRect().top + window.scrollY - bar.offsetHeight - 12
    window.scrollTo({ top, behavior })
  }
  document.querySelectorAll('[data-jump]').forEach((b) =>
    b.addEventListener('click', () => {
      const month = document.getElementById(b.dataset.jump)
      if (month) jump(month, 'smooth')
    }),
  )
  const current = document.querySelector('.month.is-current')
  if (current && !state.months.scrolled) {
    jump(current, 'auto')
    state.months.scrolled = true
  }
}

// ---------------------------------------------------------------------------
// Series

function seriesView() {
  const d = state.data
  const f = state.filters
  const tours = [...new Set(d.series.map((s) => s.tour))]
  const rows = d.series.filter((s) => {
    if (f.tour && s.tour !== f.tour) return false
    if (f.phase === 'open' ? s.phase.key === 'done' : f.phase && s.phase.key !== f.phase)
      return false
    if (f.needs === 'schedule' && (s.poster || s.phase.key === 'done')) return false
    if (f.needs === 'jobs' && !s.jobs.length) return false
    if (f.needs === 'art' && s.imageSrc) return false
    if (f.q && !`${s.name} ${s.place} ${s.tour}`.toLowerCase().includes(f.q.toLowerCase()))
      return false
    return true
  })
  return `
    ${pageHead('Series', 'Every tournament series on the calendar. Click a row for the full picture.')}
    <div class="filters">
      <label class="field"><span>Search</span><input type="search" id="f-q" value="${esc(f.q)}" placeholder="name, venue, city"></label>
      <label class="field"><span>Poker room</span><select id="f-tour">${opt('', 'All rooms', f.tour)}${tours.map((t) => opt(t, roomOf(t)?.name || t, f.tour)).join('')}</select></label>
      <label class="field"><span>Status</span><select id="f-phase">${opt('open', 'Not finished', f.phase)}${opt('', 'Any', f.phase)}${opt('live', 'Running', f.phase)}${opt('upcoming', 'Upcoming', f.phase)}${opt('done', 'Finished', f.phase)}</select></label>
      <label class="field"><span>Needs</span><select id="f-needs">${opt('', 'Anything', f.needs)}${opt('schedule', 'A schedule', f.needs)}${opt('art', 'Key art', f.needs)}${opt('jobs', 'Something doing', f.needs)}</select></label>
      <span class="count">${rows.length} of ${d.series.length}</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Series</th><th>Status</th><th>Links</th><th>Schedule</th><th>Data file</th><th>Key art</th>
        <th>Home</th><th>Calendar</th><th>Record</th><th class="num">To do</th>
      </tr></thead>
      <tbody>${
        rows
          .map(
            (s) => `<tr class="clickable row--${s.phase.key}" data-href="#series/${esc(s.slug)}">
          <td><div class="name">${tour(s.tour)} ${seriesLink(s)}</div><div class="sub">${esc(s.dates)} · ${esc(s.place)}</div></td>
          <td>${phasePill(s)}</td>
          <td class="nowrap">${[s.website && external(s.website, 'Website'), s.facebook && external(s.facebook, 'Facebook')].filter(Boolean).join(' · ') || '<span class="na">–</span>'}</td>
          <td>${
            s.poster
              ? `${check(true, `${s.scheduleRows} rows`)}<div class="sub">${s.featuredRows} featured</div>`
              : s.phase.key === 'done'
                ? '<span class="na">never posted</span>'
                : check(false, '', 'Coming soon')
          }</td>
          <td>${s.poster ? check(Boolean(s.dataFile), s.dataFile, 'none') : '<span class="na">–</span>'}</td>
          <td>${s.imageSrc ? check(s.imageExists, s.imageSrc.split('/').pop(), 'file missing') : '<span class="na">none</span>'}</td>
          <td>${
            [s.home, s.tickerRows ? `ticker ×${s.tickerRows}` : '']
              .filter(Boolean)
              .map((t) => `<span class="tag">${esc(t)}</span>`)
              .join('') || '<span class="na">–</span>'
          }</td>
          <td>${
            [s.upNext ? 'Up Next' : '', s.onBanner ? 'Promo banner' : '']
              .filter(Boolean)
              .map((t) => `<span class="tag">${esc(t)}</span>`)
              .join('') || '<span class="na">–</span>'
          }</td>
          <td>${s.scraped ? check(s.scrapeDatesMatch, 'dates match', 'dates differ') : '<span class="na">operator site</span>'}</td>
          <td class="num">${s.jobs.length ? levelPill(s.jobs[0].level) + ` ${s.jobs.length}` : '<span class="ok">✓</span>'}</td>
        </tr>`,
          )
          .join('') || '<tr><td colspan="10" class="empty">No series match.</td></tr>'
      }</tbody></table></div>`
}

function seriesDetail(slug) {
  const s = bySlug(slug)
  if (!s)
    return `${pageHead('Not found', `No series at ${esc(slug)}.`)}<p><a href="#series">Back to series</a></p>`
  const m = s.posterMeta
  const sc = s.scraped
  const org = s.organiser
  const row = (dt, dd) => (dd ? `<dt>${esc(dt)}</dt><dd>${dd}</dd>` : '')
  const li = (ok, text, badText = text, tone = 'no') =>
    `<li><span class="mark ${ok ? 'ok' : tone}">${ok ? '✓' : tone === 'na' ? '–' : '✗'}</span><span>${esc(ok ? text : badText)}</span></li>`

  const checks = [
    li(
      s.poster,
      `Schedule on the site: ${s.scheduleRows} rows, ${s.featuredRows} featured`,
      'No schedule on the site; the page says "Coming soon"',
    ),
    s.poster
      ? li(
          Boolean(s.dataFile),
          `Data file: data/${s.dataFile}`,
          'No data/*-schedule.json copy of the schedule',
        )
      : '',
    li(
      Boolean(s.imageSrc) && s.imageExists,
      `Key art: ${s.imageSrc}`,
      s.imageSrc ? `Key art file missing: ${s.imageSrc}` : 'No key art',
      s.imageSrc ? 'no' : 'na',
    ),
    li(Boolean(s.home), `Home page: ${s.home}`, 'Not on the home events banner', 'na'),
    li(s.tickerRows > 0, `Home ticker: ${s.tickerRows} rows`, 'Not in the home ticker', 'na'),
    li(
      Boolean(s.upNext),
      `Calendar Up Next card${s.upNext?.prize ? ` (${s.upNext.prize})` : ''}`,
      'Not in Up Next on the calendar page',
      'na',
    ),
    li(s.onBanner, 'Calendar promo banner', 'Not the calendar promo banner', 'na'),
    sc
      ? li(
          s.scrapeDatesMatch,
          'Dates match the series record',
          `Record says ${sc.start} to ${sc.end}`,
        )
      : li(false, '', 'No series record; row taken from the operator site', 'na'),
  ].join('')

  return `
    ${pageHead(s.name, `${esc(s.dates)} · ${s.days} days · ${esc(s.place)}`, `<a href="#series">Series</a> / <a href="#rooms/${esc(s.tour)}">${esc(roomOf(s.tour)?.name || s.tour)}</a>`)}
    <div class="detail-hero">
      <div class="grid" style="gap:16px">
        <div>${tour(s.tour)} ${phasePill(s)} ${s.status ? pill('critical', s.status) : ''}</div>
        <div class="links">
          <a href="${esc(siteUrl(s.href))}" target="_blank" rel="noopener noreferrer">Open on site ↗</a>
          ${s.website ? `<a href="${esc(s.website)}" target="_blank" rel="noopener noreferrer">Operator site ↗</a>` : ''}
          ${sc?.mapUrl ? `<a href="${esc(sc.mapUrl)}" target="_blank" rel="noopener noreferrer">Map ↗</a>` : ''}
        </div>
        <section class="card ${s.jobs.length ? `card--accent card--${LEVEL[s.jobs[0].level].tone}` : ''}">
          <h3>To do${s.jobs.length ? ` <span class="count">${s.jobs.length}</span>` : ''}</h3>
          ${s.jobs.length ? `<ul class="plain">${s.jobs.map((j) => `<li>${levelPill(j.level)} ${esc(j.text)}</li>`).join('')}</ul>` : '<p class="ok">✓ Nothing to do for this series.</p>'}
        </section>
        <section class="card"><h3>Checklist</h3><ul class="checks">${checks}</ul></section>
      </div>
      <div>
        ${
          s.imageSrc && s.imageExists
            ? `<img class="art" src="${esc(s.imageSrc)}" alt="">`
            : `<div class="art placeholder" style="aspect-ratio:4/5;display:grid;place-items:center;color:var(--faint)">no key art</div>`
        }
      </div>
    </div>

    <div class="section grid grid--2">
      <section class="card"><h3>Calendar row</h3><dl class="kv">
        ${row('Poker room', `${tour(s.tour)} ${esc(roomOf(s.tour)?.name || '')}`)}
        ${row('Dates', `${esc(fmtDate(s.start))} – ${esc(fmtDate(s.end))}`)}
        ${row('Place', esc(s.place))}
        ${row('Page', `<a href="${esc(siteUrl(s.href))}" target="_blank" rel="noopener noreferrer"><code>${esc(s.href)}</code></a>`)}
        ${row('Website', external(s.website, host(s.website)))}
      </dl>${editNote(s.contentFile)}</section>
      <section class="card"><h3>Contact</h3>${
        org
          ? `<dl class="kv">${row('Organiser', esc(org.name))}${row('Email', org.email ? `<a href="mailto:${esc(org.email)}">${esc(org.email)}</a>` : '')}${row('Phone', esc(org.phone || ''))}${row('Website', org.website ? external(org.website, host(org.website)) : '')}</dl>`
          : `<p class="muted">No organiser on the series record. Use the operator site: ${external(s.website, host(s.website))}.</p>`
      }</section>
      ${
        sc
          ? `<section class="card"><h3>Series record</h3><dl class="kv">
            ${row('Listed as', esc(sc.title))}
            ${row('Dates', `${esc(sc.start)} to ${esc(sc.end)} ${s.scrapeDatesMatch ? '<span class="ok">✓</span>' : '<span class="no">✗ differs</span>'}`)}
            ${row('Venue', esc(sc.venue))}
            ${row('Address', esc(sc.address))}
            ${row('Region', esc(sc.region || ''))}
            ${
              sc.posterFacts
                ? row(
                    'Poster',
                    esc(
                      Object.entries(sc.posterFacts)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · '),
                    ),
                  )
                : ''
            }
          </dl></section>`
          : ''
      }
      ${
        m
          ? `<section class="card"><h3>Poster page</h3><dl class="kv">
            ${row('Title', esc(m.title))}
            ${row('Presented by', esc(m.presentedBy))}
            ${row('Venue', `${esc(m.venue)}${m.venueDetail ? ` · ${esc(m.venueDetail)}` : ''}`)}
            ${row('City', esc(m.city))}
            ${row('Buy-in note', esc(m.buyInSub))}
            ${row('SEO title', esc(m.seo?.title))}
            ${row('Stats', m.stats?.map((st) => `<span class="tag">${esc(st.value)} ${esc(st.label)}</span>`).join(' '))}
            ${row('Sponsors', m.sponsors?.length ? esc(m.sponsors.join(', ')) : '')}
          </dl>${m.notes?.length ? `<ul style="margin-top:10px">${m.notes.map((note) => `<li class="muted">${esc(note)}</li>`).join('')}</ul>` : ''}</section>`
          : ''
      }
    </div>

    ${s.schedule ? scheduleTable(s) : ''}`
}

function scheduleTable(s) {
  const rows = s.schedule
  const hasShot = rows.some((r) => r.shotClock)
  const hasRoom = rows.some((r) => r.room)
  const hasTime = rows.some((r) => r.regoTime)
  const hasNum = rows.some((r) => r.number)
  let lastDate = ''
  return `<section class="section"><h2>Schedule <span class="muted" style="font-family:var(--body);text-transform:none;letter-spacing:0">${rows.length} rows</span></h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Time</th>${hasNum ? '<th>#</th>' : ''}<th>Event</th><th>Guarantee</th><th>Buy-in</th><th>Stack</th><th>Blinds</th>${hasShot ? '<th>Clock</th>' : ''}<th>Re-entry</th><th>Late rego</th>${hasTime ? '<th>Rego time</th>' : ''}${hasRoom ? '<th>Room</th>' : ''}</tr></thead>
      <tbody>${rows
        .map((r) => {
          const date = r.date === lastDate ? '' : fmtDate(r.date)
          lastDate = r.date
          return `<tr class="${r.featured ? 'row--featured' : ''}">
            <td class="nowrap">${esc(date)}</td><td class="nowrap">${esc(r.time)}</td>${hasNum ? `<td>${esc(r.number || '')}</td>` : ''}
            <td>${esc(r.name)}${r.feeds ? ` <span class="tag">feeds ${esc(r.feeds)}</span>` : ''}</td>
            <td class="nowrap">${esc(r.guarantee)}</td><td class="nowrap">${esc(r.buyIn)}${r.split ? `<div class="sub">${esc(r.split)}</div>` : ''}</td>
            <td>${esc(r.stack)}</td><td>${esc(r.blinds)}</td>${hasShot ? `<td>${esc(r.shotClock || '')}</td>` : ''}
            <td>${esc(r.reEntry)}</td><td>${esc(r.regoLevel)}</td>${hasTime ? `<td>${esc(r.regoTime || '')}</td>` : ''}${hasRoom ? `<td>${esc(r.room || '')}</td>` : ''}
          </tr>`
        })
        .join('')}</tbody></table></div></section>`
}

// ---------------------------------------------------------------------------
// Poker rooms

function roomsView() {
  const d = state.data
  const f = state.rooms
  const q = f.q.trim().toLowerCase()
  const rooms = d.rooms.filter((r) => {
    const active = r.live.length || r.upcoming.length
    if (f.show === 'active' && !active) return false
    if (f.show === 'quiet' && active) return false
    if (f.show === 'jobs' && !r.jobs.length) return false
    if (f.show === 'live' && !r.live.length) return false
    if (q && !`${r.name} ${r.fullName} ${r.code} ${r.cities.join(' ')}`.toLowerCase().includes(q))
      return false
    return true
  })
  const card = (r) => {
    const next = r.next ? bySlug(r.next) : null
    const open = r.jobs.length
    const live = r.live.length
    return `<a class="room-card" href="#rooms/${esc(r.code)}" style="--tour:${esc(r.brand?.primary || '#8e8e93')};--tour-bg:${esc(markBg(r))}">
      <div class="room-card__logo">${r.logo.tile.ok ? `<img src="${esc(r.logo.tile.src)}" alt="">` : `<span class="no">✗ no logo</span>`}</div>
      <div class="room-card__body">
        <strong>${esc(r.name)}</strong>
        <div class="sub">${esc(r.cities.join(', ') || 'No venue listed yet')}</div>
        <div class="room-card__meta">
          ${live ? pill('good', `${live} running`) : ''}
          <span class="tag">${r.counts.series} series</span>
          ${open ? `<span class="pill pill--${LEVEL[r.jobs[0].level].tone}">${open} to do</span>` : ''}
        </div>
        <div class="sub room-card__next">${next ? `Next: ${esc(next.name)} · ${esc(next.dates)}` : 'Nothing coming up'}</div>
      </div>
    </a>`
  }
  return `
    ${pageHead('Poker rooms', `${d.rooms.length} operators run the series on the calendar. Click a room for its profile, contacts, venues and series.`)}
    <div class="filters">
      <label class="field"><span>Search</span><input type="search" id="r-q" value="${esc(f.q)}" placeholder="room, city or code"></label>
      <label class="field"><span>Show</span><select id="r-show">${opt('', 'All rooms', f.show)}${opt('live', 'Running a series now', f.show)}${opt('active', 'Has series coming up', f.show)}${opt('quiet', 'Nothing scheduled', f.show)}${opt('jobs', 'Needs attention', f.show)}</select></label>
      <span class="count">${rooms.length} of ${d.rooms.length}</span>
    </div>
    ${rooms.length ? `<div class="room-grid">${rooms.map(card).join('')}</div>` : '<p class="empty">No rooms match.</p>'}`
}

function bindRooms() {
  const q = document.getElementById('r-q')
  q.addEventListener('input', (e) => {
    state.rooms.q = e.target.value
    render()
    const el = document.getElementById('r-q')
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  })
  document.getElementById('r-show').addEventListener('change', (e) => {
    state.rooms.show = e.target.value
    render()
  })
}

function roomDetail(code) {
  const r = roomOf(code)
  if (!r)
    return `${pageHead('Not found', `No poker room with the code ${esc(code)}.`)}<p><a href="#rooms">Back to poker rooms</a></p>`
  const b = r.brand
  const c = r.contact
  const row = (dt, dd) => (dd ? `<dt>${esc(dt)}</dt><dd>${dd}</dd>` : '')
  const mark = (label, m, bg) =>
    `<div class="mark-cell"><div class="mark-cell__box" style="background:${esc(bg)}">${m.ok ? `<img src="${esc(m.src)}" alt="">` : `<span class="no">✗</span>`}</div><div class="sub">${esc(label)}<br>${m.src ? `<code>${esc(m.src.split('/').pop())}</code>` : '<span class="na">none</span>'}</div></div>`
  const swatch = (label, hex) =>
    hex
      ? `<span class="swatch"><i style="background:${esc(hex)}"></i>${esc(label)} <code>${esc(hex)}</code></span>`
      : ''
  const live = r.live.map(bySlug)
  const upcoming = r.upcoming.map(bySlug)
  const done = r.done.map(bySlug).reverse()
  const current = [...live, ...upcoming]

  const seriesCard = (s) => `<div class="card art-card">
      ${s.imageSrc && s.imageExists ? `<img src="${esc(s.imageSrc)}" alt="">` : `<div class="placeholder">${s.imageSrc ? 'file missing' : 'no poster art'}</div>`}
      <div class="caption">
        <strong>${seriesLink(s)}</strong>
        <div class="sub">${esc(s.dates)} · ${esc(s.place)}</div>
        <div style="margin-top:6px">${phasePill(s)} ${s.poster ? pill('good', `schedule · ${s.scheduleRows} rows`) : pill('warning', 'no schedule yet')}</div>
        ${s.jobs.length ? `<div class="sub" style="margin-top:6px">${levelPill(s.jobs[0].level)} ${esc(s.jobs[0].text)}</div>` : ''}
      </div>
    </div>`

  const schedules = current.filter((s) => s.schedule)

  return `
    ${pageHead(r.name, `${esc(r.fullName !== r.name ? `${r.fullName} · ` : '')}${r.counts.series} series on the calendar · ${esc(r.cities.join(', ') || 'no city yet')}`, `<a href="#rooms">Poker rooms</a> / ${esc(r.code)}`)}
    <div class="room-hero" style="--tour:${esc(b?.primary || '#8e8e93')};--tour-2:${esc(b?.secondary || '#8e8e93')}">
      <div class="room-hero__logo" style="background:${esc(markBg(r))}">
        ${r.logo.wordmark.ok ? `<img src="${esc(r.logo.wordmark.src)}" alt="">` : `<span class="no">✗ ${esc(r.logo.wordmark.src || 'no wordmark')}</span>`}
      </div>
      <div class="grid" style="gap:14px">
        <div class="links">
          ${external(r.website, `Official site · ${host(r.website)}`)}
          <a href="${esc(siteUrl(r.path))}" target="_blank" rel="noopener noreferrer">Tour page on site ↗</a>
          ${c.emails[0] ? `<a href="mailto:${esc(c.emails[0])}">Email ↗</a>` : ''}
        </div>
        <dl class="stats stats--compact">
          <div class="stat ${live.length ? 'stat--good' : ''}"><dt>Running</dt><dd>${live.length}</dd></div>
          <div class="stat"><dt>Upcoming</dt><dd>${upcoming.length}</dd></div>
          <div class="stat"><dt>Finished</dt><dd>${done.length}</dd></div>
          <div class="stat"><dt>Schedules up</dt><dd>${r.counts.withSchedule}<small>of ${r.counts.series}</small></dd></div>
          <div class="stat ${r.jobs.length && r.jobs[0].level === 'now' ? 'stat--critical' : r.jobs.length ? 'stat--warning' : ''}"><dt>To do</dt><dd>${r.jobs.length}</dd></div>
        </dl>
        ${r.jobs.length ? `<section class="card card--accent card--${LEVEL[r.jobs[0].level].tone}"><h3>To do <span class="count">${r.jobs.length}</span></h3><ul class="plain">${r.jobs.map((j) => `<li>${levelPill(j.level)} <strong>${seriesLink(bySlug(j.slug))}</strong> ${esc(j.text)}</li>`).join('')}</ul></section>` : ''}
      </div>
    </div>

    <div class="section grid grid--2">
      <section class="card"><h3>Profile</h3><dl class="kv">
        ${row('Name', esc(r.name))}
        ${r.fullName !== r.name ? row('Strip tile reads', esc(r.fullName)) : ''}
        ${row('Code', `<code>${esc(r.code)}</code> <span class="muted">· label ${esc(r.label)}</span>`)}
        ${row('Website', external(r.website, r.website))}
        ${row('Site page', `<a href="${esc(siteUrl(r.path))}" target="_blank" rel="noopener noreferrer"><code>${esc(r.path)}</code></a>`)}
        ${row('Cities', esc(r.cities.join(', ')))}
        ${row('Series', `${r.counts.series} on the calendar · ${r.counts.withSchedule} with a schedule`)}
      </dl>${editNote('src/content/tourBrands.js, calendarPage.js, pokerRooms.js')}</section>

      <section class="card"><h3>Contact</h3>${
        c.organisers.length || c.emails.length || c.phones.length
          ? `<dl class="kv">
              ${row('Listed as', esc(c.organisers.join(', ')))}
              ${row('Email', c.emails.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>'))}
              ${row('Phone', esc(c.phones.join(' · ')))}
              ${row('Links', c.websites.map((w) => external(w, w.replace(/^https?:\/\//, ''))).join('<br>'))}
            </dl>`
          : `<p class="muted">No organiser on the series records. Use the operator site: ${external(r.website, host(r.website))}.</p>`
      }</section>

      <section class="card"><h3>Brand</h3>${
        b
          ? `<div class="swatches">${swatch('Primary', b.primary)}${swatch('Secondary', b.secondary)}${swatch('Icon backing', b.iconBg)}</div>
             <dl class="kv" style="margin-top:12px">${row('Mark tone', esc(b.logo))}${row('Sampled from', esc(b.source))}</dl>`
          : '<p class="no">✗ No profile in tourBrands.js; the site falls back to gold.</p>'
      }
        <div class="marks">
          ${mark('Wordmark', r.logo.wordmark, markBg(r))}
          ${mark('Icon', r.logo.icon, b?.iconBg || '#0a0a0a')}
          ${mark('Mono', r.logo.mono, '#0a0a0a')}
          ${r.logo.tile.src !== r.logo.wordmark.src ? mark('Strip tile', r.logo.tile, '#0a0a0a') : ''}
        </div>
      </section>

      <section class="card"><h3>Where it deals <span class="count">${r.venues.length}</span></h3>${
        r.venues.length
          ? `<ul class="plain venues">${r.venues
              .map(
                (v) =>
                  `<li><strong>${esc(v.name)}</strong><div class="sub">${esc(v.address)}</div><div class="sub">${v.website ? external(v.website, host(v.website)) : ''}${v.shared.length ? ` · shared with ${v.shared.map((code) => tour(code)).join(' ')}` : ''}</div></li>`,
              )
              .join('')}</ul>`
          : '<p class="muted">No venue on the Where to Play page lists this room.</p>'
      }</section>
    </div>

    <section class="section"><h2>Upcoming series <span class="count">${current.length}</span></h2>
      ${current.length ? `<div class="art-grid art-grid--wide">${current.map(seriesCard).join('')}</div>` : '<p class="muted">Nothing running or upcoming on the calendar for this room.</p>'}
    </section>

    ${schedules
      .map(
        (s, i) => `<details class="section schedule-fold" ${i === 0 ? 'open' : ''}>
          <summary><h2>${esc(s.name)} schedule <span class="count">${s.scheduleRows} rows</span></h2><span class="sub">${esc(s.dates)} · ${phasePill(s)} · ${seriesLink(s)}</span></summary>
          ${scheduleTable(s)
            .replace(/^<section class="section">.*?<\/h2>/, '')
            .replace(/<\/section>$/, '')}
        </details>`,
      )
      .join('')}

    ${
      done.length
        ? `<section class="section"><h2>Earlier series <span class="count">${done.length}</span></h2>
          <div class="table-wrap"><table>
            <thead><tr><th>Series</th><th>Dates</th><th>Place</th><th>Schedule</th><th>Poster</th></tr></thead>
            <tbody>${done.map((s) => `<tr class="clickable row--done" data-href="#series/${esc(s.slug)}"><td>${seriesLink(s)}</td><td class="nowrap">${esc(s.dates)}</td><td>${esc(s.place)}</td><td>${s.poster ? check(true, `${s.scheduleRows} rows`) : '<span class="na">never posted</span>'}</td><td>${s.imageSrc ? check(s.imageExists, 'yes', 'file missing') : '<span class="na">none</span>'}</td></tr>`).join('')}</tbody>
          </table></div></section>`
        : ''
    }`
}

// ---------------------------------------------------------------------------
// Enquiries

const FORM_LABEL = { contact: 'Contact form', venue: 'Venue listing' }

/** One file sent with an enquiry: a link to open it, or its name if it was not kept. */
function attachmentLink(e, f) {
  // Records saved before attachments were kept hold just the file name.
  if (typeof f === 'string' || !f.file) {
    const why = typeof f === 'string' ? 'not kept' : 'not kept: not a PDF or image'
    return `<span class="tag" title="${why}">${esc(f.name ?? f)}</span>`
  }
  const href = `api/enquiries/${encodeURIComponent(e.id)}/files/${encodeURIComponent(f.file)}`
  const kb = Math.max(1, Math.round(f.size / 1024))
  return `<a class="tag" href="${href}" target="_blank" rel="noopener">${esc(f.name)} <span class="muted">${kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`}</span></a>`
}

function enquiryCard(e) {
  return `<article class="card enquiry ${e.handled ? 'is-handled' : ''}" data-id="${esc(e.id)}">
    <div class="enquiry__head">
      <div>
        <strong>${esc(e.name || e.email || 'Anonymous')}</strong>
        ${e.email ? `<div class="sub"><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></div>` : ''}
      </div>
      <div class="enquiry__when" title="${esc(fmtWhen(e.receivedAt))}">${esc(ago(e.receivedAt))}</div>
    </div>
    <div class="enquiry__meta">
      ${pill(e.form === 'venue' ? 'neutral' : 'muted', FORM_LABEL[e.form] || e.form)}
      ${e.handled ? pill('good', 'handled') : pill('warning', 'new')}
    </div>
    <p class="enquiry__message">${esc(e.message)}</p>
    ${e.files?.length ? `<p class="sub">Attached: ${e.files.map((f) => attachmentLink(e, f)).join(' ')}</p>` : ''}
    <div class="enquiry__foot">
      <span class="meta">${esc(fmtWhen(e.receivedAt))}${e.page ? ` · from ${esc(e.page.replace(/^https?:\/\/[^/]+/, '') || '/')}` : ''}</span>
      <span class="enquiry__actions">
        ${e.email ? `<a class="btn btn--ghost btn--sm" href="mailto:${esc(e.email)}?subject=${encodeURIComponent(`Re: ${e.subject || 'your enquiry'}`)}">Reply</a>` : ''}
        <button type="button" class="btn btn--ghost btn--sm" data-handled="${e.handled ? 'false' : 'true'}">${e.handled ? 'Reopen' : 'Mark handled'}</button>
      </span>
    </div>
  </article>`
}

function enquiriesView() {
  const f = state.enquiries
  const q = f.q.trim().toLowerCase()
  const rows = state.inbox.filter((e) => {
    if (f.show === 'open' && e.handled) return false
    if (f.show === 'handled' && !e.handled) return false
    if (f.form && e.form !== f.form) return false
    if (q && !`${e.name} ${e.email} ${e.message}`.toLowerCase().includes(q)) return false
    return true
  })
  const open = openEnquiries().length
  return `
    ${pageHead('Enquiries', `Everything sent through the contact form and the venue listing form. ${open ? `<strong>${open} waiting for a reply.</strong>` : 'Nothing waiting.'} They are saved here; nothing is emailed yet.`)}
    <div class="filters">
      <label class="field"><span>Search</span><input type="search" id="e-q" value="${esc(f.q)}" placeholder="name, email or words in the message"></label>
      <label class="field"><span>Show</span><select id="e-show">${opt('open', 'New', f.show)}${opt('handled', 'Handled', f.show)}${opt('', 'Everything', f.show)}</select></label>
      <label class="field"><span>Form</span><select id="e-form">${opt('', 'Both forms', f.form)}${opt('contact', 'Contact form', f.form)}${opt('venue', 'Venue listing', f.form)}</select></label>
      <span class="count">${rows.length} of ${state.inbox.length}</span>
    </div>
    ${
      rows.length
        ? `<div class="enquiries">${rows.map(enquiryCard).join('')}</div>`
        : `<p class="empty">${state.inbox.length ? 'Nothing matches.' : 'No enquiries yet. They appear here the moment someone sends one.'}</p>`
    }`
}

function bindEnquiries() {
  const set = (key, value, refocus) => {
    state.enquiries[key] = value
    render()
    if (refocus) {
      const el = document.getElementById('e-q')
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }
  document.getElementById('e-q').addEventListener('input', (e) => set('q', e.target.value, true))
  document.getElementById('e-show').addEventListener('change', (e) => set('show', e.target.value))
  document.getElementById('e-form').addEventListener('change', (e) => set('form', e.target.value))
}

async function setHandled(id, handled) {
  const res = await fetch(`api/enquiries/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `handled=${handled}`,
  })
  if (res.status === 401) return location.replace('./')
  if (!res.ok) return
  const record = await res.json()
  state.inbox = state.inbox.map((e) => (e.id === record.id ? record : e))
  render()
}

// ---------------------------------------------------------------------------
// Traffic

function trafficView() {
  const t = state.traffic
  if (!t)
    return `${pageHead('Traffic', 'Page views, counted by the site itself.')}<p class="muted">No traffic tally. The site server writes one once it is running (see server/store.mjs).</p>`
  const days = t.days
  const span = days.length
  const avg = span ? Math.round(t.totals.views / span) : 0
  const stat = (label, value, sub = '') =>
    `<div class="stat"><dt>${esc(label)}</dt><dd>${esc(value)}${sub ? `<small>${esc(sub)}</small>` : ''}</dd></div>`
  const rangeOpt = (v, label) =>
    `<option value="${v}" ${v === state.trafficDays ? 'selected' : ''}>${label}</option>`
  const since = t.firstDay ? `Counting since ${fmtDate(t.firstDay)}.` : 'Nothing counted yet.'
  return `
    ${pageHead('Traffic', `Every page the site served to a person, counted by the server. ${since}`)}
    <div class="filters">
      <label class="field"><span>Range</span><select id="t-days">${rangeOpt(7, 'Last 7 days')}${rangeOpt(30, 'Last 30 days')}${rangeOpt(90, 'Last 90 days')}</select></label>
      <span class="meta">${esc(fmtDate(t.from))} – ${esc(fmtDate(t.to))}</span>
    </div>
    <dl class="stats">
      ${stat('Page views', n(t.totals.views))}
      ${stat('Visitors', n(t.totals.visitors), 'unique per day')}
      ${stat('A day', n(avg), 'average views')}
      ${stat('Crawler hits', n(t.totals.crawlers), 'Google, Bing, bots')}
    </dl>
    <section class="section card">
      <h3>Views by day</h3>
      ${trafficChart(days)}
    </section>
    <div class="section grid grid--2">
      <section class="card"><h3>Top pages</h3>${
        t.pages.length
          ? `<div class="table-wrap table-wrap--flat"><table><thead><tr><th>Page</th><th class="num">Views</th><th class="num">Share</th></tr></thead><tbody>${t.pages
              .map(
                (p) =>
                  `<tr><td><a href="${esc(siteUrl(p.path))}" target="_blank" rel="noopener noreferrer">${esc(p.path)}</a></td><td class="num">${n(p.views)}</td><td class="num">${t.totals.views ? Math.round((p.views / t.totals.views) * 100) : 0}%</td></tr>`,
              )
              .join('')}</tbody></table></div>`
          : '<p class="muted">No views in this range.</p>'
      }</section>
      <section class="card"><h3>Where visitors came from</h3>${
        t.referrers.length
          ? `<div class="table-wrap table-wrap--flat"><table><thead><tr><th>Site</th><th class="num">Views</th></tr></thead><tbody>${t.referrers
              .map((r) => `<tr><td>${esc(r.host)}</td><td class="num">${n(r.views)}</td></tr>`)
              .join('')}</tbody></table></div>`
          : '<p class="muted">No referrals yet. Visitors who type the address, use a bookmark or come from an app show no source.</p>'
      }
      <p class="meta" style="margin-top:10px">Counted on the server, so it needs no cookie banner and includes everyone. Google Analytics, if it is set up, only counts visitors who accept cookies.</p></section>
    </div>`
}

function trafficChart(days) {
  const W = 960
  const H = 220
  const pad = { top: 12, right: 8, bottom: 28, left: 40 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const max = Math.max(1, ...days.map((d) => d.views))
  // A tidy top: 1-2-5 steps.
  const step =
    [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000].find((s) => max / s <= 4) || 10000
  const top = Math.ceil(max / step) * step
  const y = (v) => pad.top + innerH - (v / top) * innerH
  const slot = innerW / days.length
  const barW = Math.max(2, Math.min(28, slot * 0.36))
  const labelEvery = days.length > 31 ? 14 : days.length > 10 ? 5 : 1
  const grid = []
  for (let v = 0; v <= top; v += step)
    grid.push(
      `<line x1="${pad.left}" x2="${W - pad.right}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="chart__grid"/><text x="${pad.left - 6}" y="${(y(v) + 4).toFixed(1)}" class="chart__tick" text-anchor="end">${n(v)}</text>`,
    )
  const bars = days
    .map((d, i) => {
      const x = pad.left + i * slot + slot / 2
      const v = y(d.views)
      const u = y(d.visitors)
      const label = i % labelEvery === 0 || i === days.length - 1
      return `<g class="chart__day">
        <title>${esc(fmtDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' }))}: ${n(d.views)} views · ${n(d.visitors)} visitors${d.crawlers ? ` · ${n(d.crawlers)} crawler hits` : ''}</title>
        <rect class="chart__hit" x="${(x - slot / 2).toFixed(1)}" y="${pad.top}" width="${slot.toFixed(1)}" height="${innerH}"/>
        <rect x="${(x - barW - 1).toFixed(1)}" y="${v.toFixed(1)}" width="${barW.toFixed(1)}" height="${(pad.top + innerH - v).toFixed(1)}" rx="2" fill="${CHART.views}"/>
        <rect x="${(x + 1).toFixed(1)}" y="${u.toFixed(1)}" width="${barW.toFixed(1)}" height="${(pad.top + innerH - u).toFixed(1)}" rx="2" fill="${CHART.visitors}"/>
        ${label ? `<text x="${x.toFixed(1)}" y="${H - 8}" class="chart__tick" text-anchor="middle">${esc(fmtDate(d.date, { day: 'numeric', month: 'short' }))}</text>` : ''}
      </g>`
    })
    .join('')
  return `<div class="chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Page views and visitors by day" preserveAspectRatio="none">
      ${grid.join('')}
      ${bars}
    </svg>
    <div class="chart__legend"><span><i style="background:${CHART.views}"></i> Page views</span><span><i style="background:${CHART.visitors}"></i> Visitors</span></div>
  </div>`
}

function bindTraffic() {
  document.getElementById('t-days').addEventListener('change', async (e) => {
    state.trafficDays = Number(e.target.value)
    await loadTraffic()
    render()
  })
}

// ---------------------------------------------------------------------------
// Website: home page, calendar page, schedules & data, contacts

function homeView() {
  const d = state.data
  const h = d.home
  const stateOf = (href) => {
    const s = d.series.find((x) => x.href === href)
    if (!s) return pill('neutral', 'not a series')
    if (s.phase.key === 'done') return pill('critical', 'stale: finished')
    return phasePill(s)
  }
  const card = (title, item, extra = '') => `<div class="card art-card">
      ${item.imageSrc && item.imageExists ? `<img src="${esc(item.imageSrc)}" alt="">` : `<div class="placeholder">${item.imageSrc ? 'file missing' : 'no image'}</div>`}
      <div class="caption"><strong>${esc(title)}</strong><div>${tour(item.tour)} ${esc(item.name)}</div><div class="sub">${esc(item.dates)}</div><div style="margin-top:6px">${stateOf(item.href)} ${extra}</div></div>
    </div>`
  const candidates = d.series.filter(
    (s) =>
      s.phase.key !== 'done' &&
      !s.isHero &&
      !s.side &&
      (s.phase.key === 'live' || s.phase.until <= 30),
  )
  const tickerSeries = [...new Set(h.ticker.map((t) => t.href))]
    .map((href) => d.series.find((s) => s.href === href))
    .filter(Boolean)
  return `
    ${pageHead('Home page', "What the events banner shows right now: the hero, three side cards and the ticker. LIVE, Upcoming and Finished come from each series' dates.")}
    ${editNote('src/content/events.js')}
    <section class="section"><h2>Events banner</h2>
      <div class="art-grid">
        ${card('Hero', h.hero)}
        ${h.sideEvents.map((s, i) => card(`Side card ${i + 1}`, s)).join('')}
      </div>
    </section>
    <section class="section"><h2>Ticker</h2>
      <p class="muted" style="margin-bottom:10px">${h.ticker.length} rows, from ${tickerSeries.map((s) => `${seriesLink(s)} ${s.phase.key === 'done' ? pill('critical', 'finished') : phasePill(s)}`).join(', ') || 'nothing'}.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Room</th><th>Event</th><th>Date</th><th class="num">Buy-in</th><th>Guarantee / entries</th><th>Links to</th></tr></thead>
        <tbody>${h.ticker.map((t) => `<tr><td>${tour(t.tour)}</td><td>${esc(t.name)}${t.live ? ` ${pill('good', 'live')}` : ''}</td><td class="nowrap">${esc(t.date)}</td><td class="num">${esc(t.currency)} ${esc(t.buyIn)}</td><td>${esc(t.entries || t.guarantee || '')}</td><td><code>${esc(t.href)}</code></td></tr>`).join('')}</tbody>
      </table></div>
    </section>
    <section class="section"><h2>Could go on the banner</h2>
      ${
        candidates.length
          ? `<div class="table-wrap"><table><thead><tr><th>Series</th><th>Status</th><th>Schedule</th><th>Key art</th></tr></thead><tbody>${candidates
              .map(
                (s) =>
                  `<tr><td><div class="name">${tour(s.tour)} ${seriesLink(s)}</div><div class="sub">${esc(s.dates)}</div></td><td>${phasePill(s)}</td><td>${s.poster ? check(true, `${s.scheduleRows} rows`) : check(false, '', 'none')}</td><td>${s.imageSrc ? check(s.imageExists, 'yes', 'file missing') : '<span class="na">none</span>'}</td></tr>`,
              )
              .join('')}</tbody></table></div>`
          : '<p class="muted">Every running series and everything starting within 30 days is already on the banner.</p>'
      }
    </section>`
}

function calendarPageView() {
  const d = state.data
  const c = d.calendar
  const b = c.banner
  const bannerSeries = d.series.find((s) => s.onBanner)
  return `
    ${pageHead('Calendar page', 'What the public calendar page shows: the strip of rooms, the promo banner and the Up Next cards.')}
    ${editNote('src/content/calendarPage.js')}
    <section class="section"><h2>Promo banner</h2>
      <div class="card">
        ${b.src && b.fileOk ? `<img class="banner-preview" src="${esc(b.src)}" alt="${esc(b.alt)}">` : `<p class="${b.src ? 'no' : 'muted'}">${b.src ? `File missing: ${esc(b.src)}` : 'Striped placeholder (no image set).'}</p>`}
        <dl class="kv" style="margin-top:12px">
          <dt>Alt</dt><dd>${esc(b.alt || '')}</dd>
          <dt>Links to</dt><dd>${b.href ? external(b.href, b.href) : '<span class="na">nothing</span>'}</dd>
          <dt>Desktop</dt><dd>${b.src ? check(b.fileOk, b.src, `missing ${b.src}`) : '<span class="na">none</span>'}</dd>
          <dt>Mobile cut</dt><dd>${b.mobileSrc ? check(b.mobileFileOk, b.mobileSrc, `missing ${b.mobileSrc}`) : '<span class="na">none (wide image centre-cropped)</span>'}</dd>
          <dt>Series</dt><dd>${bannerSeries ? `${seriesLink(bannerSeries)} ${bannerSeries.phase.key === 'done' ? pill('critical', 'finished') : phasePill(bannerSeries)}` : '<span class="na">no series matched by name</span>'}</dd>
        </dl>
      </div>
    </section>
    <section class="section"><h2>Up Next</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Series</th><th>Card dates</th><th>Place</th><th>Prize</th><th>State</th></tr></thead>
        <tbody>${c.upNext
          .map((u, i) => {
            const s = d.series.find((x) => x.href === u.href)
            return `<tr><td>${i + 1}</td><td><div class="name">${tour(u.tour)} ${s ? seriesLink(s) : esc(u.name)}</div></td><td class="nowrap">${esc(u.dates)}${s && s.dates !== u.dates ? ` <span class="no" title="row says ${esc(s.dates)}">≠ row</span>` : ''}</td><td>${esc(u.place)}</td><td>${esc(u.prize || '')}</td><td>${s ? (s.phase.key === 'upcoming' ? phasePill(s) : pill('critical', s.phase.key === 'live' ? 'already running' : 'finished')) : pill('neutral', 'not a series')}</td></tr>`
          })
          .join('')}</tbody>
      </table></div>
      ${(() => {
        const next = d.series.filter(
          (s) => s.phase.key === 'upcoming' && s.phase.until <= d.windows.upNext && !s.upNext,
        )
        return next.length
          ? `<p class="muted" style="margin-top:10px">Starting within ${d.windows.upNext} days and not in Up Next: ${next.map(seriesLink).join(', ')}.</p>`
          : ''
      })()}
    </section>
    <section class="section"><h2>Room strip</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Room</th><th>Logo</th><th>Icon</th><th>Mono</th><th>Brand</th><th class="num">Series</th><th>Website</th></tr></thead>
        <tbody>${c.tours
          .map(
            (t) => `<tr>
            <td>${tour(t.code)} ${esc(t.label)}</td>
            <td><div class="logo-cell">${t.logoOk ? `<img class="${t.brand?.logo === 'light' ? 'on-dark' : ''}" src="${esc(t.logoSrc)}" alt="">` : ''}${check(t.logoOk, '', t.logoSrc)}</div></td>
            <td><div class="logo-cell">${t.iconOk ? `<img src="${esc(t.iconSrc)}" alt="" style="background:${esc(t.brand?.iconBg || '')}">` : ''}${check(t.iconOk, '', t.iconSrc)}</div></td>
            <td><div class="logo-cell">${t.monoOk ? `<img class="on-dark" src="${esc(t.monoSrc)}" alt="">` : ''}${check(t.monoOk, '', t.monoSrc)}</div></td>
            <td>${t.brand ? `<span class="tag" style="color:${esc(t.brand.primary)}">${esc(t.brand.primary)}</span><span class="tag" style="color:${esc(t.brand.secondary)}">${esc(t.brand.secondary)}</span>` : '<span class="no">✗ no profile</span>'}</td>
            <td class="num">${t.series}</td>
            <td>${external(t.website, host(t.website))}</td>
          </tr>`,
          )
          .join('')}</tbody>
      </table></div>
    </section>`
}

function dataView() {
  const d = state.data
  const posters = d.series.filter((s) => s.poster)
  const claimed = new Set(posters.map((s) => s.dataFile).filter(Boolean))
  const orphanFiles = d.dataFiles.filter((f) => !claimed.has(f))
  return `
    ${pageHead('Schedules & data', `The schedules on the site against the files in <code>data/</code>, and the calendar against the series records of ${esc(d.scrapedAt || '?')}.`)}
    <section class="section"><h2>Schedules on the site</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Series</th><th>Content file</th><th class="num">Rows</th><th class="num">Featured</th><th>Data file</th><th>Key art</th></tr></thead>
        <tbody>${
          posters
            .map(
              (s) =>
                `<tr><td><div class="name">${tour(s.tour)} ${seriesLink(s)}</div></td><td><code>${esc(s.contentFile)}</code></td><td class="num">${s.scheduleRows}</td><td class="num">${s.featuredRows}</td><td>${check(Boolean(s.dataFile), `data/${s.dataFile}`, 'none')}</td><td>${s.imageSrc ? check(s.imageExists, s.imageSrc, 'missing') : '<span class="na">none</span>'}</td></tr>`,
            )
            .join('') ||
          '<tr><td colspan="6" class="empty">No hand-built schedule pages yet.</td></tr>'
        }</tbody>
      </table></div>
      ${orphanFiles.length ? `<p class="no" style="margin-top:10px">Data files with no poster page: ${orphanFiles.map((f) => `<code>data/${esc(f)}</code>`).join(', ')}.</p>` : ''}
    </section>
    <section class="section"><h2>Calendar rows against the series records</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Series</th><th>Row dates</th><th>Record dates</th><th>Record title</th><th>Match</th></tr></thead>
        <tbody>${d.series
          .map(
            (s) =>
              `<tr class="row--${s.phase.key}"><td><div class="name">${tour(s.tour)} ${seriesLink(s)}</div></td><td class="nowrap">${esc(s.start)} → ${esc(s.end)}</td><td class="nowrap">${s.scraped ? `${esc(s.scraped.start)} → ${esc(s.scraped.end)}` : '<span class="na">–</span>'}</td><td>${s.scraped ? esc(s.scraped.title) : `<span class="na">operator site: ${esc(host(s.source))}</span>`}</td><td>${s.scraped ? check(s.scrapeDatesMatch, 'match', 'differ') : pill('muted', 'operator')}</td></tr>`,
          )
          .join('')}</tbody>
      </table></div>
    </section>
    <section class="section"><h2>In the records, not on the calendar</h2>
      ${
        d.unlisted.length
          ? `<div class="table-wrap"><table><thead><tr><th>Listing</th><th>Dates</th><th>Organiser</th><th>Venue</th></tr></thead><tbody>${d.unlisted.map((u) => `<tr><td>${esc(u.title)}</td><td class="nowrap">${esc(u.start)} → ${esc(u.end)}</td><td>${esc(u.organiser)}</td><td>${esc(u.venue)}</td></tr>`).join('')}</tbody></table></div>`
          : '<p class="muted">Every recorded series is on the calendar.</p>'
      }
    </section>`
}

function contactsView() {
  const d = state.data
  const roomFor = (o) => d.rooms.find((r) => r.brands?.includes(o.brand))
  const card = (o) => {
    const r = roomFor(o)
    // The records list every page they saw; one link per site is enough here.
    const sites = [...new Map((o.websites || []).map((w) => [host(w), w])).values()]
    const logo = r?.logo.tile.ok
      ? `<a class="contact-card__logo" href="#rooms/${esc(r.code)}" style="background:${esc(markBg(r))}"><img src="${esc(r.logo.tile.src)}" alt=""></a>`
      : `<div class="contact-card__logo contact-card__logo--none">${esc(o.brand)}</div>`
    return `<section class="card contact-card">
      ${logo}
      <h3>${r ? `<a href="#rooms/${esc(r.code)}">${esc(r.name)}</a>` : esc(o.brand)}</h3>
      <dl class="kv">
        ${r && r.name !== o.brand ? `<dt>Brand</dt><dd>${esc(o.brand)}</dd>` : ''}
        <dt>Listed as</dt><dd>${esc((o.organiser_names || []).join(', '))}</dd>
        ${o.email?.length ? `<dt>Email</dt><dd>${o.email.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>')}</dd>` : ''}
        ${o.phone?.length ? `<dt>Phone</dt><dd>${esc(o.phone.join(' · '))}</dd>` : ''}
        ${sites.length ? `<dt>Web</dt><dd>${sites.map((w) => external(w, host(w))).join('<br>')}</dd>` : ''}
      </dl>
    </section>`
  }
  return `
    ${pageHead('Contacts', "Organisers as listed on each series record. Click a logo for the room's full profile.")}
    <div class="grid grid--3 grid--even">${d.organisers.map(card).join('')}</div>`
}

// ---------------------------------------------------------------------------
// Router, data, render

const ALIAS = { jobs: 'todo', months: 'calendar' }

function route() {
  const [page, ...rest] = location.hash.replace(/^#/, '').split('/')
  return { page: ALIAS[page] || page || 'overview', param: rest.join('/') }
}

function renderNav() {
  const { page } = route()
  const c = state.data?.counts
  const badges = {
    todo:
      c &&
      `<span class="badge ${c.jobs.now ? 'badge--critical' : ''}">${c.jobs.now + c.jobs.soon + c.jobs.later}</span>`,
    series: c && `<span class="badge">${c.series}</span>`,
    rooms: c && `<span class="badge">${state.data.rooms.length}</span>`,
    stories: draftBadge('stories'),
    shorts: draftBadge('shorts'),
    enquiries: (() => {
      const open = openEnquiries().length
      return open ? `<span class="badge badge--warning">${open}</span>` : ''
    })(),
  }
  document.getElementById('nav').innerHTML = NAV.map(
    (group) =>
      `<div class="nav__group">${group.title ? `<p class="nav__title">${esc(group.title)}</p>` : ''}${group.items
        .map(
          ([key, label]) =>
            `<a href="#${key}" class="${page === key ? 'active' : ''}">${esc(label)}${badges[key] || ''}</a>`,
        )
        .join('')}</div>`,
  ).join('')
}

function render() {
  renderNav()
  const main = document.getElementById('main')
  if (state.error) {
    main.innerHTML = `<p class="error">${esc(state.error)}</p>`
    return
  }
  if (!state.data) {
    main.innerHTML = '<p class="loading">Loading…</p>'
    return
  }
  const { page, param } = route()
  // An open editor owns the page: the minute refresh must not redraw it under
  // the editor's hands (TinyMCE state, unsaved fields).
  if (editorOpen(page, param)) return
  const views = {
    overview,
    todo: todoView,
    calendar: monthsView,
    series: () => (param ? seriesDetail(param) : seriesView()),
    rooms: () => (param ? roomDetail(param) : roomsView()),
    enquiries: enquiriesView,
    traffic: trafficView,
    home: homeView,
    'calendar-page': calendarPageView,
    data: dataView,
    contacts: contactsView,
    stories: () => publishView('stories', param),
    shorts: () => publishView('shorts', param),
  }
  main.innerHTML = (views[page] || overview)()
  if (page !== 'calendar') main.scrollTop = 0
  if (page === 'series' && !param) bindFilters()
  if (page === 'rooms' && !param) bindRooms()
  if (page === 'calendar') bindMonths()
  if (page === 'enquiries') bindEnquiries()
  if (page === 'traffic') bindTraffic()
  if (page === 'stories' || page === 'shorts') bindPublish(page, param)
  document.getElementById('meta').textContent =
    `Refreshed ${new Date(state.data.generatedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
}

function bindFilters() {
  const set = (key, value) => {
    state.filters[key] = value
    render()
    const el = document.getElementById(`f-${key}`)
    if (el && key === 'q') {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }
  document.getElementById('f-q').addEventListener('input', (e) => set('q', e.target.value))
  document.getElementById('f-tour').addEventListener('change', (e) => set('tour', e.target.value))
  document.getElementById('f-phase').addEventListener('change', (e) => set('phase', e.target.value))
  document.getElementById('f-needs').addEventListener('change', (e) => set('needs', e.target.value))
}

async function getJson(url) {
  const res = await fetch(url)
  if (res.status === 401) {
    // The session cookie has expired or the password changed: the server
    // answers the page URL with the sign-in page.
    location.replace('./')
    throw new Error('signed out')
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function loadTraffic() {
  state.traffic = await getJson(`api/traffic?days=${state.trafficDays}`)
}

async function load() {
  try {
    const [data, inbox] = await Promise.all([
      getJson('api/status'),
      getJson('api/enquiries'),
      loadTraffic(),
      loadPublish(),
    ])
    state.data = data
    state.inbox = inbox.enquiries
    state.error = ''
    document.getElementById('logout').hidden = !data.auth
    const site = document.getElementById('site-link')
    site.href = data.site || '/'
  } catch (error) {
    if (error.message !== 'signed out')
      state.error = `Could not load the dashboard.\n${error.message}`
  }
  render()
}

document.getElementById('main').addEventListener('click', (e) => {
  const handled = e.target.closest('button[data-handled]')
  if (handled) {
    setHandled(handled.closest('.enquiry').dataset.id, handled.dataset.handled === 'true')
    return
  }
  const row = e.target.closest('tr.clickable')
  if (row && !e.target.closest('a')) location.hash = row.dataset.href
})
document.getElementById('refresh').addEventListener('click', load)
// Set while putting the hash back after the editor chose to stay, so that
// restoring it does not ask again.
let restoringHash = false
window.addEventListener('hashchange', (e) => {
  if (restoringHash) {
    restoringHash = false
    return
  }
  if (!mayLeaveEditor()) {
    restoringHash = true
    location.hash = new URL(e.oldURL).hash
    return
  }
  state.months.scrolled = false
  leaveEditor()
  render()
})

load()
// Content edits and new enquiries show up without a click: re-read every minute.
setInterval(() => {
  if (document.visibilityState === 'visible') load()
}, 60000)
