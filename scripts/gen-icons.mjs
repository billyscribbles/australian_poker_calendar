// One-off, per client: build the favicon set from a single master image.
//
// WHY THIS EXISTS. The template used to ship one favicon.svg. Modern browsers
// take an SVG happily, so it looks finished — but Google's favicon fetcher wants
// a real .ico at a predictable path, iOS wants an apple-touch-icon, and Android
// wants a manifest with 192/512 PNGs. Without them a site shows a blank globe
// next to its own name in search results, which onraistudio.com did for weeks
// before anyone traced it. Every site built from this template inherited the
// same gap.
//
// NOT part of `yarn build`. Icons change once, when the logo lands, so
// this runs on demand and the output is committed. That keeps the deploy build
// free of image tooling — Railway never needs a rasteriser.
//
//   1. Export the logo as a SQUARE PNG, at least 512x512, with the padding you
//      want baked in, to public/brand/icon-master.png
//   2. yarn icons
//
// Pure Node: zlib is the only thing a PNG needs, and an .ico is a container
// holding PNGs. No dependency, so nothing to install or keep patched.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync, deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const BRAND = join(root, 'public', 'brand')
const MASTER = join(BRAND, 'icon-master.png')

function fail(message) {
  console.error(`[gen-icons] ${message}`)
  process.exit(1)
}

// --- PNG decode --------------------------------------------------------------
// 8-bit truecolour (RGB/RGBA), non-interlaced — what every export tool produces.
// Anything else fails loudly rather than writing a corrupt icon.
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) fail('icon-master.png is not a PNG.')
  let pos = 8
  let width = 0
  let height = 0
  let channels = 0
  const idat = []

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      const depth = data[8]
      const colorType = data[9]
      if (depth !== 8) fail(`icon-master.png is ${depth}-bit; export it as 8-bit.`)
      if (colorType === 2) channels = 3
      else if (colorType === 6) channels = 4
      else fail('icon-master.png must be RGB or RGBA (not palette or greyscale).')
      if (data[12] !== 0) fail('icon-master.png is interlaced; re-export without interlacing.')
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') break
    pos += 12 + len
  }

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(width * height * 4)

  // Undo the per-scanline filter. Each row is prefixed with its filter type and
  // is predicted from the pixel to its left (a) and the row above (b/c).
  const line = Buffer.alloc(stride)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)]
    raw.copy(line, 0, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? line[i - channels] : 0
      const b = prev[i]
      const c = i >= channels ? prev[i - channels] : 0
      let v = line[i]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      line[i] = v & 0xff
    }
    for (let x = 0; x < width; x += 1) {
      const s = x * channels
      const d = (y * width + x) * 4
      out[d] = line[s]
      out[d + 1] = line[s + 1]
      out[d + 2] = line[s + 2]
      out[d + 3] = channels === 4 ? line[s + 3] : 255
    }
    prev = Buffer.from(line)
  }
  return { width, height, data: out }
}

// --- PNG encode --------------------------------------------------------------
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i]
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng({ width, height, data }) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filter: none — these are tiny, so size is moot
    data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Box-filter downscale: average every source pixel falling inside a destination
// pixel. Slower than nearest-neighbour and far cleaner on the 16px favicon,
// where nearest-neighbour turns fine strokes into noise.
function resize(src, size) {
  const out = Buffer.alloc(size * size * 4)
  const ratio = src.width / size
  for (let y = 0; y < size; y += 1) {
    const y0 = Math.floor(y * ratio)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * ratio))
    for (let x = 0; x < size; x += 1) {
      const x0 = Math.floor(x * ratio)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * ratio))
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        n = 0
      for (let sy = y0; sy < y1 && sy < src.height; sy += 1) {
        for (let sx = x0; sx < x1 && sx < src.width; sx += 1) {
          const i = (sy * src.width + sx) * 4
          const alpha = src.data[i + 3]
          // Weight colour by alpha so transparent edges don't drag in black.
          r += src.data[i] * alpha
          g += src.data[i + 1] * alpha
          b += src.data[i + 2] * alpha
          a += alpha
          n += 1
        }
      }
      const d = (y * size + x) * 4
      if (a > 0) {
        out[d] = Math.round(r / a)
        out[d + 1] = Math.round(g / a)
        out[d + 2] = Math.round(b / a)
      }
      out[d + 3] = Math.round(a / Math.max(n, 1))
    }
  }
  return { width: size, height: size, data: out }
}

// --- ICO ---------------------------------------------------------------------
// An .ico is a directory of images; since Vista each entry may be a whole PNG,
// which is how a single file carries 16/32/48 without three bitmap encodings.
function encodeIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + pngs.length * 16
  const entries = []
  for (const { size, png } of pngs) {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size
    e[1] = size >= 256 ? 0 : size
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    entries.push(e)
    offset += png.length
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.png)])
}

// --- run ---------------------------------------------------------------------
if (!existsSync(MASTER)) {
  fail(
    `no ${MASTER}.\n` +
      '  Export the logo as a SQUARE PNG, at least 512x512, with the padding\n' +
      '  you want baked in, then run `yarn icons` again.',
  )
}

const master = decodePng(readFileSync(MASTER))
if (master.width !== master.height) {
  fail(`icon-master.png is ${master.width}x${master.height}. It has to be square.`)
}
if (master.width < 512) {
  fail(`icon-master.png is ${master.width}px. Use at least 512px or the 512 icon is upscaled.`)
}

const write = (name, buf) => {
  writeFileSync(join(BRAND, name), buf)
  console.log(`[gen-icons] public/brand/${name.padEnd(22)} ${(buf.length / 1024).toFixed(1)} kB`)
}

write('apple-touch-icon.png', encodePng(resize(master, 180)))
write('icon-192.png', encodePng(resize(master, 192)))
write('icon-512.png', encodePng(resize(master, 512)))
write(
  'favicon.ico',
  encodeIco([16, 32, 48].map((size) => ({ size, png: encodePng(resize(master, size)) }))),
)

// The manifest Android reads for "add to home screen". name/short_name come from
// site.config so they cannot drift from the brand.
const siteSrc = readFileSync(join(root, 'src', 'config', 'site.config.js'), 'utf8')
const brandName = siteSrc.match(/name:\s*'([^']+)'/)?.[1] ?? 'Site'
// The browser-UI colour, taken from index.html so the manifest and the
// <meta name="theme-color"> tag can never disagree.
const indexSrc = readFileSync(join(root, 'index.html'), 'utf8')
const themeColor = indexSrc.match(/name="theme-color"\s+content="([^"]+)"/)?.[1]
const manifest = {
  name: brandName,
  short_name: brandName.split(' ')[0],
  icons: [
    { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
  display: 'standalone',
  start_url: '/',
  ...(themeColor ? { theme_color: themeColor } : {}),
}
writeFileSync(join(root, 'public', 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log('[gen-icons] public/site.webmanifest')
console.log('[gen-icons] done — commit these, they only change when the logo does.')
