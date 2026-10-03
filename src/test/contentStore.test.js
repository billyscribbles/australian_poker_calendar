// Contract: stories and shorts live under DATA_DIR beside the enquiries,
// drafts never reach the site, slugs are URL-safe and locked once published,
// and a delete takes the record's own media with it.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore } from '../../server/store.mjs'
import { createContentStore, slugify } from '../../server/content.mjs'

let dir, content
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'apc-content-'))
  content = createContentStore({ dir })
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const media = (name) => {
  mkdirSync(content.mediaDir, { recursive: true })
  writeFileSync(join(content.mediaDir, name), 'x')
  return `/media/${name}`
}

describe('slugify', () => {
  it('makes URL-safe slugs and never an empty one', () => {
    expect(slugify('The River Card That Changed Everything!')).toBe(
      'the-river-card-that-changed-everything',
    )
    expect(slugify("  Aussie Millions: what's next?  ")).toBe('aussie-millions-whats-next')
    expect(slugify('???')).toBe('')
    expect(slugify('🃏')).toBe('')
    expect(slugify('a'.repeat(120))).toHaveLength(80)
  })
})

describe('stories', () => {
  it('creates a draft with a slug from the title, and suffixes a clash', () => {
    const a = content.addStory({ title: 'Big Night at Crown' })
    expect(a).toMatchObject({
      slug: 'big-night-at-crown',
      status: 'draft',
      title: 'Big Night at Crown',
    })
    expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(a.id).toMatch(/^[a-z0-9]+$/)
    const b = content.addStory({ title: 'Big Night at Crown' })
    expect(b.slug).toBe('big-night-at-crown-2')
    const c = content.addStory({ title: '???' })
    expect(c.slug).toBe('story')
    expect(content.addStory({}).slug).toBe('story-2')
    // Newest first for the dashboard: the last one added leads the list.
    expect(content.listStories()[0].slug).toBe('story-2')
    expect(createContentStore({ dir }).listStories()).toHaveLength(4)
  })

  it('updates text fields, clips them, sanitises the body and ignores junk', () => {
    const { id } = content.addStory({ title: 'Draft' })
    const hero = media('h1.webp')
    const updated = content.updateStory(id, {
      title: 'New title',
      standfirst: 'One line.',
      body: '<p>Hi</p><script>x()</script>',
      heroImage: hero,
      heroThumb: '/media/../etc',
      heroAlt: 'Alt',
      date: '2026-10-05',
      status: 'published',
      id: 'hacked',
      slug: 'Custom Slug!',
    })
    expect(updated).toMatchObject({
      id,
      title: 'New title',
      standfirst: 'One line.',
      body: '<p>Hi</p>',
      heroImage: hero,
      heroAlt: 'Alt',
      date: '2026-10-05',
      status: 'draft',
      slug: 'custom-slug',
    })
    expect(updated.heroThumb).toBe('')
    expect(content.updateStory(id, { date: 'yesterday' }).date).toBe('2026-10-05')
    expect(content.updateStory(id, { title: 'x'.repeat(300) }).title).toHaveLength(200)
    expect(content.updateStory('nope', { title: 'x' })).toBeNull()
    expect(content.getStory(id).updatedAt >= content.getStory(id).createdAt).toBe(true)
  })

  it('refuses to publish without a title and hero, then publishes and locks the slug', () => {
    const { id } = content.addStory({})
    expect(content.publishStory(id)).toEqual({ missing: ['title', 'heroImage'] })
    content.updateStory(id, {
      title: 'Ready',
      heroImage: media('a.webp'),
      heroThumb: media('b.webp'),
    })
    const { record } = content.publishStory(id)
    expect(record.status).toBe('published')
    expect(record.publishedAt).toBeTruthy()
    expect(content.updateStory(id, { slug: 'changed' }).slug).toBe('ready')
    expect(content.getStoryBySlug('ready').id).toBe(id)
    expect(content.unpublishStory(id).status).toBe('draft')
    expect(content.publishStory('nope')).toBeNull()
  })

  it('bumps the version on every write and not on reads', () => {
    const v0 = content.version
    const { id } = content.addStory({ title: 'A' })
    expect(content.version).toBe(v0 + 1)
    content.listStories()
    content.getStory(id)
    content.publicContent()
    expect(content.version).toBe(v0 + 1)
    content.updateStory(id, { title: 'B' })
    expect(content.version).toBe(v0 + 2)
  })

  it('deletes a story and its own media only', () => {
    const hero = media('hero.webp')
    const thumb = media('thumb.webp')
    const shared = media('inline.webp')
    const { id } = content.addStory({ title: 'Gone', heroImage: hero, heroThumb: thumb })
    content.updateStory(id, { body: `<p><img src="${shared}" alt="" /></p>` })
    expect(content.deleteStory(id)).toBe(true)
    expect(content.deleteStory(id)).toBe(false)
    expect(content.getStory(id)).toBeNull()
    expect(existsSync(join(content.mediaDir, 'hero.webp'))).toBe(false)
    expect(existsSync(join(content.mediaDir, 'thumb.webp'))).toBe(false)
    expect(existsSync(join(content.mediaDir, 'inline.webp'))).toBe(true)
  })
})

