// Series dashboard. One fetch of /api/status, rendered by hash route:
// #overview, #jobs, #series, #series/<slug>, #home, #calendar, #data, #contacts.
// Plain DOM and template strings; nothing to build.

const state = {
  data: null,
  error: '',
  today: '', // '' = real today; otherwise a YYYY-MM-DD override
  filters: { q: '', tour: '', phase: '', needs: '' },
}

const NAV = [
  ['overview', 'Overview'],
  ['jobs', 'Jobs'],
  ['series', 'Series'],
  ['home', 'Home page'],
  ['calendar', 'Calendar page'],
  ['data', 'Schedules & data'],
  ['contacts', 'Contacts'],
]

const LEVEL = {
  now: { tone: 'critical', label: 'Do now' },
  soon: { tone: 'warning', label: 'This week' },
  later: { tone: 'neutral', label: 'Later' },
}
const PHASE_TONE = { live: 'good', upcoming: 'neutral', done: 'muted' }

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
  return `<span class="tour" style="--tour:${esc(brand.primary || '')}">${esc(code)}</span>`
}
const check = (ok, text, badText = text) =>
  ok ? `<span class="ok">✓ ${esc(text)}</span>` : `<span class="no">✗ ${esc(badText)}</span>`
const seriesLink = (s) => `<a href="#series/${esc(s.slug)}">${esc(s.name)}</a>`
const bySlug = (slug) => state.data.series.find((s) => s.slug === slug)
const siteUrl = (href) => `${state.data.site}${href}`
const external = (href, text) =>
  `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`
const host = (url) => url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-AU', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

function pageHead(title, sub, crumbs = '') {
  return `<header class="page-head"><div>${crumbs ? `<p class="crumbs">${crumbs}</p>` : ''}<h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div></header>`
}

function jobsCards(jobs, { withSeries = true } = {}) {
  const groups = Object.keys(LEVEL)
    .map((level) => ({ level, jobs: jobs.filter((j) => j.level === level) }))
    .filter((g) => g.jobs.length)
  if (!groups.length) return '<p class="ok">✓ Nothing open.</p>'
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
// Views

function overview() {
  const d = state.data
  const c = d.counts
  const stat = (label, value, tone = '', sub = '') =>
    `<div class="stat ${tone ? `stat--${tone}` : ''}"><dt>${esc(label)}</dt><dd>${esc(value)}${sub ? `<small>${esc(sub)}</small>` : ''}</dd></div>`
  return `
    ${pageHead('Overview', `${c.series} series on the calendar · scrape of ${esc(d.scrapedAt || '?')}`)}
    <dl class="stats">
      ${stat('Live now', c.live, c.live ? 'good' : '')}
      ${stat('Next 30 days', c.soon)}
      ${stat('Schedules up', `${c.withSchedule}`, '', `of ${c.series}`)}
      ${stat('Do now', c.jobs.now, c.jobs.now ? 'critical' : '')}
      ${stat('This week', c.jobs.soon, c.jobs.soon ? 'warning' : '')}
      ${stat('Later', c.jobs.later)}
    </dl>
    <section class="section"><h2>Jobs</h2>${jobsCards(d.jobs)}</section>
    <section class="section"><h2>Next 120 days</h2>${timeline(120)}</section>
    <section class="section"><h2>Site slots</h2>${slotsTable()}</section>`
}

function timeline(daysAhead) {
  const d = state.data
  const DAY = 86400000
  const t0 = Date.parse(`${d.today}T00:00:00Z`) - 7 * DAY
  const t1 = t0 + (daysAhead + 7) * DAY
  const span = t1 - t0
  const pct = (ms) => (Math.min(Math.max(ms, t0), t1) - t0) / span
  const rows = d.series.filter(
    (s) => Date.parse(`${s.end}T00:00:00Z`) >= t0 && Date.parse(`${s.start}T00:00:00Z`) <= t1,
  )
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
          const left = pct(Date.parse(`${s.start}T00:00:00Z`)) * 100
          const right = pct(Date.parse(`${s.end}T00:00:00Z`) + DAY) * 100
          const brand = d.brands[s.tour] || {}
          const dark = brand.logo === 'dark' || /^#[c-fC-F]/.test(brand.primary || '')
          return `<div class="timeline__row"><a class="timeline__bar ${s.poster ? '' : 'timeline__bar--pending'} ${dark && s.poster ? 'timeline__bar--dark' : ''}" style="--tour:${esc(brand.primary || '#8e8e93')};left:${left.toFixed(2)}%;width:${(right - left).toFixed(2)}%" href="#series/${esc(s.slug)}" title="${esc(`${s.name} · ${s.dates}${s.poster ? '' : ' · no schedule yet'}`)}">${esc(s.name)}</a></div>`
        })
        .join('')}
    </div>
    <p class="meta" style="margin-top:8px">Solid bars have a schedule on the site; dashed bars are still "Coming soon". The gold line is today.</p>
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

