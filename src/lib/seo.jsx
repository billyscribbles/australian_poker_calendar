import { Helmet } from 'react-helmet-async'
import { site } from '../config/site.config.js'

// Organization structured data — built once from site.config so search engines
// get a machine-readable brand record. Becomes LocalBusiness automatically when
// a contact address/phone is present.
const organizationLd = (() => {
  // A bare platform root (https://www.facebook.com/) is a placeholder, not a
  // profile; listing it as sameAs would tell Google the brand IS Facebook.
  const sameAs = Object.values(site.social || {}).filter(
    (url) => url && new URL(url).pathname !== '/',
  )
  const hasLocation = Boolean(site.contact?.location || site.contact?.phone)
  const schema = {
    '@context': 'https://schema.org',
    '@type': hasLocation ? 'LocalBusiness' : 'Organization',
    name: site.brand.name,
    url: site.seo.siteUrl,
    description: site.seo.description,
  }
  if (site.brand.logoSrc) schema.logo = `${site.seo.siteUrl}${site.brand.logoSrc}`
  if (sameAs.length) schema.sameAs = sameAs
  if (site.contact?.email) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: site.contact.email,
      ...(site.contact.phone && { telephone: site.contact.phone }),
    }
  }
  return JSON.stringify(schema)
})()

// Per-page SEO wrapper. Pass `title` and `description` to override defaults.
// All other tags fall back to site.config.seo.
//
// `noindex` (per page, e.g. the 404) or VITE_NOINDEX=true (whole build, e.g.
// staging — see docs/ENVIRONMENTS.md) emits <meta name="robots" noindex>.
//
// `jsonLd` is the page's own structured data (one object or an array; see
// lib/structuredData.js), emitted alongside the Organization record every
// page carries.
export default function SEO({
  title,
  description,
  image,
  path = '',
  noindex = false,
  jsonLd = null,
}) {
  const seo = site.seo
  const resolvedTitle = title ? seo.titleTemplate.replace('%s', title) : seo.defaultTitle
  const resolvedDescription = description || seo.description
  // Open Graph and Twitter want an absolute image URL. Facebook, LinkedIn and
  // iMessage drop a root-relative one and render a blank card.
  const rawImage = image || seo.ogImage
  const resolvedImage = /^https?:/i.test(rawImage) ? rawImage : `${seo.siteUrl}${rawImage}`
  const url = `${seo.siteUrl}${path}`
  const blockRobots = noindex || import.meta.env.VITE_NOINDEX === 'true'
  const pageLd = (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean)
  // The brand card's size and alt. A page's own `image` has neither, and the
  // unfurlers measure it themselves.
  const isBrandImage = rawImage === seo.ogImage
  const { googleSiteVerification, bingSiteVerification } = site.integrations

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {blockRobots && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={resolvedImage} />
      {isBrandImage && <meta property="og:image:width" content={String(seo.ogImageWidth)} />}
      {isBrandImage && <meta property="og:image:height" content={String(seo.ogImageHeight)} />}
      {isBrandImage && <meta property="og:image:alt" content={seo.ogImageAlt} />}
      <meta property="og:locale" content={seo.locale} />
      <meta property="og:site_name" content={site.brand.name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedImage} />
      {googleSiteVerification && (
        <meta name="google-site-verification" content={googleSiteVerification} />
      )}
      {bingSiteVerification && <meta name="msvalidate.01" content={bingSiteVerification} />}
      <script type="application/ld+json">{organizationLd}</script>
      {pageLd.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}
