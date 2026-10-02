import { featuredNews } from '../content/featuredNews.js'
import ArticleLink from './ArticleLink.jsx'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionHeading from './SectionHeading.jsx'
import { Badge } from './Badge.jsx'
import './FeaturedNews.css'

/** @typedef {import('../content/featuredNews.js').HeroArticle} HeroArticle */
/** @typedef {import('../content/featuredNews.js').Article} Article */

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

/** Featured News: one hero article beside a list of five. */
export default function FeaturedNews() {
  return (
    <section className="featured-news" aria-labelledby="featured-news-heading">
      <SectionHeading id="featured-news-heading">{featuredNews.heading}</SectionHeading>
      <div className="featured-news__grid">
        <FeaturedArticle article={featuredNews.hero} />
        <ul className="article-list">
          {featuredNews.items.map((article) => (
            <ArticleRow key={article.href} article={article} />
          ))}
        </ul>
      </div>
    </section>
  )
}