describe('shorts', () => {
  it('needs a title, video and poster to publish, keeps duration as a number', () => {
    const { id } = content.addShort({ title: 'Clip', duration: '34.6' })
    expect(content.getShort(id).duration).toBe(35)
    expect(content.publishShort(id)).toEqual({ missing: ['video', 'poster'] })
    content.updateShort(id, { video: media('v.mp4'), poster: media('p.webp'), duration: -3 })
    expect(content.getShort(id).duration).toBe(0)
    expect(content.publishShort(id).record.status).toBe('published')
    expect(content.getShortBySlug('clip').id).toBe(id)
    expect(content.deleteShort(id)).toBe(true)
    expect(existsSync(join(content.mediaDir, 'v.mp4'))).toBe(false)
  })
})

describe('publicContent', () => {
  it('returns published records only, in the site shape, newest first', () => {
    const s1 = content.addStory({ title: 'Older', date: '2026-09-01', heroImage: media('1.webp') })
    const s2 = content.addStory({ title: 'Newer', date: '2026-10-01', heroImage: media('2.webp') })
    content.addStory({ title: 'Draft', date: '2026-12-01', heroImage: media('3.webp') })
    content.publishStory(s1.id)
    content.publishStory(s2.id)
    const sh = content.addShort({
      title: 'Clip',
      video: media('v.webm'),
      poster: media('p.webp'),
      duration: 12,
    })
    content.publishShort(sh.id)
    const pub = content.publicContent()
    expect(pub.stories.map((s) => s.title)).toEqual(['Newer', 'Older'])
    expect(pub.stories[0]).toEqual({
      slug: 'newer',
      href: '/stories/newer',
      title: 'Newer',
      date: '2026-10-01',
      standfirst: '',
      heroImage: '/media/2.webp',
      heroThumb: '',
      heroAlt: 'Newer',
      body: '',
      publishedAt: expect.any(String),
      updatedAt: expect.any(String),
    })
    expect(pub.shorts).toEqual([
      {
        slug: 'clip',
        title: 'Clip',
        video: '/media/v.webm',
        poster: '/media/p.webp',
        duration: 12,
        publishedAt: expect.any(String),
      },
    ])
  })
})

describe('store wiring', () => {
  it('exposes the content store on createStore()', () => {
    const store = createStore({ dir })
    expect(store.content.mediaDir).toBe(join(dir, 'media'))
    expect(store.content.listStories()).toEqual([])
    const draft = store.content.addStory({ title: 'Draft' })
    expect(store.content.toPublicStory(draft)).toMatchObject({
      slug: 'draft',
      href: '/stories/draft',
    })
  })
})
