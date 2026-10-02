import { useState } from 'react'
import { Link } from 'react-router-dom'
import { featuredNews } from '../content/featuredNews.js'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import OutlineButton from './OutlineButton.jsx'
import { Badge } from './Badge.jsx'
import './FeaturedNews.css'

/** @typedef {import('../content/featuredNews.js').HeroArticle} HeroArticle */
/** @typedef {import('../content/featuredNews.js').Article} Article */

/**
 * A route link, or a new-tab anchor when the article lives on another site.
 *
 * @param {{ href: string, className: string, children: import('react').ReactNode }} props
 */
function ArticleLink({ href, className, children }) {
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  )
}

/** @param {{ article: HeroArticle }} props */
function FeaturedArticle({ article }) {
  return (
    <ArticleLink href={article.href} className="featured-article">
      <ImagePlaceholder
        variant="bold"
        labelAlign="top-left"
        label={article.imageLabel}
        className="featured-article__visual"
        src={article.imageSrc}
        width={760}
        height={420}
      />
      <div className="featured-article__overlay">
        <div className="featured-article__badges">
          {article.badges.map((badge) => (
            <Badge key={badge.label} variant={badge.variant}>
              {badge.label}
            </Badge>
          ))}
          <span className="featured-article__date">{article.date}</span>
        </div>
        <h3 className="featured-article__title">{article.title}</h3>
        <p className="featured-article__excerpt">{article.excerpt}</p>
      </div>
    </ArticleLink>
  )
}

/** @param {{ article: Article }} props */
function ArticleRow({ article }) {
  return (
    <li>
      <ArticleLink href={article.href} className="article-row">
        <ImagePlaceholder
          variant="fine"
          className="article-row__thumb"
          src={article.thumbSrc}
          width={96}
          height={64}
        />
        <div className="article-row__body">
          <div className="article-row__meta">
            {article.category} · <span className="article-row__date">{article.date}</span>
          </div>
          <h3 className="article-row__title">{article.title}</h3>
        </div>
      </ArticleLink>
    </li>
  )
}

/**
 * Featured News: one hero article beside a list. The list starts at
 * `initialCount` rows and a button reveals the rest.
 */
export default function FeaturedNews() {
  const [expanded, setExpanded] = useState(false)
  const { items, initialCount } = featuredNews
  const shown = expanded ? items : items.slice(0, initialCount)
  return (
    <section className="featured-news" aria-labelledby="featured-news-heading">
      <SectionHeading id="featured-news-heading">{featuredNews.heading}</SectionHeading>
      <div className="featured-news__grid">
        <FeaturedArticle article={featuredNews.hero} />
        <div>
          <ul className="article-list">
            {shown.map((article) => (
              <ArticleRow key={article.href} article={article} />
            ))}
          </ul>
          {!expanded && items.length > initialCount && (
            <OutlineButton onClick={() => setExpanded(true)}>{featuredNews.showMore}</OutlineButton>
          )}
        </div>
      </div>
    </section>
  )
}
