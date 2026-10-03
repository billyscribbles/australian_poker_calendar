import SEO from '../lib/seo.jsx'
import { breadcrumbLd } from '../lib/structuredData.js'
import { getRuntimeContent } from '../lib/runtimeContent.js'
import { stories } from '../content/stories.js'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { StoryCard } from '../components/Stories.jsx'
import './StoriesPage.css'

/** /stories: every published story, newest first. */
export default function StoriesPage() {
  const published = getRuntimeContent().stories
  const trail = [
    { name: 'Home', path: '/' },
    { name: stories.heading, path: stories.path },
  ]
  return (
    <main className="stories-page">
      <SEO
        title={stories.index.title}
        description={stories.index.description}
        path={stories.path}
        jsonLd={breadcrumbLd(trail)}
      />
      <header className="stories-page__head container">
        <Breadcrumbs items={trail} />
        <h1 className="stories-page__title">{stories.index.title}</h1>
        <p className="stories-page__intro">{stories.index.intro}</p>
      </header>
      <div className="container">
        <h2 className="sr-only">{stories.index.listHeading}</h2>
        {published.length > 0 ? (
          <ul className="stories__grid">
            {published.map((story) => (
              <StoryCard key={story.slug} story={story} />
            ))}
          </ul>
        ) : (
          <p className="stories-page__empty">{stories.index.empty}</p>
        )}
      </div>
    </main>
  )
}
