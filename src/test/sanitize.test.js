// Contract: body HTML from the dashboard is rebuilt from an allowlist before
// it is stored, so nothing but article markup ever reaches a page.
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '../../server/sanitize.mjs'

describe('sanitizeHtml', () => {
  it('keeps article markup as it is', () => {
    const html =
      '<h2>Heading</h2><p>Text with <strong>bold</strong>, <em>em</em> and <a href="/poker-calendar/2026">a link</a>.</p>' +
      '<ul><li>one</li><li>two</li></ul><blockquote><p>quote</p></blockquote>' +
      '<figure><img src="/media/abc123.webp" alt="A table" width="1200" height="675" /><figcaption>Cap</figcaption></figure>' +
      '<table><thead><tr><th colspan="2">h</th></tr></thead><tbody><tr><td>a</td><td>b</td></tr></tbody></table>' +
      '<pre><code>x &lt; y</code></pre><p>H<sub>2</sub>O and x<sup>2</sup><br />line</p><hr />'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('drops scripts, styles, event handlers and javascript: links', () => {
    expect(sanitizeHtml('<p>a</p><script>alert(1)</script><p>b</p>')).toBe('<p>a</p><p>b</p>')
    expect(sanitizeHtml('<style>p{display:none}</style><p>x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<p onclick="x()">x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
    expect(sanitizeHtml('<iframe src="https://evil.example"></iframe><p>x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<!-- note --><p>x</p>')).toBe('<p>x</p>')
  })

  it('unwraps unknown wrappers but keeps their text', () => {
    expect(sanitizeHtml('<div><span style="color:red">x</span></div>')).toBe('x')
    expect(sanitizeHtml('<p><font color="red">x</font></p>')).toBe('<p>x</p>')
  })

  it('opens external links in a new tab with rel, and leaves internal ones alone', () => {
    expect(sanitizeHtml('<a href="https://pokernews.com/x">x</a>')).toBe(
      '<a href="https://pokernews.com/x" target="_blank" rel="noopener noreferrer">x</a>',
    )
    expect(sanitizeHtml('<a href="/about">x</a>')).toBe('<a href="/about">x</a>')
    expect(sanitizeHtml('<a href="mailto:a@b.c">x</a>')).toBe('<a href="mailto:a@b.c">x</a>')
    expect(sanitizeHtml('<a href="//evil.example/x">x</a>')).toBe('<a>x</a>')
  })

  it('allows images from the media folder only, never data: or external URLs', () => {
    expect(sanitizeHtml('<img src="data:image/png;base64,AAAA" alt="x" />')).toBe('<img alt="x" />')
    // The site's CSP (img-src 'self') would block an external image on the live
    // page while it looked fine in the editor, so it is dropped here instead.
    expect(sanitizeHtml('<img src="https://cdn.example/a.jpg" alt="" />')).toBe('<img alt="" />')
    expect(sanitizeHtml('<img src="/media/../secret" alt="" />')).toBe('<img alt="" />')
  })

  it('keeps style only when it is a text-align rule, and numbers only in size attributes', () => {
    expect(sanitizeHtml('<p style="text-align: center;">x</p>')).toBe(
      '<p style="text-align: center;">x</p>',
    )
    expect(sanitizeHtml('<p style="text-align:center;color:red">x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<img src="/media/a1.webp" alt="" width="12px" height="7" />')).toBe(
      '<img src="/media/a1.webp" alt="" height="7" />',
    )
  })

  it('balances malformed markup and escapes text', () => {
    expect(sanitizeHtml('<p>hello <strong>there')).toBe('<p>hello <strong>there</strong></p>')
    expect(sanitizeHtml('</div><p>x</p></p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('a < b > c & d')).toBe('a &lt; b &gt; c &amp; d')
    expect(sanitizeHtml('<p>&amp; &nbsp; &#169;</p>')).toBe('<p>&amp; &nbsp; &#169;</p>')
    // Attributes come out in allowlist order, whatever order they went in.
    expect(sanitizeHtml('<img alt="a &quot;b&quot; <c>" src="/media/a1.webp">')).toBe(
      '<img src="/media/a1.webp" alt="a &quot;b&quot; &lt;c&gt;" />',
    )
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
  })
})
