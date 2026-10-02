// Contract: the upload gate judges a file by its bytes, not its name or
// declared type, and refuses PDFs and SVGs that carry active content.
import { describe, it, expect } from 'vitest'
import { checkUpload, MAX_UPLOAD_BYTES } from '../lib/uploadCheck.js'

const make = (bytes, name = 'file.bin', type = '') =>
  new File([bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(bytes)], name, {
    type,
  })

describe('checkUpload', () => {
  it('accepts a real PDF, PNG, JPEG, GIF and WebP whatever they are called', async () => {
    const webp = new Uint8Array(16)
    webp.set([0x52, 0x49, 0x46, 0x46], 0)
    webp.set([0x57, 0x45, 0x42, 0x50], 8)
    for (const file of [
      make('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj', 'schedule.exe'),
      make(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'poster'),
      make(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'banner.jpg', 'text/plain'),
      make(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), 'logo.gif'),
      make(webp, 'logo.webp'),
    ]) {
      expect(await checkUpload(file), file.name).toBeNull()
    }
  })

  it('accepts a plain SVG', async () => {
    const svg = '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
    expect(await checkUpload(make(svg, 'logo.svg', 'image/svg+xml'))).toBeNull()
  })

  it('refuses a file whose bytes are not a PDF or an image, even when named like one', async () => {
    expect(
      await checkUpload(make('MZ\u0090\u0000 this is a program', 'poster.png', 'image/png')),
    ).toBe('type')
    expect(await checkUpload(make('<html><body>hi</body></html>', 'schedule.pdf'))).toBe('type')
    expect(await checkUpload(make('', 'empty.pdf'))).toBe('type')
  })

  it('refuses a PDF with JavaScript, a launch action or an embedded file', async () => {
    for (const marker of ['/JavaScript', '/JS', '/Launch', '/OpenAction', '/EmbeddedFile']) {
      const pdf = `%PDF-1.7\n1 0 obj << ${marker} (x) >> endobj`
      expect(await checkUpload(make(pdf, 'schedule.pdf')), marker).toBe('unsafe')
    }
  })

  it('refuses an SVG with a script or an event handler', async () => {
    for (const body of [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"/></svg>',
    ]) {
      expect(await checkUpload(make(body, 'logo.svg')), body).toBe('unsafe')
    }
  })

  it('refuses a file over the size cap before reading it', async () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'huge.pdf')
    expect(await checkUpload(big)).toBe('size')
  })
})
