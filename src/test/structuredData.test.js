// Contract: the JSON-LD a page emits is built from the content it renders,
// carries the fields Google's event rich result reads, and maps the calendar's
// status codes onto schema.org event statuses.
import { describe, it, expect } from 'vitest'
import { websiteLd, eventLd, eventListLd } from '../lib/structuredData.js'
import { eventFor } from '../content/eventPages.js'
import { festivals } from '../content/festivals.js'
import { festivalsInYear } from '../lib/calendar.js'
import { calendarPage } from '../content/calendarPage.js'
import { site } from '../config/site.config.js'

describe('websiteLd', () => {
  it('names the site, its URL and the names people search it by', () => {
    const ld = websiteLd()
    expect(ld['@type']).toBe('WebSite')
    expect(ld.name).toBe(site.brand.name)
    expect(ld.url).toBe(site.seo.siteUrl)
    expect(ld.alternateName).toEqual(site.seo.alternateNames)
  })
})

describe('eventLd', () => {
  it('builds a schema.org Event from a hand-built page', () => {
    const event = eventFor('/events/aurum-sydney-showdown')
    const ld = eventLd(event)
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Event')
    expect(ld.name).toBe(event.title)
    expect(ld.startDate).toBe('2026-10-01')
    expect(ld.endDate).toBe('2026-10-19')
    expect(ld.url).toBe(`${site.seo.siteUrl}/events/aurum-sydney-showdown`)
    expect(ld.eventStatus).toBe('https://schema.org/EventScheduled')
    expect(ld.location.name).toBe('Aurum Poker Grand')
    expect(ld.location.address.addressLocality).toBe('Sydney')
    expect(ld.location.address.addressCountry).toBe('AU')
    expect(ld.image).toMatch(/^https?:\/\/.+\.webp$/)
    expect(ld.organizer.name).toBe('Aurum Poker')
    expect(ld.description).toBe(event.seo.description)
  })

  it('builds the same shape from a derived page', () => {
    const event = eventFor('/events/aplpt-albury')
    const ld = eventLd(event)
    expect(ld.name).toBe(event.title)
    expect(ld.location.address.addressLocality).toBe('Albury')
    expect(ld.organizer.url).toBe(event.website)
    expect(ld.image).toBeUndefined()
  })

  it('maps the calendar status codes onto schema.org statuses', () => {
    const base = eventFor('/events/aplpt-albury')
    expect(eventLd({ ...base, statusCode: 'cancelled' }).eventStatus).toBe(
      'https://schema.org/EventCancelled',
    )
    expect(eventLd({ ...base, statusCode: 'postponed' }).eventStatus).toBe(
      'https://schema.org/EventPostponed',
    )
    expect(eventLd({ ...base, statusCode: 'moved' }).eventStatus).toBe(
      'https://schema.org/EventRescheduled',
    )
  })

  it('every festival on the calendar resolves to a page with a valid Event', () => {
    for (const festival of festivals) {
      const ld = eventLd(eventFor(festival.href))
      expect(ld.name, festival.href).toBeTruthy()
      expect(ld.startDate, festival.href).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(ld.endDate, festival.href).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(ld.location.name, festival.href).toBeTruthy()
      expect(ld.organizer, festival.href).toBeDefined()
    }
  })
})

describe('eventListLd', () => {
  it("lists the year's series as Events in start-date order", () => {
    const year = 2026
    const inYear = festivalsInYear(festivals, year)
    const ld = eventListLd(inYear, year, calendarPage.seo(year))
    expect(ld['@type']).toBe('ItemList')
    expect(ld.numberOfItems).toBe(inYear.length)
    expect(ld.url).toBe(`${site.seo.siteUrl}/poker-calendar/2026`)
    const starts = ld.itemListElement.map((li) => li.item.startDate)
    expect(starts).toEqual([...starts].sort())
    expect(ld.itemListElement[0].position).toBe(1)
    for (const li of ld.itemListElement) {
      expect(li.item['@type']).toBe('Event')
      expect(li.item['@context']).toBeUndefined()
      expect(li.item.location.address.addressLocality).toBeTruthy()
    }
  })
})

describe('breadcrumbLd', () => {
  it('numbers the trail from home and leaves the page itself unlinked', async () => {
    const { breadcrumbLd } = await import('../lib/structuredData.js')
    const ld = breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Poker in Sydney', path: '/poker/sydney' },
    ])
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.seo.siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Poker in Sydney' },
    ])
  })
})

describe('tourLd and seriesListLd', () => {
  it('describes an operator and lists its series as Events', async () => {
    const { tourLd, seriesListLd } = await import('../lib/structuredData.js')
    const { tourFor } = await import('../content/tourPages.js')
    const apl = tourFor('/tours/apl')
    const org = tourLd(apl)
    expect(org['@type']).toBe('Organization')
    expect(org.name).toBe('APL')
    expect(org.url).toBe(apl.website)
    expect(org.logo).toMatch(/^https?:\/\/.+\.webp$/)
    const list = seriesListLd(apl.series, apl)
    expect(list['@type']).toBe('ItemList')
    expect(list.url).toBe(`${site.seo.siteUrl}/tours/apl`)
    expect(list.numberOfItems).toBe(apl.series.length)
    expect(list.itemListElement.every((li) => li.item['@type'] === 'Event')).toBe(true)
  })
})