function jobsView() {
  const d = state.data
  const total = d.jobs.length
  return `
    ${pageHead('Jobs', `${total} open · windows: chase a schedule within ${d.windows.chase} days, watch for one within ${d.windows.watch}, Up Next within ${d.windows.upNext}`)}
    ${jobsCards(d.jobs)}
    <section class="section"><h2>By series</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Series</th><th>Status</th><th>Jobs</th></tr></thead>
      <tbody>${d.series
        .filter((s) => s.jobs.length)
        .map(
          (s) => `<tr class="row--${s.phase.key}">
            <td><div class="name">${tour(s.tour)} ${seriesLink(s)}</div><div class="sub">${esc(s.dates)}</div></td>
            <td>${phasePill(s)}</td>
            <td><ul class="plain" style="margin:0;padding:0;list-style:none;display:grid;gap:4px">${s.jobs.map((j) => `<li>${levelPill(j.level)} ${esc(j.text)}</li>`).join('')}</ul></td>
          </tr>`,
        )
        .join('')}</tbody></table></div></section>`
}

function seriesView() {
  const d = state.data
  const f = state.filters
  const tours = [...new Set(d.series.map((s) => s.tour))]
  const rows = d.series.filter((s) => {
    if (f.tour && s.tour !== f.tour) return false
    if (f.phase && s.phase.key !== f.phase) return false
    if (f.needs === 'schedule' && (s.poster || s.phase.key === 'done')) return false
    if (f.needs === 'jobs' && !s.jobs.length) return false
    if (f.needs === 'art' && s.imageSrc) return false
    if (f.q && !`${s.name} ${s.place} ${s.tour}`.toLowerCase().includes(f.q.toLowerCase()))
      return false
    return true
  })
  const opt = (value, label, current) =>
    `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(label)}</option>`
  return `
    ${pageHead('Series', 'Every row in src/content/festivals.js. Click a row for the full picture.')}
    <div class="filters">
      <label class="field"><span>Search</span><input type="search" id="f-q" value="${esc(f.q)}" placeholder="name, venue, city"></label>
      <label class="field"><span>Tour</span><select id="f-tour">${opt('', 'All tours', f.tour)}${tours.map((t) => opt(t, t, f.tour)).join('')}</select></label>
      <label class="field"><span>Status</span><select id="f-phase">${opt('', 'Any', f.phase)}${opt('live', 'Live', f.phase)}${opt('upcoming', 'Upcoming', f.phase)}${opt('done', 'Finished', f.phase)}</select></label>
      <label class="field"><span>Needs</span><select id="f-needs">${opt('', 'Anything', f.needs)}${opt('schedule', 'A schedule', f.needs)}${opt('art', 'Key art', f.needs)}${opt('jobs', 'Has open jobs', f.needs)}</select></label>
      <span class="count">${rows.length} of ${d.series.length}</span>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Series</th><th>Status</th><th>Schedule</th><th>Data file</th><th>Key art</th>
        <th>Home</th><th>Calendar</th><th>Scrape</th><th class="num">Jobs</th>
      </tr></thead>
      <tbody>${
        rows
          .map(
            (s) => `<tr class="clickable row--${s.phase.key}" data-href="#series/${esc(s.slug)}">
          <td><div class="name">${tour(s.tour)} ${seriesLink(s)}</div><div class="sub">${esc(s.dates)} · ${esc(s.place)}</div></td>
          <td>${phasePill(s)}</td>
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
          .join('') || '<tr><td colspan="9" class="empty">No series match.</td></tr>'
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
      ? li(s.scrapeDatesMatch, 'Dates match the APS scrape', `Scrape says ${sc.start} to ${sc.end}`)
      : li(false, '', 'Not on the APS scrape; row taken from the operator site', 'na'),
  ].join('')

  return `
    ${pageHead(s.name, `${esc(s.dates)} · ${s.days} days · ${esc(s.place)}`, `<a href="#series">Series</a> / ${esc(s.tour)}`)}
    <div class="detail-hero">
      <div class="grid" style="gap:16px">
        <div>${tour(s.tour)} ${phasePill(s)} ${s.status ? pill('critical', s.status) : ''}</div>
        <div class="links">
          <a href="${esc(siteUrl(s.href))}" target="_blank" rel="noopener noreferrer">Open on site ↗</a>
          ${s.website ? `<a href="${esc(s.website)}" target="_blank" rel="noopener noreferrer">Operator site ↗</a>` : ''}
          ${sc ? `<a href="${esc(sc.url)}" target="_blank" rel="noopener noreferrer">APS listing ↗</a>` : ''}
          ${sc?.mapUrl ? `<a href="${esc(sc.mapUrl)}" target="_blank" rel="noopener noreferrer">Map ↗</a>` : ''}
        </div>
        <section class="card ${s.jobs.length ? `card--accent card--${LEVEL[s.jobs[0].level].tone}` : ''}">
          <h3>Jobs${s.jobs.length ? ` <span class="count">${s.jobs.length}</span>` : ''}</h3>
          ${s.jobs.length ? `<ul class="plain">${s.jobs.map((j) => `<li>${levelPill(j.level)} ${esc(j.text)}</li>`).join('')}</ul>` : '<p class="ok">✓ Nothing open for this series.</p>'}
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
        ${row('Tour', esc(s.tour))}
        ${row('Dates', `${esc(fmtDate(s.start))} – ${esc(fmtDate(s.end))}`)}
        ${row('Place', esc(s.place))}
        ${row('Path', `<code>${esc(s.href)}</code>`)}
        ${row('Content file', `<code>${esc(s.contentFile)}</code>`)}
        ${row('Source', external(s.source, host(s.source)))}
        ${row('Website', external(s.website, host(s.website)))}
      </dl></section>
      <section class="card"><h3>Contact</h3>${
        org
          ? `<dl class="kv">${row('Organiser', esc(org.name))}${row('Email', org.email ? `<a href="mailto:${esc(org.email)}">${esc(org.email)}</a>` : '')}${row('Phone', esc(org.phone || ''))}${row('Website', org.website ? external(org.website, host(org.website)) : '')}</dl>`
          : `<p class="muted">No organiser block on the scrape. Use the operator site: ${external(s.website, host(s.website))}.</p>`
      }</section>
      ${
        sc
          ? `<section class="card"><h3>APS scrape</h3><dl class="kv">
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
            ${sc.heroImage ? row('APS image', external(sc.heroImage, sc.heroImage.split('/').pop())) : ''}
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
          </dl>${m.notes?.length ? `<ul style="margin-top:10px">${m.notes.map((n) => `<li class="muted">${esc(n)}</li>`).join('')}</ul>` : ''}</section>`
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
    ${pageHead('Home page', 'The events banner: hero, two side cards and the ticker. Edit <code>src/content/events.js</code>.')}
    <section class="section"><h2>Events banner</h2>
      <div class="art-grid">
        ${card('Hero', h.hero)}
        ${h.sideEvents.map((s, i) => card(`Side card ${i + 1}`, s, pill('muted', s.status))).join('')}
      </div>
    </section>
    <section class="section"><h2>Ticker</h2>
      <p class="muted" style="margin-bottom:10px">${h.ticker.length} rows, from ${tickerSeries.map((s) => `${seriesLink(s)} ${s.phase.key === 'done' ? pill('critical', 'finished') : phasePill(s)}`).join(', ') || 'nothing'}.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Tour</th><th>Event</th><th>Date</th><th class="num">Buy-in</th><th>Guarantee / entries</th><th>Links to</th></tr></thead>
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
          : '<p class="muted">Every live series and everything starting within 30 days is already on the banner.</p>'
      }
    </section>`
}

