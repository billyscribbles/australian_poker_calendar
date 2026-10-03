// Rebuilds body HTML from an allowlist. The dashboard's editor (TinyMCE)
// writes the body; this runs on every save so nothing but article markup is
// ever stored, whatever the editor, a paste, or a hand-edited request sent.
// No dependencies: a small tokenizer over tags, comments and text.
//
// Policy, in one place:
//   - allowed tags are kept (with allowed attributes only); block-level
//     containers that are not allowed (div, span, font...) are unwrapped;
//     script, style, iframe and the like are removed with their contents
//   - href: http(s), mailto, same-site path or fragment; external links open
//     in a new tab with rel="noopener noreferrer"
//   - src: a /media/ file only (the CSP's img-src 'self' would block anything else)
//   - style: exactly one text-align rule, nothing else
//   - width/height/colspan/rowspan: digits only
//   - output is balanced: open tags are closed at the end, stray closers go

const ALLOWED = new Set([
  'p',
  'h2',
  'h3',
  'h4',
  'strong',
  'em',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'img',
  'figure',
  'figcaption',
  'br',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'pre',
  'code',
  'sub',
  'sup',
])
const VOID = new Set(['br', 'hr', 'img'])
// Their contents are not text to keep.
const DROP_WITH_CONTENT = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'svg',
  'math',
  'title',
  'head',
])

const ATTRS = {
  a: ['href'],
  img: ['src', 'alt', 'width', 'height'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
}
const STYLE_OK = ['p', 'h2', 'h3', 'h4', 'figure', 'th', 'td', 'li', 'blockquote']

const MEDIA_SRC = /^\/media\/[a-z0-9]+\.[a-z0-9]+$/
const HREF_OK = /^(https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|\/(?!\/)[^\s"'<>]*|#[^\s"'<>]*)$/
const TEXT_ALIGN = /^\s*text-align\s*:\s*(left|right|center|justify)\s*;?\s*$/i
const DIGITS = /^\d+$/

// A tag runs to the first ">" outside a quoted attribute value.
const TOKEN =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[a-zA-Z](?:"[^"]*"|'[^']*'|[^>"'])*>|<[^a-zA-Z/!][^<]*|[^<]+|</g
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

function escapeText(text) {
  // Keep entities TinyMCE wrote (&amp; &nbsp; &#169;) and escape everything else.
  return text
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, '&quot;')
}

function parseTag(raw) {
  const m = raw.match(/^<(\/?)([a-zA-Z][a-zA-Z0-9]*)([\s\S]*?)\/?>$/)
  if (!m) return null
  const attrs = {}
  for (const a of m[3].matchAll(ATTR)) {
    attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? ''
  }
  return { closing: m[1] === '/', name: m[2].toLowerCase(), attrs }
}

function cleanAttrs(name, attrs) {
  const out = []
  for (const key of ATTRS[name] || []) {
    if (!(key in attrs)) continue
    const value = attrs[key].trim()
    if (key === 'href') {
      if (!HREF_OK.test(value)) continue
      out.push(`href="${escapeAttr(value)}"`)
      if (/^https?:\/\//.test(value)) out.push('target="_blank"', 'rel="noopener noreferrer"')
    } else if (key === 'src') {
      if (MEDIA_SRC.test(value)) out.push(`src="${escapeAttr(value)}"`)
    } else if (key === 'alt') {
      out.push(`alt="${escapeAttr(attrs[key])}"`)
    } else if (DIGITS.test(value)) {
      out.push(`${key}="${value}"`)
    }
  }
  if (STYLE_OK.includes(name) && 'style' in attrs) {
    const m = attrs.style.match(TEXT_ALIGN)
    if (m) out.push(`style="text-align: ${m[1].toLowerCase()};"`)
  }
  return out.length ? ` ${out.join(' ')}` : ''
}

/**
 * @param {unknown} html  anything; non-strings read as empty
 * @returns {string} balanced HTML containing only allowed markup
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string' || !html) return ''
  const out = []
  const open = [] // allowed tags currently open, innermost last
  let dropping = null // tag name whose contents are being skipped

  for (const token of html.match(TOKEN) || []) {
    if (dropping) {
      const tag = token[0] === '<' ? parseTag(token) : null
      if (tag && tag.closing && tag.name === dropping) dropping = null
      continue
    }
    if (token[0] !== '<') {
      out.push(escapeText(token))
      continue
    }
    if (token.startsWith('<!')) continue // comments, doctypes, CDATA
    const tag = parseTag(token)
    if (!tag) {
      out.push(escapeText(token)) // a lone "<" or "<3"
      continue
    }
    if (DROP_WITH_CONTENT.has(tag.name)) {
      if (!tag.closing) dropping = tag.name
      continue
    }
    if (!ALLOWED.has(tag.name)) continue // unwrap: drop the tag, keep its contents
    if (VOID.has(tag.name)) {
      if (!tag.closing) out.push(`<${tag.name}${cleanAttrs(tag.name, tag.attrs)} />`)
      continue
    }
    if (tag.closing) {
      const at = open.lastIndexOf(tag.name)
      if (at === -1) continue // a closer with no opener
      while (open.length > at) out.push(`</${open.pop()}>`)
      continue
    }
    out.push(`<${tag.name}${cleanAttrs(tag.name, tag.attrs)}>`)
    open.push(tag.name)
  }
  while (open.length) out.push(`</${open.pop()}>`)
  return out.join('')
}
