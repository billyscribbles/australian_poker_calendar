// Contract: a published story renders as a full article page (hero, date,
// title, standfirst, sanitised body, more stories) with NewsArticle data;
// an unknown slug is the 404 page; the index lists every published story.
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import StoryPage from '../pages/StoryPage.jsx'
import StoriesPage from '../pages/StoriesPage.jsx'
import { setRuntimeContent } from '../lib/runtimeContent.js'
import { articleLd } from '../lib/structuredData.js'
import { stories } from '../content/stories.js'
import { site } from '../config/site.config.js'

expect.extend(toHaveNoViolations)
afterEach(() => setRuntimeContent(null))

const story = (n, extra = {}) => ({
  slug: `story-${n}`,
  href: `/stories/story-${n}`,
  title: `Story ${n}`,
  date: '2026-10-02',
  standfirst: `Standfirst ${n}.`,
  heroImage: `/media/h${n}.webp`,
  heroThumb: `/media/t${n}.webp`,
  heroAlt: `Hero ${n}`,
  body: `<h2>Section</h2><p>Body ${n}</p>`,
  publishedAt: '2026-10-02T01:00:00.000Z',
  updatedAt: '2026-10-03T01:00:00.000Z',
  ...extra,
})

const renderAt = (path) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/stories/:slug" element={<StoryPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )

describe('StoryPage', () => {
  it('renders the article and three more stories', async () => {
    setRuntimeContent({ stories: [1, 2, 3, 4, 5].map((n) => story(n)) })
    const { container } = renderAt('/stories/story-2')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Story 2')
    expect(screen.getByText('2 October 2026')).toBeInTheDocument()
    expect(screen.getByText('Standfirst 2.')).toBeInTheDocument()
    expect(screen.getByAltText('Hero 2')).toHaveAttribute('src', '/media/h2.webp')
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeInTheDocument()
    expect(screen.getByText('Body 2')).toBeInTheDocument()
    const more = screen.getByRole('region', { name: stories.page.more })
    const links = within(more).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/stories/story-1',
      '/stories/story-3',
      '/stories/story-4',
    ])
    expect(screen.getByRole('link', { name: new RegExp(stories.page.back) })).toHaveAttribute(
      'href',
      stories.path,
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders the 404 page for an unknown or unpublished slug', () => {
    setRuntimeContent({ stories: [story(1)] })
    renderAt('/stories/nope')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found')
    expect(document.querySelector('.story')).toBeNull()
  })

  it('describes the article as NewsArticle', () => {
    const ld = articleLd(story(7))
    expect(ld).toMatchObject({
      '@type': 'NewsArticle',
      headline: 'Story 7',
      description: 'Standfirst 7.',
      datePublished: '2026-10-02',
      dateModified: '2026-10-03',
      image: [`${site.seo.siteUrl}/media/h7.webp`],
      mainEntityOfPage: `${site.seo.siteUrl}/stories/story-7`,
      publisher: { '@type': 'Organization', name: site.brand.name },
    })
    expect(articleLd(story(8, { standfirst: '', heroImage: '' }))).not.toHaveProperty('image')
  })
})

describe('StoriesPage', () => {
  it('lists every published story, or says the first is on its way', async () => {
    setRuntimeContent({ stories: [1, 2, 3].map((n) => story(n)) })
    const { container, unmount } = renderAt('/stories')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(stories.index.title)
    const cards = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href').startsWith('/stories/'))
    expect(cards).toHaveLength(3)
    expect(await axe(container)).toHaveNoViolations()
    unmount()
    setRuntimeContent(null)
    renderAt('/stories')
    expect(screen.getByText(stories.index.empty)).toBeInTheDocument()
  })
})
