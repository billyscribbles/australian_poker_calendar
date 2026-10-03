const SUFFIX = { K: 1e3, M: 1e6, B: 1e9 }

/**
 * A rough AUD figure for an advertised guarantee such as "5B KRW" or
 * "126.3M PHP", in shorthand: "$5.3m", "$690k". `rates` is units of each
 * currency per 1 AUD. Returns null when the amount or currency is not
 * understood, so the caller just shows the local figure.
 * @param {string} prize
 * @param {Record<string, number>} rates
 * @returns {string | null}
 */
export function roughAud(prize, rates) {
  const match = /^([\d.,]+)\s*([KMB])?\s+([A-Z]{3})$/i.exec(prize.trim())
  if (!match) return null
  const rate = rates[match[3].toUpperCase()]
  if (!rate) return null
  const aud = (Number(match[1].replace(/,/g, '')) * (SUFFIX[match[2]?.toUpperCase()] ?? 1)) / rate
  if (!Number.isFinite(aud) || aud <= 0) return null
  if (aud >= 1e6) return `$${Number((aud / 1e6).toFixed(1))}m`
  const k = aud / 1e3
  return `$${k >= 100 ? Math.round(k / 10) * 10 : Math.max(1, Math.round(k))}k`
}