function calendarView() {
  const d = state.data
  const c = d.calendar
  const b = c.banner
  const bannerSeries = d.series.find((s) => s.onBanner)
  return `
    ${pageHead('Calendar page', 'Tour strip, promo banner and Up Next cards. Edit <code>src/content/calendarPage.js</code>.')}
    <section class="section"><h2>Promo banner</h2>
      <div class="card">
        ${b.src && b.fileOk ? `<img class="banner-preview" src="${esc(b.src)}" alt="${esc(b.alt)}">` : `<p class="${b.src ? 'no' : 'muted'}">${b.src ? `File missing: ${esc(b.src)}` : 'Striped placeholder (no src set).'}</p>`}
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
    <section class="section"><h2>Tour strip</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Tour</th><th>Logo</th><th>Icon</th><th>Mono</th><th>Brand</th><th class="num">Series</th><th>Website</th></tr></thead>
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
    ${pageHead('Schedules & data', `Content versus the files in <code>data/</code>. Scrape of ${esc(d.scrapedAt || '?')}; re-scrape and regenerate rather than hand-editing.`)}
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
    <section class="section"><h2>Calendar rows against the scrape</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Series</th><th>Row dates</th><th>Scrape dates</th><th>Scrape title</th><th>Match</th></tr></thead>
        <tbody>${d.series
          .map(
            (s) =>
              `<tr class="row--${s.phase.key}"><td><div class="name">${tour(s.tour)} ${seriesLink(s)}</div></td><td class="nowrap">${esc(s.start)} → ${esc(s.end)}</td><td class="nowrap">${s.scraped ? `${esc(s.scraped.start)} → ${esc(s.scraped.end)}` : '<span class="na">–</span>'}</td><td>${s.scraped ? esc(s.scraped.title) : `<span class="na">operator site: ${esc(host(s.source))}</span>`}</td><td>${s.scraped ? check(s.scrapeDatesMatch, 'match', 'differ') : pill('muted', 'operator')}</td></tr>`,
          )
          .join('')}</tbody>
      </table></div>
    </section>
    <section class="section"><h2>On the scrape, not on the calendar</h2>
      ${
        d.unlisted.length
          ? `<div class="table-wrap"><table><thead><tr><th>Listing</th><th>Dates</th><th>Organiser</th><th>Venue</th></tr></thead><tbody>${d.unlisted.map((u) => `<tr><td>${external(u.url, u.title)}</td><td class="nowrap">${esc(u.start)} → ${esc(u.end)}</td><td>${esc(u.organiser)}</td><td>${esc(u.venue)}</td></tr>`).join('')}</tbody></table></div>`
          : '<p class="muted">Every scraped series is on the calendar.</p>'
      }
    </section>`
}

