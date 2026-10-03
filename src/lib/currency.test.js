import { describe, expect, it } from 'vitest'
import { roughAud } from './currency.js'

const rates = { KRW: 936, PHP: 43.5, VND: 18046 }

describe('roughAud', () => {
  it('converts a guarantee to AUD shorthand', () => {
    expect(roughAud('5B KRW', rates)).toBe('$5.3m')
    expect(roughAud('126.3M PHP', rates)).toBe('$2.9m')
    expect(roughAud('160B VND', rates)).toBe('$8.9m')
    expect(roughAud('643.8M KRW', rates)).toBe('$690k')
    expect(roughAud('936M KRW', rates)).toBe('$1m')
  })

  it('gives up on an amount or currency it does not know', () => {
    expect(roughAud('5B XYZ', rates)).toBeNull()
    expect(roughAud('TBA', rates)).toBeNull()
  })
})
