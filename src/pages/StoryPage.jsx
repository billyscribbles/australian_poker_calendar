import { Link, useParams } from 'react-router-dom'
import SEO from '../lib/seo.jsx'
import { articleLd, breadcrumbLd } from '../lib/structuredData.js'
import { getRuntimeContent } from '../lib/runtimeContent.js'
import { formatLongDate } from '../lib/dates.js'
import { stories } from '../content/stories.js'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import Img from '../components/Img.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { StoryCard } from '../components/Stories.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import './StoryPage.css'

/**
 * /stories/<slug>: one published story. Rendered at request time by
 * server/render.mjs from lib/runtimeContent.js, never at build time; an
 * unknown slug is the 404 page (the server never renders one, so this branch
 * is for client-side navigation).
 */
export default function StoryPage() {
  const { slug } = useParams()
  const published = getRuntimeContent().stories
  const story = published.find((s) => s.slug === slug)
  if (!story) return <NotFoundPage />

  const more = published.filter((s) => s.slug !== slug).slice(0, 3)
  const trail = [
    { name: 'Home', path: '/' },
    { name: stories.heading, path: stories.path },
    { name: story.title, path: story.href },
  ]

  return (
    <main className="story-page">
      <SEO
        title={story.title}
        description={story.standfirst || undefined}
        image={story.heroImage}
        path={story.href}
        type="article"
        jsonLd={[breadcrumbLd(trail), articleLd(story)]}
      />
      <article className="story container">
        <Breadcrumbs items={trail} />
        <header className="story__head">
          <span className="section-eyebrow">{stories.page.eyebrow}</span>
          <h1 className="story__title">{story.title}</h1>
          <time className="story__date" dateTime={story.date}>
            {formatLongDate(story.date)}
          </time>
          {story.standfirst && <p className="story__standfirst">{story.standfirst}</p>}
        </header>
        <Img
          src={story.heroImage}
          alt={story.heroAlt}
          width={1600}
          height={900}
          priority
          className="story__hero"
        />
        {/* The body is TinyMCE output, rebuilt from an allowlist by server/sanitize.mjs on every save. */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: story.body }} />
        <p className="story__back">
          <Link to={stories.path}>← {stories.page.back}</Link>
        </p>
      </article>
      {more.length > 0 && (
        <section className="container story-more" aria-labelledby="story-more">
          <SectionHeading id="story-more">{stories.page.more}</SectionHeading>
          <ul className="stories__grid">
            {more.map((s) => (
              <StoryCard key={s.slug} story={s} />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