function contactsView() {
  const d = state.data
  return `
    ${pageHead('Contacts', 'Organisers as listed on the Australian Poker Schedule event pages.')}
    <div class="grid grid--2">${d.organisers
      .map(
        (o) => `<section class="card">
        <h3>${esc(o.brand)}</h3>
        <dl class="kv">
          <dt>Listed as</dt><dd>${esc((o.organiser_names || []).join(', '))}</dd>
          ${o.email?.length ? `<dt>Email</dt><dd>${o.email.map((e) => `<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>')}</dd>` : ''}
          ${o.phone?.length ? `<dt>Phone</dt><dd>${esc(o.phone.join(' · '))}</dd>` : ''}
          ${o.websites?.length ? `<dt>Web</dt><dd>${o.websites.map((w) => external(w, w.replace(/^https?:\/\//, ''))).join('<br>')}</dd>` : ''}
        </dl>
        <ul style="margin-top:10px" class="plain">${(o.series || [])
          .map((sr) => {
            const s = d.series.find((x) => x.scraped?.title === sr.title)
            return `<li class="muted">${esc(sr.dates)} · ${s ? seriesLink(s) : esc(sr.title)}</li>`
          })
          .join('')}</ul>
      </section>`,
      )
      .join('')}</div>`
}

// ---------------------------------------------------------------------------
// Router, data, render

function route() {
  const [page, ...rest] = location.hash.replace(/^#/, '').split('/')
  return { page: page || 'overview', param: rest.join('/') }
}

function renderNav() {
  const { page } = route()
  const c = state.data?.counts
  document.getElementById('nav').innerHTML = NAV.map(([key, label]) => {
    const badge =
      key === 'jobs' && c
        ? `<span class="badge ${c.jobs.now ? 'badge--critical' : ''}">${c.jobs.now + c.jobs.soon + c.jobs.later}</span>`
        : key === 'series' && c
          ? `<span class="badge">${c.series}</span>`
          : ''
    return `<a href="#${key}" class="${page === key ? 'active' : ''}">${esc(label)}${badge}</a>`
  }).join('')
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
  const views = {
    overview,
    jobs: jobsView,
    series: () => (param ? seriesDetail(param) : seriesView()),
    home: homeView,
    calendar: calendarView,
    data: dataView,
    contacts: contactsView,
  }
  main.innerHTML = (views[page] || overview)()
  main.scrollTop = 0
  if (page === 'series' && !param) bindFilters()
  document.getElementById('meta').textContent =
    `As of ${state.data.today}${state.today ? ' (simulated)' : ''} · refreshed ${new Date(state.data.generatedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
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

async function load() {
  try {
    const res = await fetch(`api/status${state.today ? `?today=${state.today}` : ''}`)
    if (!res.ok) throw new Error(await res.text())
    state.data = await res.json()
    state.error = ''
  } catch (error) {
    state.error = `Could not load status.\n${error.message}`
  }
  render()
}

document.getElementById('main').addEventListener('click', (e) => {
  const row = e.target.closest('tr.clickable')
  if (row && !e.target.closest('a')) location.hash = row.dataset.href
})
document.getElementById('refresh').addEventListener('click', load)
document.getElementById('today').addEventListener('change', (e) => {
  state.today = e.target.value
  document.getElementById('reset-today').hidden = !state.today
  load()
})
document.getElementById('reset-today').addEventListener('click', () => {
  state.today = ''
  document.getElementById('today').value = ''
  document.getElementById('reset-today').hidden = true
  load()
})
window.addEventListener('hashchange', render)

load()
// Content edits show up without a click: re-read every minute.
setInterval(() => {
  if (document.visibilityState === 'visible') load()
}, 60000)
