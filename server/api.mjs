// POST /api/enquiry: where the contact and venue forms send their submission.
//
// The record, and any files sent with it, are saved to the store, where the
// admin dashboard's Enquiries section reads them. Nothing is emailed yet: an
// email server can be hooked in here later, after the save, and flip the
// record's `emailed` flag with store.updateEnquiry. Mounted by
// server/index.mjs and the dev server.
//
// The browser posts multipart/form-data (a FormData body, with the venue
// form's PDF and image uploads in it), so this parses that and urlencoded
// bodies itself; no dependencies. An upload is kept only when its first bytes
// say it is a PDF or a PNG, JPEG, GIF or WebP image; anything else keeps just
// its name.

import { sniff } from './media.mjs'

const MAX_BODY = 48 * 1024 * 1024 // the form allows 10 MB a file
const MAX_FILE = 10 * 1024 * 1024 // the form's own cap

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error('too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** What an upload really is, by its bytes: { ext, type } or null. */
function attachmentType(data) {
  if (!data.length || data.length > MAX_FILE) return null
  if (data.toString('latin1', 0, 5) === '%PDF-') return { ext: 'pdf', type: 'application/pdf' }
  const hit = sniff(data)
  return hit?.kind === 'image' ? { ext: hit.ext, type: hit.type } : null
}

/** Text fields of a multipart body, plus the files in it. */
function parseMultipart(body, boundary) {
  const fields = {}
  const files = []
  const text = body.toString('latin1')
  for (const part of text.split(`--${boundary}`)) {
    const split = part.indexOf('\r\n\r\n')
    if (split === -1) continue
    const head = part.slice(0, split)
    const name = head.match(/name="([^"]*)"/)?.[1]
    if (!name) continue
    const filename = head.match(/filename="([^"]*)"/)?.[1]
    if (filename !== undefined) {
      if (!filename) continue
      const data = Buffer.from(part.slice(split + 4).replace(/\r\n$/, ''), 'latin1')
      const kind = attachmentType(data)
      files.push({
        name: Buffer.from(filename, 'latin1').toString('utf8'),
        field: name,
        ...(kind && { ...kind, data }),
      })
      continue
    }
    const value = part.slice(split + 4).replace(/\r\n$/, '')
    fields[name] = Buffer.from(value, 'latin1').toString('utf8')
  }
  return { fields, files }
}

function parseBody(req, body) {
  const type = req.headers['content-type'] || ''
  const boundary = type.match(/boundary=([^;]+)/)?.[1]
  if (type.startsWith('multipart/form-data') && boundary) return parseMultipart(body, boundary)
  if (type.startsWith('application/json')) {
    const json = JSON.parse(body.toString('utf8'))
    return {
      fields: Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v ?? '')])),
      files: [],
    }
  }
  return { fields: Object.fromEntries(new URLSearchParams(body.toString('utf8'))), files: [] }
}

function json(res, code, value) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(value))
}

/**
 * @param {object} options
 * @param {ReturnType<typeof import('./store.mjs').createStore>} options.store
 * @returns {(req, res) => boolean} true when the request was for the API and has been answered
 */
export function createApiHandler({ store }) {
  return function handleApi(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname
    if (pathname !== '/api/enquiry') return false
    if (req.method !== 'POST') {
      res.writeHead(405, { Allow: 'POST' })
      res.end('Method Not Allowed')
      return true
    }
    readBody(req).then(
      (body) => {
        let fields, files
        try {
          ;({ fields, files } = parseBody(req, body))
        } catch {
          return json(res, 400, { error: 'bad-body' })
        }
        // The honeypot. Real visitors never see the field; bots fill it.
        if (fields._gotcha) return json(res, 200, { ok: true })
        const form = fields.form === 'venue' ? 'venue' : 'contact'
        const record = store.addEnquiry({ form, fields, files, page: req.headers.referer || '' })
        if (!record) return json(res, 400, { error: 'empty' })
        json(res, 200, { ok: true, id: record.id })
      },
      () => json(res, 413, { error: 'too-large' }),
    )
    return true
  }
}
