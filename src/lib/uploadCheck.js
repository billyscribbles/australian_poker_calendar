// Client-side gate for the listing form's uploads.
//
// The site is static and the files go straight from the browser to Formspree,
// so nothing here can run a real virus scan. What it can do is refuse the
// easy cases before they leave the browser: a file that is not really a PDF or
// an image whatever its name says, a PDF carrying JavaScript or launch
// actions, an SVG carrying a script, and anything over the size cap. Whoever
// opens the attachments in the inbox still relies on their own scanner.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

// Known file signatures: the bytes at offset 0 (and, for WebP, at 8).
const SIGNATURES = [
  { kind: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { kind: 'image', bytes: [0x89, 0x50, 0x4e, 0x47] }, // PNG
  { kind: 'image', bytes: [0xff, 0xd8, 0xff] }, // JPEG
  { kind: 'image', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { kind: 'image', bytes: [0x52, 0x49, 0x46, 0x46], at8: [0x57, 0x45, 0x42, 0x50] }, // RIFF…WEBP
]

// PDF features that have no place in a tournament schedule.
const PDF_ACTIVE = /\/(JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile|RichMedia)\b/
// Script vectors in an SVG.
const SVG_ACTIVE = /<script|\bon[a-z]+\s*=|javascript:|<foreignObject|<iframe|<embed|<object/i

const matches = (view, sig) =>
  sig.bytes.every((b, i) => view[i] === b) &&
  (!sig.at8 || sig.at8.every((b, i) => view[8 + i] === b))

function sniff(view) {
  const hit = SIGNATURES.find((sig) => matches(view, sig))
  if (hit) return hit.kind
  const head = new TextDecoder().decode(view.subarray(0, 512)).trimStart()
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) {
    return 'svg'
  }
  return null
}

/**
 * Check one File. Resolves to null when it may be sent, or to the key of the
 * reason it may not: 'size' | 'type' | 'unsafe'.
 */
export async function checkUpload(file) {
  if (file.size > MAX_UPLOAD_BYTES) return 'size'
  const buffer = await file.arrayBuffer()
  const view = new Uint8Array(buffer)
  const kind = sniff(view)
  if (!kind) return 'type'
  if (kind === 'image') return null
  // PDF and SVG are text enough to grep. Latin-1 keeps every byte as one
  // character, so offsets and the markers are unaffected by the encoding.
  const text = new TextDecoder('latin1').decode(view)
  if (kind === 'pdf' && PDF_ACTIVE.test(text)) return 'unsafe'
  if (kind === 'svg' && SVG_ACTIVE.test(text)) return 'unsafe'
  return null
}
